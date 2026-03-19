const db = require('../config/db');
const { asyncHandler } = require('../utils/errors');

const indicatorsByGame = asyncHandler(async (req, res) => {
  const gameId = Number(req.params.gameId);

  const gameRows = await db.query(
    `SELECT
      g.id,
      g.name,
      g.total_game_value,
      COALESCE((SELECT SUM(amount) FROM payments p WHERE p.game_id = g.id AND p.account_type_id = 1), 0) AS game_paid,
      COALESCE((SELECT SUM(total_price) FROM customer_items ci WHERE ci.game_id = g.id), 0) AS copa_revenue,
      COALESCE((SELECT SUM(amount) FROM payments p WHERE p.game_id = g.id AND p.account_type_id = 2), 0) AS copa_paid
     FROM games g
     WHERE g.id = ?
     LIMIT 1`,
    [gameId]
  );

  if (!gameRows[0]) {
    return res.status(404).json({ message: 'Jogo nao encontrado.' });
  }

  const g = gameRows[0];
  const totalGameValue = Number(g.total_game_value);
  const gamePaid = Number(g.game_paid);
  const copaRevenue = Number(g.copa_revenue);

  res.json({
    game_id: g.id,
    game_name: g.name,
    game_total_value: totalGameValue,
    game_paid: gamePaid,
    game_pending: Math.max(0, Number((totalGameValue - gamePaid).toFixed(2))),
    copa_revenue: copaRevenue,
    total_general: Number((totalGameValue + copaRevenue).toFixed(2)),
    detail: {
      receita_jogo: totalGameValue,
      receita_copa: copaRevenue
    }
  });
});

const monthlyIndicators = asyncHandler(async (req, res) => {
  const today = new Date();
  const month = Number(req.query.month || (today.getMonth() + 1));
  const year = Number(req.query.year || today.getFullYear());

  const rows = await db.query(
    `SELECT
      COALESCE(SUM(amount), 0) AS total,
      COALESCE(SUM(CASE WHEN account_type_id = 2 THEN amount ELSE 0 END), 0) AS total_copa,
      COALESCE(SUM(CASE WHEN account_type_id = 1 THEN amount ELSE 0 END), 0) AS total_games,
      COALESCE(SUM(CASE WHEN payment_method_id = 1 THEN amount ELSE 0 END), 0) AS total_cash,
      COALESCE(SUM(CASE WHEN payment_method_id = 2 THEN amount ELSE 0 END), 0) AS total_pix,
      COALESCE(SUM(CASE WHEN payment_method_id = 3 THEN amount ELSE 0 END), 0) AS total_debit,
      COALESCE(SUM(CASE WHEN payment_method_id = 4 THEN amount ELSE 0 END), 0) AS total_credit
     FROM payments
     WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?`,
    [month, year]
  );

  const r = rows[0];

  res.json({
    month,
    year,
    total_raised: Number(r.total),
    total_copa: Number(r.total_copa),
    total_games: Number(r.total_games),
    by_payment_method: {
      cash: Number(r.total_cash),
      pix: Number(r.total_pix),
      debit: Number(r.total_debit),
      credit: Number(r.total_credit)
    }
  });
});

const stockIndicators = asyncHandler(async (_req, res) => {
  const topProducts = await db.query(
    `SELECT
      p.id,
      p.name,
      SUM(ci.quantity) AS total_quantity,
      SUM(ci.total_price) AS revenue,
      SUM((ci.unit_price - p.cost_price) * ci.quantity) AS profit
     FROM customer_items ci
     JOIN products p ON p.id = ci.product_id
     GROUP BY p.id, p.name
     ORDER BY total_quantity DESC
     LIMIT 10`
  );

  const belowMin = await db.query(
    `SELECT id, name, stock_quantity, min_quantity
     FROM products
     WHERE stock_quantity < min_quantity
     ORDER BY (min_quantity - stock_quantity) DESC`
  );

  res.json({
    top_10_products: topProducts.map((p) => ({
      ...p,
      total_quantity: Number(p.total_quantity),
      revenue: Number(p.revenue || 0),
      profit: Number(p.profit || 0)
    })),
    below_minimum: belowMin
  });
});

const commissionReport = asyncHandler(async (req, res) => {
  const today = new Date();
  const month = Number(req.query.month || (today.getMonth() + 1));
  const year = Number(req.query.year || today.getFullYear());

  const rows = await db.query(
    `SELECT
      u.id,
      u.name,
      COALESCE((
        SELECT SUM(ci.total_price)
        FROM customer_items ci
        WHERE ci.created_by = u.id
          AND MONTH(ci.created_at) = ?
          AND YEAR(ci.created_at) = ?
      ), 0) AS copa_sold,
      COALESCE((
        SELECT SUM(g.total_game_value)
        FROM games g
        WHERE g.created_by = u.id
          AND MONTH(g.date) = ?
          AND YEAR(g.date) = ?
      ), 0) AS games_value
     FROM users u
     ORDER BY u.name`,
    [month, year, month, year]
  );

  const data = rows.map((r) => {
    const copaSold = Number(r.copa_sold);
    const gamesValue = Number(r.games_value);
    const commissionCopa = Number((copaSold * 0.10).toFixed(2));
    const commissionGames = Number((gamesValue * 0.30).toFixed(2));

    return {
      user_id: r.id,
      user_name: r.name,
      total_sold_copa: copaSold,
      total_games_value: gamesValue,
      commission_detail: {
        copa_10_percent: commissionCopa,
        games_30_percent: commissionGames
      },
      final_commission: Number((commissionCopa + commissionGames).toFixed(2))
    };
  });

  res.json({ month, year, data });
});

module.exports = {
  indicatorsByGame,
  monthlyIndicators,
  stockIndicators,
  commissionReport
};
