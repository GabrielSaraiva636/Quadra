const db = require('../config/db');
const { calcDurationHours } = require('../utils/date');
const { AppError, asyncHandler } = require('../utils/errors');
const { calculatePlayerShare, calculateCustomerDebt, toMoney } = require('../utils/billing');

const STATUS = {
  OPEN: 1,
  CLOSED: 2,
  CANCELED: 3,
  NOT_STARTED: 4
};

function parsePayingPlayersCount(value, fallback = 1) {
  const parsed = value != null ? Number(value) : Number(fallback);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError('Quantidade de jogadores pagantes deve ser um inteiro maior que zero.', 400);
  }
  return parsed;
}

function sumPayersSharePaid(rows, valuePerPlayer) {
  return toMoney(
    rows.reduce((acc, row) => acc + Math.min(Number(row.total_paid || 0), Number(valuePerPlayer || 0)), 0)
  );
}

async function getPayersTotalsByGame(gameIds) {
  if (!gameIds.length) {
    return [];
  }

  const placeholders = gameIds.map(() => '?').join(', ');
  return db.query(
    `SELECT
      gc.game_id,
      gc.id AS customer_id,
      COALESCE(SUM(p.amount), 0) AS total_paid
     FROM game_customers gc
     LEFT JOIN payments p
       ON p.game_id = gc.game_id
      AND p.customer_id = gc.id
      AND p.account_type_id = 2
     WHERE gc.is_paying_player = 1
       AND gc.game_id IN (${placeholders})
     GROUP BY gc.game_id, gc.id`,
    gameIds
  );
}

async function ensureNoConflict({ date, startTime, endTime, gameId = null }) {
  const params = [date, STATUS.CANCELED, endTime, startTime];
  let sql = `
    SELECT id
    FROM games
    WHERE date = ?
      AND game_status_id <> ?
      AND NOT (? <= start_time OR ? >= end_time)
  `;

  if (gameId) {
    sql += ' AND id <> ?';
    params.push(gameId);
  }

  sql += ' LIMIT 1';

  const conflict = await db.query(sql, params);
  if (conflict[0]) {
    throw new AppError('Conflito de horario detectado.', 409);
  }
}

const listGames = asyncHandler(async (req, res) => {
  const { date, responsible } = req.query;
  const where = [];
  const params = [];

  if (date) {
    where.push('g.date = ?');
    params.push(date);
  }

  if (responsible) {
    where.push('g.responsible_name LIKE ?');
    params.push(`%${responsible}%`);
  }

  const sql = `
    SELECT
      g.*,
      gs.description AS status_description,
      COALESCE((
        SELECT SUM(amount)
        FROM payments p
        WHERE p.game_id = g.id AND p.account_type_id = 1
      ), 0) AS direct_game_paid
    FROM games g
    JOIN game_status gs ON gs.id = g.game_status_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY g.date DESC, g.start_time ASC
  `;

  const rows = await db.query(sql, params);
  const gameIds = rows.map((g) => Number(g.id));
  const payerRows = await getPayersTotalsByGame(gameIds);

  const payerRowsByGame = new Map();
  for (const row of payerRows) {
    const gameId = Number(row.game_id);
    if (!payerRowsByGame.has(gameId)) {
      payerRowsByGame.set(gameId, []);
    }
    payerRowsByGame.get(gameId).push(row);
  }

  const parsed = rows.map((g) => {
    const total = Number(g.total_game_value);
    const payingPlayersCount = Number(g.paying_players_count || 1);
    const valuePerPlayer = calculatePlayerShare(total, payingPlayersCount);
    const payersSharePaid = sumPayersSharePaid(payerRowsByGame.get(Number(g.id)) || [], valuePerPlayer);
    const paid = toMoney(Math.min(total, Number(g.direct_game_paid || 0) + payersSharePaid));
    return {
      ...g,
      total_game_value: total,
      total_game_paid: paid,
      total_game_pending: Math.max(0, Number((total - paid).toFixed(2))),
      paying_players_count: payingPlayersCount,
      value_per_player: valuePerPlayer
    };
  });

  res.json(parsed);
});

