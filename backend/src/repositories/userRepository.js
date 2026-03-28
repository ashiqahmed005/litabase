const db = require('../db');

async function findByEmail(email) {
  const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] ?? null;
}

async function findById(id) {
  const { rows } = await db.query(
    'SELECT id, name, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
}

async function countAll() {
  const { rows } = await db.query('SELECT COUNT(*) FROM users');
  return parseInt(rows[0].count, 10);
}

async function create({ name, email, passwordHash, role }) {
  const { rows } = await db.query(
    'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
    [name, email, passwordHash, role]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, countAll, create };
