const db = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');

const openCashRegister = asyncHandler(async (req, res) => {
  const { opening_amount: openingAmount } = req.body;
  const parsed = Number(openingAmount);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppError('opening_amount deve ser numero >= 0.', 400);
  }

  const existing = await db.query('SELECT id FROM cash_register WHERE date = CURDATE() LIMIT 1', []);
  if (existing[0]) {
    throw new AppError('Caixa do dia ja aberto.', 409);
  }

  const result = await db.query(
    'INSERT INTO cash_register (date, opening_amount, current_cash_amount) VALUES (CURDATE(), ?, ?)',
    [parsed, parsed]
  );

  const created = await db.query('SELECT * FROM cash_register WHERE id = ?', [result.insertId]);
  res.status(201).json(created[0]);
});

const todayCashSummary = asyncHandler(async (_req, res) => {
  const cashRows = await db.query(
    'SELECT * FROM cash_register WHERE date = CURDATE() LIMIT 1',
    []
  );

  if (!cashRows[0]) {
    return res.json({
      opened: false,
      message: 'Caixa do dia ainda nao foi aberto.'
    });
  }

  const cash = cashRows[0];

  const paymentRows = await db.query(
    `SELECT
      COALESCE(SUM(CASE WHEN payment_method_id = 1 THEN amount ELSE 0 END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_method_id = 2 THEN amount ELSE 0 END), 0) AS pix_total,
      COALESCE(SUM(CASE WHEN payment_method_id IN (3,4) THEN amount ELSE 0 END), 0) AS card_total,
      COALESCE(SUM(amount), 0) AS total_day
     FROM payments
     WHERE DATE(created_at) = CURDATE()`,
    []
  );

  const payment = paymentRows[0];

  res.json({
    opened: true,
    cash_register: cash,
    summary: {
      opening_amount: Number(cash.opening_amount),
      cash_received: Number(payment.cash_total),
      expected_cash_now: Number(cash.current_cash_amount),
      pix_received: Number(payment.pix_total),
      card_received: Number(payment.card_total),
      total_day: Number(payment.total_day)
    }
  });
});

module.exports = {
  openCashRegister,
  todayCashSummary
};
