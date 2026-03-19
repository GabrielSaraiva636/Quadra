const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');
const { AppError, asyncHandler } = require('../utils/errors');

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    throw new AppError('Informe usuario/email e senha.', 400);
  }

  const rows = await db.query(
    `SELECT id, name, email, password_hash, role
     FROM users
     WHERE email = ? OR name = ?
     LIMIT 1`,
    [identifier, identifier]
  );

  if (!rows[0]) {
    throw new AppError('Credenciais invalidas.', 401);
  }

  const user = rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);

  if (!ok) {
    throw new AppError('Credenciais invalidas.', 401);
  }

  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

const me = asyncHandler(async (req, res) => {
  const rows = await db.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
    [req.user.id]
  );

  if (!rows[0]) {
    throw new AppError('Usuario nao encontrado.', 404);
  }

  res.json(rows[0]);
});

module.exports = {
  login,
  me
};
