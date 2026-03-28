const connRepo = require('../repositories/connectionRepository');
const { encrypt } = require('../services/crypto');
const { runQuery } = require('../services/queryRunner');
const { ValidationError, NotFoundError } = require('../errors/AppError');

async function list(req, res) {
  res.json(await connRepo.findAll());
}

async function create(req, res) {
  const { name, type, host, port, database_name, username, password, ssl_enabled } = req.body;
  if (!name || !type) throw new ValidationError('name and type are required');

  const passwordEncrypted = password ? encrypt(password) : null;
  const connection = await connRepo.create({
    name, type, host, port, database_name, username, passwordEncrypted, ssl_enabled,
    createdBy: req.user.id,
  });
  res.status(201).json(connection);
}

async function test(req, res) {
  const conn = await connRepo.findById(req.params.id);
  if (!conn) throw new NotFoundError('Connection not found');

  await runQuery(conn, 'SELECT 1 AS test');
  res.json({ success: true, message: 'Connection successful' });
}

async function update(req, res) {
  const existing = await connRepo.findById(req.params.id);
  if (!existing) throw new NotFoundError('Connection not found');

  const { name, type, host, port, database_name, username, password, ssl_enabled } = req.body;
  // Only re-encrypt if a new password was provided; otherwise keep the existing ciphertext.
  const passwordEncrypted = password ? encrypt(password) : existing.password_encrypted;

  const connection = await connRepo.update(req.params.id, {
    name, type, host, port, database_name, username, passwordEncrypted, ssl_enabled,
  });
  res.json(connection);
}

async function remove(req, res) {
  const existing = await connRepo.findById(req.params.id);
  if (!existing) throw new NotFoundError('Connection not found');

  await connRepo.remove(req.params.id);
  res.json({ success: true });
}

module.exports = { list, create, test, update, remove };
