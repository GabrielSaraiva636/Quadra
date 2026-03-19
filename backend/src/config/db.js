const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool(env.db);

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = {
  pool,
  query
};
