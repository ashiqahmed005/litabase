const db = require('../db');

async function findAll() {
  const { rows } = await db.query(
    `SELECT id, name, type, host, port, database_name, username, ssl_enabled, created_at
     FROM connections ORDER BY created_at DESC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM connections WHERE id = $1', [id]);
  return rows[0] ?? null;
}

async function create({ name, type, host, port, database_name, username, passwordEncrypted, ssl_enabled, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO connections (name, type, host, port, database_name, username, password_encrypted, ssl_enabled, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, type, host, port, database_name, username, ssl_enabled, created_at`,
    [name, type, host ?? null, port ?? null, database_name ?? null, username ?? null,
     passwordEncrypted, ssl_enabled ?? false, createdBy]
  );
  return rows[0];
}

async function update(id, { name, type, host, port, database_name, username, passwordEncrypted, ssl_enabled }) {
  const { rows } = await db.query(
    `UPDATE connections
     SET name=$1, type=$2, host=$3, port=$4, database_name=$5,
         username=$6, password_encrypted=$7, ssl_enabled=$8, updated_at=NOW()
     WHERE id=$9
     RETURNING id, name, type, host, port, database_name, username, ssl_enabled`,
    [name, type, host, port, database_name, username, passwordEncrypted, ssl_enabled, id]
  );
  return rows[0] ?? null;
}

async function remove(id) {
  await db.query('DELETE FROM connections WHERE id = $1', [id]);
}

module.exports = { findAll, findById, create, update, remove };