const createGame = asyncHandler(async (req, res) => {
  const {
    name,
    date,
    start_time: startTime,
    end_time: endTime,
    responsible_name: responsibleName,
    price_per_hour: pricePerHour,
    paying_players_count: payingPlayersCountRaw
  } = req.body;

  if (!name || !date || !startTime || !endTime || !responsibleName || pricePerHour == null) {
    throw new AppError('Campos obrigatorios: name, date, start_time, end_time, responsible_name, price_per_hour.', 400);
  }

  const durationHours = calcDurationHours(startTime, endTime);
  if (!durationHours) {
    throw new AppError('Hora fim deve ser maior que hora inicio.', 400);
  }

  await ensureNoConflict({ date, startTime, endTime });

  const totalGameValue = Number(pricePerHour) * durationHours;
  const payingPlayersCount = parsePayingPlayersCount(payingPlayersCountRaw, 1);
  const statusId = STATUS.NOT_STARTED;

  const result = await db.query(
    `INSERT INTO games
      (name, date, start_time, end_time, responsible_name, price_per_hour, total_game_value, paying_players_count, game_status_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      date,
      startTime,
      endTime,
      responsibleName,
      Number(pricePerHour),
      Number(totalGameValue.toFixed(2)),
      payingPlayersCount,
      statusId,
      req.user.id
    ]
  );

  const rows = await db.query(
    `SELECT g.*, gs.description AS status_description
     FROM games g
     JOIN game_status gs ON gs.id = g.game_status_id
     WHERE g.id = ?`,
    [result.insertId]
  );

  res.status(201).json(rows[0]);
});

const updateGame = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.id);
  const rows = await db.query('SELECT * FROM games WHERE id = ? LIMIT 1', [gameId]);
  if (!rows[0]) {
    throw new AppError('Jogo nao encontrado.', 404);
  }

  const current = rows[0];
  const name = req.body.name || current.name;
  const date = req.body.date || current.date;
  const startTime = req.body.start_time || current.start_time;
  const endTime = req.body.end_time || current.end_time;
  const responsibleName = req.body.responsible_name || current.responsible_name;
  const pricePerHour = req.body.price_per_hour != null ? Number(req.body.price_per_hour) : Number(current.price_per_hour);
  const gameStatusId = req.body.game_status_id != null ? Number(req.body.game_status_id) : Number(current.game_status_id);
  const payingPlayersCount = parsePayingPlayersCount(req.body.paying_players_count, current.paying_players_count || 1);

  const durationHours = calcDurationHours(startTime, endTime);
  if (!durationHours) {
    throw new AppError('Hora fim deve ser maior que hora inicio.', 400);
  }

  await ensureNoConflict({ date, startTime, endTime, gameId });

  const totalGameValue = Number((pricePerHour * durationHours).toFixed(2));

  await db.query(
    `UPDATE games
     SET name = ?, date = ?, start_time = ?, end_time = ?, responsible_name = ?,
         price_per_hour = ?, total_game_value = ?, paying_players_count = ?, game_status_id = ?
     WHERE id = ?`,
    [
      name,
      date,
      startTime,
      endTime,
      responsibleName,
      pricePerHour,
      totalGameValue,
      payingPlayersCount,
      gameStatusId,
      gameId
    ]
  );

  const updated = await db.query(
    `SELECT g.*, gs.description AS status_description
     FROM games g
     JOIN game_status gs ON gs.id = g.game_status_id
     WHERE g.id = ?`,
    [gameId]
  );

  res.json(updated[0]);
});

const deleteGame = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.id);
  const rows = await db.query('SELECT id FROM games WHERE id = ? LIMIT 1', [gameId]);

  if (!rows[0]) {
    throw new AppError('Jogo nao encontrado.', 404);
  }

  const paymentCount = await db.query(
    'SELECT COUNT(*) AS total FROM payments WHERE game_id = ?',
    [gameId]
  );

  if (Number(paymentCount[0].total) > 0) {
    throw new AppError('Nao pode excluir jogo com pagamentos vinculados. Finalize ou cancele o jogo.', 409);
  }

  await db.query('DELETE FROM games WHERE id = ?', [gameId]);
  res.json({ message: 'Jogo excluido com sucesso.' });
});

const gameOverview = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.id);

  const games = await db.query(
    `SELECT g.*, gs.description AS status_description
     FROM games g
     JOIN game_status gs ON gs.id = g.game_status_id
     WHERE g.id = ? LIMIT 1`,
    [gameId]
  );

  if (!games[0]) {
    throw new AppError('Jogo nao encontrado.', 404);
  }

  const game = games[0];

  const customers = await db.query(
    `SELECT
      gc.id,
      gc.name,
      gc.is_paying_player,
      COALESCE(SUM(ci.total_price), 0) AS total_consumed,
      COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.game_id = gc.game_id
          AND p.customer_id = gc.id
          AND p.account_type_id = 2
      ), 0) AS total_paid
     FROM game_customers gc
     LEFT JOIN customer_items ci ON ci.customer_id = gc.id
     WHERE gc.game_id = ?
     GROUP BY gc.id, gc.name, gc.is_paying_player
     ORDER BY gc.name`,
    [gameId]
  );

  const customersFormatted = customers.map((c) => {
    const isPayingPlayer = Number(c.is_paying_player) === 1;
    const debt = calculateCustomerDebt({
      totalConsumed: Number(c.total_consumed),
      totalPaid: Number(c.total_paid),
      totalGameValue: Number(game.total_game_value),
      payingPlayersCount: Number(game.paying_players_count || 1),
      isPayingPlayer
    });

    return {
      ...c,
      is_paying_player: isPayingPlayer ? 1 : 0,
      total_consumed: debt.totalConsumed,
      game_share: debt.gameShare,
      total_account: debt.totalAccount,
      total_paid: debt.totalPaid,
      pending: debt.pending
    };
  });

  const gamePayments = await db.query(
    'SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE game_id = ? AND account_type_id = 1',
    [gameId]
  );

  const totalGameValue = Number(game.total_game_value);
  const directGamePaid = Number(gamePayments[0].paid);
  const payingPlayersCount = Number(game.paying_players_count || 1);
  const valuePerPlayer = calculatePlayerShare(totalGameValue, payingPlayersCount);
  const payersSharePaid = sumPayersSharePaid(
    customersFormatted.filter((c) => Number(c.is_paying_player) === 1).map((c) => ({ total_paid: c.total_paid })),
    valuePerPlayer
  );
  const gamePaid = toMoney(Math.min(totalGameValue, directGamePaid + payersSharePaid));

  res.json({
    game: {
      ...game,
      total_game_value: totalGameValue,
      game_paid: gamePaid,
      game_pending: Math.max(0, Number((totalGameValue - gamePaid).toFixed(2))),
      paying_players_count: payingPlayersCount,
      value_per_player: valuePerPlayer
    },
    customers: customersFormatted
  });
});

const gamePayersDetails = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.id);

  const games = await db.query(
    'SELECT id, total_game_value, paying_players_count FROM games WHERE id = ? LIMIT 1',
    [gameId]
  );

  if (!games[0]) {
    throw new AppError('Jogo nao encontrado.', 404);
  }

  const game = games[0];
  const valuePerPlayer = calculatePlayerShare(Number(game.total_game_value), Number(game.paying_players_count || 1));

  const rows = await db.query(
    `SELECT
      gc.id,
      gc.name,
      gc.is_paying_player,
      COALESCE((
        SELECT SUM(amount)
        FROM payments p
        WHERE p.game_id = gc.game_id
          AND p.customer_id = gc.id
          AND p.account_type_id = 2
      ), 0) AS total_paid
     FROM game_customers gc
     WHERE gc.game_id = ?
     ORDER BY gc.name`,
    [gameId]
  );

  const customers = rows
    .map((row) => {
      const isPayingPlayer = Number(row.is_paying_player) === 1;
      const paid = toMoney(row.total_paid);
      const sharePaid = isPayingPlayer ? toMoney(Math.min(paid, valuePerPlayer)) : 0;
      const pending = isPayingPlayer ? toMoney(Math.max(0, valuePerPlayer - sharePaid)) : 0;
      const hasPaidShare = isPayingPlayer ? pending <= 0 : false;

      return {
        id: row.id,
        name: row.name,
        is_paying_player: isPayingPlayer ? 1 : 0,
        game_share: isPayingPlayer ? valuePerPlayer : 0,
        share_paid: sharePaid,
        total_paid: paid,
        pending_share: pending,
        has_paid_share: hasPaidShare
      };
    })
    .filter((row) => row.is_paying_player === 1);

  res.json({
    game: {
      id: gameId,
      total_game_value: Number(game.total_game_value),
      paying_players_count: Number(game.paying_players_count || 1),
      value_per_player: valuePerPlayer
    },
    customers
  });
});

module.exports = {
  listGames,
  createGame,
  updateGame,
  deleteGame,
  gameOverview,
  gamePayersDetails
};
