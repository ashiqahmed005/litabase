const { decrypt } = require('./crypto');

/**
 * Runs a SQL query against a user-configured connection.
 * Supports: postgres, mysql, sqlite
 */
async function runQuery(connection, sqlText) {
  const { type } = connection;

  if (type === 'postgres') {
    return runPostgres(connection, sqlText);
  } else if (type === 'mysql') {
    return runMysql(connection, sqlText);
  } else if (type === 'sqlite') {
    return runSqlite(connection, sqlText);
  } else {
    throw new Error(`Unsupported connection type: ${type}`);
  }
}

async function runPostgres(connection, sqlText) {
  const { Client } = require('pg');
  const password = connection.password_encrypted ? decrypt(connection.password_encrypted) : '';
  const client = new Client({
    host: connection.host,
    port: connection.port || 5432,
    database: connection.database_name,
    user: connection.username,
    password,
    ssl: connection.ssl_enabled ? { rejectUnauthorized: false } : false,
    statement_timeout: 30000, // 30s timeout
  });

  await client.connect();
  try {
    const result = await client.query(sqlText);
    return formatResult(result.fields, result.rows);
  } finally {
    await client.end();
  }
}

async function runMysql(connection, sqlText) {
  const mysql = require('mysql2/promise');
  const password = connection.password_encrypted ? decrypt(connection.password_encrypted) : '';
  const conn = await mysql.createConnection({
    host: connection.host,
    port: connection.port || 3306,
    database: connection.database_name,
    user: connection.username,
    password,
    ssl: connection.ssl_enabled ? {} : undefined,
    connectTimeout: 10000,
  });

  try {
    const [rows, fields] = await conn.execute(sqlText);
    return formatResult(fields, rows);
  } finally {
    await conn.end();
  }
}

async function runSqlite(connection, sqlText) {
  const Database = require('better-sqlite3');
  // For SQLite, database_name is the file path
  const db = new Database(connection.database_name, { readonly: false, timeout: 30000 });
  try {
    const stmt = db.prepare(sqlText);
    const rows = stmt.all();
    const columns = rows.length > 0 ? Object.keys(rows[0]).map(name => ({ name })) : [];
    return formatResult(columns, rows);
  } finally {
    db.close();
  }
}

function formatResult(fields, rows) {
  const columns = fields.map(f => f.name || f);
  return {
    columns,
    rows: rows.map(row => {
      if (Array.isArray(row)) return row;
      return columns.map(col => row[col]);
    }),
    rowCount: rows.length,
  };
}

module.exports = { runQuery };
