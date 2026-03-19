const db = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');
const { calculateCustomerDebt, calculatePlayerShare, toMoney } = require('../utils/billing');

async function getGamePending(conn, gameId) {
  const [rows] = await conn.query(
    `SELECT
      g.total_game_value,
      g.paying_players_count,
      COALESCE((
        SELECT SUM(amount)
        FROM payments p
        WHERE p.game_id = g.id AND p.account_type_id = 1
      ), 0) AS direct_paid
     FROM games g
     WHERE g.id = ?
     LIMIT 1`,
    [gameId]
  );

  if (!rows[0]) {
    throw new AppError('Jogo nao encontrado.', 404);
  }

  const total = Number(rows[0].total_game_value);
  const valuePerPlayer = calculatePlayerShare(total, Number(rows[0].paying_players_count || 1));

  const [payerRows] = await conn.query(
    `SELECT
      gc.id AS customer_id,
      COALESCE(SUM(p.amount), 0) AS total_paid
     FROM game_customers gc
     LEFT JOIN payments p
       ON p.game_id = gc.game_id
      AND p.customer_id = gc.id
      AND p.account_type_id = 2
     WHERE gc.game_id = ?
       AND gc.is_paying_player = 1
     GROUP BY gc.id`,
    [gameId]
  );

  const payersSharePaid = toMoney(
    payerRows.reduce((acc, row) => acc + Math.min(Number(row.total_paid || 0), valuePerPlayer), 0)
  );

  const paid = toMoney(Math.min(total, Number(rows[0].direct_paid || 0) + payersSharePaid));
  return Math.max(0, Number((total - paid).toFixed(2)));
}

async function getCustomerPending(conn, gameId, customerId) {
  const [rows] = await conn.query(
    `SELECT
      gc.id,
      gc.is_paying_player,
      g.total_game_value,
      g.paying_players_count,
      COALESCE(SUM(ci.total_price), 0) AS total_consumed,
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.game_id = gc.game_id AND p.customer_id = gc.id AND p.account_type_id = 2
      ), 0) AS paid
     FROM game_customers gc
     JOIN games g ON g.id = gc.game_id
     LEFT JOIN customer_items ci ON ci.game_id = gc.game_id AND ci.customer_id = gc.id
     WHERE gc.game_id = ? AND gc.id = ?
     GROUP BY gc.id, gc.is_paying_player, g.total_game_value, g.paying_players_count`,
    [gameId, customerId]
  );

  if (!rows[0]) {
    throw new AppError('Cliente nao encontrado para este jogo.', 404);
  }

  const debt = calculateCustomerDebt({
    totalConsumed: Number(rows[0].total_consumed),
    totalPaid: Number(rows[0].paid),
    totalGameValue: Number(rows[0].total_game_value),
    payingPlayersCount: Number(rows[0].paying_players_count || 1),
    isPayingPlayer: Number(rows[0].is_paying_player) === 1
  });

  return debt.pending;
}

async function ensureCashOpenAndAdd(conn, paymentMethodId, amount) {
  if (Number(paymentMethodId) !== 1) {
    return;
  }

  const [rows] = await conn.query(
    'SELECT id, current_cash_amount FROM cash_register WHERE date = CURDATE() LIMIT 1 FOR UPDATE'
  );

  if (!rows[0]) {
    throw new AppError('Caixa do dia nao aberto. Abra o caixa antes de receber em dinheiro.', 409);
  }

  const cash = rows[0];
  const nextValue = Number(cash.current_cash_amount) + Number(amount);
  await conn.query('UPDATE cash_register SET current_cash_amount = ? WHERE id = ?', [nextValue, cash.id]);
}

const registerPayment = asyncHandler(async (req, res) => {
  const {
    game_id: gameId,
    customer_id: customerId,
    account_type_id: accountTypeId,
    amount,
    payment_method_id: paymentMethodId
  } = req.body;

  if (!gameId || !accountTypeId || amount == null || !paymentMethodId) {
    throw new AppError('Campos obrigatorios: game_id, account_type_id, amount, payment_method_id.', 400);
  }

  const parsedAmount = Number(amount);
  if (parsedAmount <= 0) {
    throw new AppError('Valor de pagamento deve ser maior que zero.', 400);
  }

  const at = Number(accountTypeId);
  if (![1, 2].includes(at)) {
    throw new AppError('account_type_id invalido.', 400);
  }

  if (at === 2 && !customerId) {
    throw new AppError('Pagamento individual exige customer_id.', 400);
  }

  const conn = await db.pool.getConnection();

  try {
    await conn.beginTransaction();

    let pending;

    if (at === 1) {
      pending = await getGamePending(conn, Number(gameId));
    } else {
      pending = await getCustomerPending(conn, Number(gameId), Number(customerId));
    }

    if (pending <= 0) {
      throw new AppError('Conta ja esta quitada.', 409);
    }

    if (parsedAmount - pending > 0.009) {
      throw new AppError(`Valor excede o saldo pendente (${pending.toFixed(2)}).`, 409);
    }

    await ensureCashOpenAndAdd(conn, Number(paymentMethodId), parsedAmount);

    const [insertResult] = await conn.query(
      `INSERT INTO payments
        (game_id, customer_id, account_type_id, amount, payment_method_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Number(gameId),
        at === 2 ? Number(customerId) : null,
        at,
        parsedAmount,
        Number(paymentMethodId),
        req.user.id
      ]
    );

    if (at === 2) {
      const nextPending = await getCustomerPending(conn, Number(gameId), Number(customerId));
      const nextStatus = nextPending <= 0.009 ? 1 : 2;

      await conn.query(
        'UPDATE customer_items SET payment_status_id = ? WHERE game_id = ? AND customer_id = ?',
        [nextStatus, Number(gameId), Number(customerId)]
      );
    }

    await conn.commit();

    const [createdRows] = await conn.query('SELECT * FROM payments WHERE id = ?', [insertResult.insertId]);
    res.status(201).json(createdRows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const listPayments = asyncHandler(async (req, res) => {
  const { game_id: gameId } = req.query;

  const where = [];
  const params = [];

  if (gameId) {
    where.push('p.game_id = ?');
    params.push(Number(gameId));
  }

  const rows = await db.query(
    `SELECT
      p.*,
      pm.description AS payment_method,
      at.description AS account_type,
      u.name AS created_by_name,
      gc.name AS customer_name
     FROM payments p
     JOIN payment_methods pm ON pm.id = p.payment_method_id
     JOIN account_type at ON at.id = p.account_type_id
     JOIN users u ON u.id = p.created_by
     LEFT JOIN game_customers gc ON gc.id = p.customer_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY p.created_at DESC
     LIMIT 1000`,
    params
  );

  res.json(rows);
});

module.exports = {
  registerPayment,
  listPayments
};
