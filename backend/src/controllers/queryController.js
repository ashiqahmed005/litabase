const queryRepo = require('../repositories/queryRepository');
const connRepo  = require('../repositories/connectionRepository');
const { runQuery } = require('../services/queryRunner');
const { ValidationError, NotFoundError } = require('../errors/AppError');

async function list(req, res) {
  res.json(await queryRepo.findAll());
}

async function findOne(req, res) {
  const query = await queryRepo.findById(req.params.id);
  if (!query) throw new NotFoundError('Query not found');
  res.json(query);
}

async function runAdHoc(req, res) {
  const { connection_id, sql } = req.body;
  if (!connection_id || !sql) throw new ValidationError('connection_id and sql are required');

  const conn = await connRepo.findById(connection_id);
  if (!conn) throw new NotFoundError('Connection not found');

  const start = Date.now();
  const result = await runQuery(conn, sql);
  res.json({ ...result, executionMs: Date.now() - start });
}

async function create(req, res) {
  const { name, description, sql_text, connection_id } = req.body;
  if (!name || !sql_text || !connection_id) {
    throw new ValidationError('name, sql_text, and connection_id are required');
  }

  const query = await queryRepo.create({ name, description, sql_text, connection_id, createdBy: req.user.id });
  res.status(201).json(query);
}

async function update(req, res) {
  const { name, description, sql_text, connection_id } = req.body;
  const query = await queryRepo.update(req.params.id, { name, description, sql_text, connection_id });
  if (!query) throw new NotFoundError('Query not found');
  res.json(query);
}

async function remove(req, res) {
  const existing = await queryRepo.findById(req.params.id);
  if (!existing) throw new NotFoundError('Query not found');
  await queryRepo.remove(req.params.id);
  res.json({ success: true });
}

async function runSaved(req, res) {
  const row = await queryRepo.findWithConnection(req.params.id);
  if (!row) throw new NotFoundError('Query not found');

  // Shape the connection object queryRunner expects
  const conn = {
    type: row.type, host: row.host, port: row.port,
    database_name: row.database_name, username: row.username,
    password_encrypted: row.password_encrypted, ssl_enabled: row.ssl_enabled,
  };

  const start = Date.now();
  const result = await runQuery(conn, row.sql_text);
  res.json({ ...result, executionMs: Date.now() - start });
}

module.exports = { list, findOne, runAdHoc, create, update, remove, runSaved };
