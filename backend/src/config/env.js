const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || 'change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'society_user',
    password: process.env.DB_PASSWORD || 'society_pass',
    database: process.env.DB_NAME || 'society_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  }
};
