const db = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');
const { calculateCustomerDebt } = require('../utils/billing');

function parseOptionalPayingPlayer(value) {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value === 1 || value === '1' || String(value).toLowerCase() === 'true') {
    return 1;
  }

  if (value === 0 || value === '0' || String(value).toLowerCase() === 'false') {
    return 0;
  }

  throw new AppError('is_paying_player deve ser booleano.', 400);
}

async function ensureCashOpen(conn, paymentMethodId, amount) {
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
  const next = Number(cash.current_cash_amount) + Number(amount);
  await conn.query('UPDATE cash_register SET current_cash_amount = ? WHERE id = ?', [next, cash.id]);
}

async function getOrCreateCustomer(conn, gameId, customerId, customerName, isPayingPlayer) {
  if (customerId) {
    const [rows] = await conn.query(
      'SELECT id, name, is_paying_player FROM game_customers WHERE id = ? AND game_id = ? LIMIT 1',
      [Number(customerId), Number(gameId)]
    );

    if (!rows[0]) {
      throw new AppError('Cliente nao encontrado para este jogo.', 404);
    }

    if (isPayingPlayer != null && Number(rows[0].is_paying_player) !== Number(isPayingPlayer)) {
      await conn.query('UPDATE game_customers SET is_paying_player = ? WHERE id = ?', [
        Number(isPayingPlayer),
        Number(rows[0].id)
      ]);
      rows[0].is_paying_player = Number(isPayingPlayer);
    }

    return rows[0];
  }

  if (!customerName || !String(customerName).trim()) {
    throw new AppError('Informe customer_name ou customer_id.', 400);
  }

  const normalized = String(customerName).trim();

  const [existing] = await conn.query(
    'SELECT id, name, is_paying_player FROM game_customers WHERE game_id = ? AND LOWER(name) = LOWER(?) LIMIT 1',
    [Number(gameId), normalized]
  );

  if (existing[0]) {
    if (isPayingPlayer != null && Number(existing[0].is_paying_player) !== Number(isPayingPlayer)) {
      await conn.query('UPDATE game_customers SET is_paying_player = ? WHERE id = ?', [
        Number(isPayingPlayer),
        Number(existing[0].id)
      ]);
      existing[0].is_paying_player = Number(isPayingPlayer);
    }
    return existing[0];
  }

  const [insertResult] = await conn.query(
    'INSERT INTO game_customers (game_id, name, is_paying_player) VALUES (?, ?, ?)',
    [Number(gameId), normalized, Number(isPayingPlayer || 0)]
  );

  return {
    id: insertResult.insertId,
    name: normalized,
    is_paying_player: Number(isPayingPlayer || 0)
  };
}

const listGameCustomers = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.gameId);
  const { q } = req.query;
  const where = ['game_id = ?'];
  const params = [gameId];

  if (q) {
    where.push('name LIKE ?');
    params.push(`%${q}%`);
  }

  const rows = await db.query(
    `SELECT id, game_id, name, is_paying_player, created_at
     FROM game_customers
     WHERE ${where.join(' AND ')}
     ORDER BY name`,
    params
  );

  res.json(rows);
});

const createGameCustomer = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.gameId);
  const { name, is_paying_player: isPayingPlayerRaw } = req.body;

  if (!name || !String(name).trim()) {
    throw new AppError('Nome do cliente e obrigatorio.', 400);
  }

  const isPayingPlayer = parseOptionalPayingPlayer(isPayingPlayerRaw) || 0;

  const result = await db.query(
    'INSERT INTO game_customers (game_id, name, is_paying_player) VALUES (?, ?, ?)',
    [gameId, String(name).trim(), isPayingPlayer]
  );

  const created = await db.query('SELECT * FROM game_customers WHERE id = ?', [result.insertId]);
  res.status(201).json(created[0]);
});

const updateGameCustomer = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.gameId);
  const customerId = Number(req.params.customerId);
  const { is_paying_player: isPayingPlayerRaw } = req.body;

  if (isPayingPlayerRaw == null) {
    throw new AppError('Campo obrigatorio: is_paying_player.', 400);
  }

  const isPayingPlayer = parseOptionalPayingPlayer(isPayingPlayerRaw);

  const rows = await db.query(
    'SELECT id FROM game_customers WHERE id = ? AND game_id = ? LIMIT 1',
    [customerId, gameId]
  );

  if (!rows[0]) {
    throw new AppError('Cliente nao encontrado para este jogo.', 404);
  }

  await db.query(
    'UPDATE game_customers SET is_paying_player = ? WHERE id = ? AND game_id = ?',
    [isPayingPlayer, customerId, gameId]
  );

  const updated = await db.query(
    'SELECT id, game_id, name, is_paying_player, created_at FROM game_customers WHERE id = ? LIMIT 1',
    [customerId]
  );

  res.json(updated[0]);
});

