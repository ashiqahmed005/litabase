const router = require('express').Router();
const db = require('../db');
const { encrypt, decrypt } = require('../services/crypto');
const { authenticate, requireRole } = require('../middleware/auth');

// All connection routes require auth
router.use(authenticate);

// GET /api/connections
router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT id, name, type, host, port, database_name, username, ssl_enabled, created_at
     FROM connections ORDER BY created_at DESC`
  );
  res.json(result.rows);
});

// POST /api/connections
router.post('/', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, type, host, port, database_name, username, password, ssl_enabled } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'name and type are required' });

    const passwordEncrypted = password ? encrypt(password) : null;
    const result = await db.query(
      `INSERT INTO connections (name, type, host, port, database_name, username, password_encrypted, ssl_enabled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, type, host, port, database_name, username, ssl_enabled, created_at`,
      [name, type, host || null, port || null, database_name || null, username || null, passwordEncrypted, ssl_enabled || false, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

// POST /api/connections/:id/test
router.post('/:id/test', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM connections WHERE id = $1', [req.params.id]);
    const conn = result.rows[0];
    if (!conn) return res.status(404).json({ error: 'Connection not found' });

    const { runQuery } = require('../services/queryRunner');
    const testSql = conn.type === 'sqlite' ? 'SELECT 1 AS test' : 'SELECT 1 AS test';
    await runQuery(conn, testSql);
    res.json({ success: true, message: 'Connection successful' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/connections/:id
router.put('/:id', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, type, host, port, database_name, username, password, ssl_enabled } = req.body;
    const existing = await db.query('SELECT * FROM connections WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Connection not found' });

    const passwordEncrypted = password ? encrypt(password) : existing.rows[0].password_encrypted;
    const result = await db.query(
      `UPDATE connections SET name=$1, type=$2, host=$3, port=$4, database_name=$5,
       username=$6, password_encrypted=$7, ssl_enabled=$8, updated_at=NOW()
       WHERE id=$9
       RETURNING id, name, type, host, port, database_name, username, ssl_enabled`,
      [name, type, host, port, database_name, username, passwordEncrypted, ssl_enabled, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update connection' });
  }
});

// DELETE /api/connections/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  await db.query('DELETE FROM connections WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
