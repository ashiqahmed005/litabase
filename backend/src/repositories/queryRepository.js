const db = require('../db');

async function findAll() {
  const { rows } = await db.query(
    `SELECT q.*, c.name AS connection_name, u.name AS created_by_name
     FROM queries q
     LEFT JOIN connections c ON c.id = q.connection_id
     LEFT JOIN users u ON u.id = q.created_by
     ORDER BY q.updated_at DESC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT q.*, c.name AS connection_name
     FROM queries q
     LEFT JOIN connections c ON c.id = q.connection_id
     WHERE q.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

/**
 * Fetches a query joined with its full connection row (needed to execute the query).
 */
async function findWithConnection(id) {
  const { rows } = await db.query(
    `SELECT q.*, c.*
     FROM queries q
     JOIN connections c ON c.id = q.connection_id
     WHERE q.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function create({ name, description, sql_text, connection_id, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO queries (name, description, sql_text, connection_id, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, description ?? null, sql_text, connection_id, createdBy]
  );
  return rows[0];
}

async function update(id, { name, description, sql_text, connection_id }) {
  const { rows } = await db.query(
    `UPDATE queries
     SET name=$1, description=$2, sql_text=$3, connection_id=$4, updated_at=NOW()
     WHERE id=$5 RETURNING *`,
    [name, description, sql_text, connection_id, id]
  );
  return rows[0] ?? null;
}

async function remove(id) {
  await db.query('DELETE FROM queries WHERE id = $1', [id]);
}

module.exports = { findAll, findById, findWithConnection, create, update, remove };