const addCustomerItem = asyncHandler(async (req, res) => {
  const {
    game_id: gameId,
    customer_id: customerId,
    customer_name: customerName,
    is_paying_player: isPayingPlayerRaw,
    product_id: productId,
    quantity,
    is_paid: isPaid,
    payment_method_id: paymentMethodId
  } = req.body;

  if (!gameId || !productId || !quantity) {
    throw new AppError('Campos obrigatorios: game_id, product_id, quantity.', 400);
  }

  if (Number(quantity) <= 0) {
    throw new AppError('Quantidade deve ser maior que zero.', 400);
  }

  if (isPaid && !paymentMethodId) {
    throw new AppError('Informe payment_method_id quando is_paid=true.', 400);
  }

  const conn = await db.pool.getConnection();
  const isPayingPlayer = parseOptionalPayingPlayer(isPayingPlayerRaw);

  try {
    await conn.beginTransaction();

    const [games] = await conn.query('SELECT id FROM games WHERE id = ? LIMIT 1', [Number(gameId)]);
    if (!games[0]) {
      throw new AppError('Jogo nao encontrado.', 404);
    }

    const customer = await getOrCreateCustomer(conn, gameId, customerId, customerName, isPayingPlayer);

    const [products] = await conn.query(
      'SELECT * FROM products WHERE id = ? AND active = 1 LIMIT 1 FOR UPDATE',
      [Number(productId)]
    );

    if (!products[0]) {
      throw new AppError('Produto nao encontrado ou inativo.', 404);
    }

    const product = products[0];
    const qty = Number(quantity);

    if (qty > Number(product.stock_quantity)) {
      throw new AppError('Estoque insuficiente.', 409);
    }

    const unitPrice = Number(product.sale_price);
    const totalPrice = Number((unitPrice * qty).toFixed(2));
    const paymentStatusId = isPaid ? 1 : 2;

    const [itemResult] = await conn.query(
      `INSERT INTO customer_items
        (game_id, customer_id, product_id, quantity, unit_price, total_price, payment_status_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Number(gameId),
        customer.id,
        Number(productId),
        qty,
        unitPrice,
        totalPrice,
        paymentStatusId,
        req.user.id
      ]
    );

    const nextStock = Number(product.stock_quantity) - qty;
    await conn.query('UPDATE products SET stock_quantity = ? WHERE id = ?', [nextStock, Number(productId)]);
    await conn.query(
      `INSERT INTO stock_movements
        (product_id, stock_movements_type_id, quantity, created_by)
       VALUES (?, 2, ?, ?)`,
      [Number(productId), qty, req.user.id]
    );

    if (isPaid) {
      await ensureCashOpen(conn, paymentMethodId, totalPrice);

      await conn.query(
        `INSERT INTO payments
          (game_id, customer_id, account_type_id, amount, payment_method_id, created_by)
         VALUES (?, ?, 2, ?, ?, ?)`,
        [Number(gameId), customer.id, totalPrice, Number(paymentMethodId), req.user.id]
      );
    }

    await conn.commit();

    const [createdRows] = await conn.query('SELECT * FROM customer_items WHERE id = ?', [itemResult.insertId]);

    res.status(201).json({
      customer,
      item: createdRows[0]
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

const customerDetails = asyncHandler(async (req, res) => {
  const customerId = Number(req.params.customerId);

  const customers = await db.query(
    `SELECT
      gc.id,
      gc.name,
      gc.game_id,
      gc.is_paying_player,
      g.total_game_value,
      g.paying_players_count
     FROM game_customers gc
     JOIN games g ON g.id = gc.game_id
     WHERE gc.id = ?
     LIMIT 1`,
    [customerId]
  );

  if (!customers[0]) {
    throw new AppError('Cliente nao encontrado.', 404);
  }

  const customer = customers[0];

  const items = await db.query(
    `SELECT
      ci.id,
      ci.quantity,
      ci.unit_price,
      ci.total_price,
      ci.payment_status_id,
      ps.description AS payment_status,
      p.name AS product_name,
      ci.created_at
     FROM customer_items ci
     JOIN payment_status ps ON ps.id = ci.payment_status_id
     JOIN products p ON p.id = ci.product_id
     WHERE ci.customer_id = ?
     ORDER BY ci.created_at DESC`,
    [customerId]
  );

  const totals = await db.query(
    `SELECT
      COALESCE(SUM(total_price), 0) AS total_consumed,
      COALESCE((
        SELECT SUM(amount)
        FROM payments p
        WHERE p.customer_id = ? AND p.account_type_id = 2
      ), 0) AS total_paid
     FROM customer_items
     WHERE customer_id = ?`,
    [customerId, customerId]
  );

  const debt = calculateCustomerDebt({
    totalConsumed: Number(totals[0].total_consumed),
    totalPaid: Number(totals[0].total_paid),
    totalGameValue: Number(customer.total_game_value),
    payingPlayersCount: Number(customer.paying_players_count || 1),
    isPayingPlayer: Number(customer.is_paying_player) === 1
  });

  const payments = await db.query(
    `SELECT
      p.id,
      p.amount,
      p.account_type_id,
      at.description AS account_type,
      p.payment_method_id,
      pm.description AS payment_method,
      p.created_at,
      u.name AS created_by_name
     FROM payments p
     JOIN account_type at ON at.id = p.account_type_id
     JOIN payment_methods pm ON pm.id = p.payment_method_id
     JOIN users u ON u.id = p.created_by
     WHERE p.game_id = ?
       AND p.customer_id = ?
     ORDER BY p.created_at DESC`,
    [customer.game_id, customerId]
  );

  res.json({
    customer,
    items,
    payments,
    summary: {
      is_paying_player: Number(customer.is_paying_player) === 1 ? 1 : 0,
      total_consumed: debt.totalConsumed,
      game_share: debt.gameShare,
      total_account: debt.totalAccount,
      total_paid: debt.totalPaid,
      pending: debt.pending
    }
  });
});

module.exports = {
  listGameCustomers,
  createGameCustomer,
  updateGameCustomer,
  addCustomerItem,
  customerDetails
};
