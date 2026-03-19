const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function ensureAdminUser() {
  const users = await db.query('SELECT id FROM users LIMIT 1');
  if (users.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);
  await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Administrador', 'admin@society.local', passwordHash, 'admin']
  );
}

module.exports = {
  ensureAdminUser
};
