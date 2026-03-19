const fs = require('fs/promises');
const path = require('path');

const db = require('../config/db');

const schemaPath = path.resolve(__dirname, '../../../database/001_init.sql');
const PAYING_PLAYERS_ALTER =
  'ALTER TABLE games ADD COLUMN IF NOT EXISTS paying_players_count INT NOT NULL DEFAULT 1 AFTER total_game_value';
const CUSTOMER_PAYING_FLAG_ALTER =
  'ALTER TABLE game_customers ADD COLUMN IF NOT EXISTS is_paying_player TINYINT(1) NOT NULL DEFAULT 0 AFTER name';

function splitSqlStatements(sqlText) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;

  for (let i = 0; i < sqlText.length; i += 1) {
    const char = sqlText[i];
    const prev = i > 0 ? sqlText[i - 1] : '';

    if (char === "'" && !inDoubleQuote && !inBacktick && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (char === '"' && !inSingleQuote && !inBacktick && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === '`' && !inSingleQuote && !inDoubleQuote && prev !== '\\') {
      inBacktick = !inBacktick;
    }

    if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
    } else {
      current += char;
    }
  }

  const pending = current.trim();
  if (pending) {
    statements.push(pending);
  }

  return statements;
}

function sanitizeStatement(statement) {
  const trimmed = statement.trim();
  if (!trimmed) return '';
  if (/^CREATE\s+DATABASE\b/i.test(trimmed)) return '';
  if (/^USE\s+/i.test(trimmed)) return '';
  if (trimmed.replace(/\s+/g, ' ').toUpperCase() === PAYING_PLAYERS_ALTER.toUpperCase()) return '';
  if (trimmed.replace(/\s+/g, ' ').toUpperCase() === CUSTOMER_PAYING_FLAG_ALTER.toUpperCase()) return '';
  return trimmed;
}

async function ensurePayingPlayersColumn() {
  const [row] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'games'
       AND COLUMN_NAME = 'paying_players_count'`
  );

  if (Number(row?.total || 0) === 0) {
    await db.query(
      'ALTER TABLE games ADD COLUMN paying_players_count INT NOT NULL DEFAULT 1 AFTER total_game_value'
    );
  }
}

async function ensureCustomerPayingFlagColumn() {
  const [row] = await db.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'game_customers'
       AND COLUMN_NAME = 'is_paying_player'`
  );

  if (Number(row?.total || 0) === 0) {
    await db.query(
      'ALTER TABLE game_customers ADD COLUMN is_paying_player TINYINT(1) NOT NULL DEFAULT 0 AFTER name'
    );
  }
}

async function ensureSchema() {
  const sqlText = await fs.readFile(schemaPath, 'utf8');
  const normalizedSql = sqlText
    .replace(/\r/g, '')
    .replace(/^\s*--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  const statements = splitSqlStatements(normalizedSql)
    .map(sanitizeStatement)
    .filter(Boolean);

  for (const statement of statements) {
    await db.query(statement);
  }

  await ensurePayingPlayersColumn();
  await ensureCustomerPayingFlagColumn();
}

module.exports = {
  ensureSchema
};
