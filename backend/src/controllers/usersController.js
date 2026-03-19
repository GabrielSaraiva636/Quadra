const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');

const listUsers = asyncHandler(async (_req, res) => {
  const rows = await db.query(
    'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  );
  res.json(rows);
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    throw new AppError('Campos obrigatorios: name, email, password, role.', 400);
  }

  if (!['admin', 'atendente'].includes(role)) {
    throw new AppError('Role deve ser admin ou atendente.', 400);
  }

  const exists = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (exists[0]) {
    throw new AppError('Email ja cadastrado.', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name, email, passwordHash, role]
  );

  const created = await db.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [result.insertId]
  );

  res.status(201).json(created[0]);
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const { name, email, role, password } = req.body;

  const rows = await db.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
  if (!rows[0]) {
    throw new AppError('Usuario nao encontrado.', 404);
  }

  const current = rows[0];
  const nextName = name || current.name;
  const nextEmail = email || current.email;
  const nextRole = role || current.role;

  if (!['admin', 'atendente'].includes(nextRole)) {
    throw new AppError('Role deve ser admin ou atendente.', 400);
  }

  if (nextEmail !== current.email) {
    const exists = await db.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [nextEmail, userId]);
    if (exists[0]) {
      throw new AppError('Email ja cadastrado.', 409);
    }
  }

  let passwordHash = current.password_hash;
  if (password) {
    passwordHash = await bcrypt.hash(password, 10);
  }

  await db.query(
    `UPDATE users
     SET name = ?, email = ?, role = ?, password_hash = ?
     WHERE id = ?`,
    [nextName, nextEmail, nextRole, passwordHash, userId]
  );

  const updated = await db.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
    [userId]
  );

  res.json(updated[0]);
});

module.exports = {
  listUsers,
  createUser,
  updateUser
};
