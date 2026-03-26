const router = require('express').Router();
const db = require('../db');
const { runQuery } = require('../services/queryRunner');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /api/queries
router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT q.*, c.name as connection_name, u.name as created_by_name
     FROM queries q
     LEFT JOIN connections c ON c.id = q.connection_id
     LEFT JOIN users u ON u.id = q.created_by
     ORDER BY q.updated_at DESC`
  );
  res.json(result.rows);
});

// GET /api/queries/:id
router.get('/:id', async (req, res) => {
  const result = await db.query(
    `SELECT q.*, c.name as connection_name
     FROM queries q
     LEFT JOIN connections c ON c.id = q.connection_id
     WHERE q.id = $1`,
    [req.params.id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Query not found' });
  res.json(result.rows[0]);
});

// POST /api/queries/run  — ad-hoc execution (not saved)
router.post('/run', async (req, res) => {
  const { connection_id, sql } = req.body;
  if (!connection_id || !sql) return res.status(400).json({ error: 'connection_id and sql are required' });

  try {
    const connResult = await db.query('SELECT * FROM connections WHERE id = $1', [connection_id]);
    if (!connResult.rows[0]) return res.status(404).json({ error: 'Connection not found' });

    const startTime = Date.now();
    const result = await runQuery(connResult.rows[0], sql);
    result.executionMs = Date.now() - startTime;
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/queries  — save a query
router.post('/', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, description, sql_text, connection_id } = req.body;
    if (!name || !sql_text || !connection_id) {
      return res.status(400).json({ error: 'name, sql_text, and connection_id are required' });
    }
    const result = await db.query(
      `INSERT INTO queries (name, description, sql_text, connection_id, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || null, sql_text, connection_id, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save query' });
  }
});

// PUT /api/queries/:id
router.put('/:id', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, description, sql_text, connection_id } = req.body;
    const result = await db.query(
      `UPDATE queries SET name=$1, description=$2, sql_text=$3, connection_id=$4, updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [name, description, sql_text, connection_id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Query not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update query' });
  }
});

// DELETE /api/queries/:id
router.delete('/:id', requireRole('admin', 'editor'), async (req, res) => {
  await db.query('DELETE FROM queries WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// POST /api/queries/:id/run  — run a saved query
router.post('/:id/run', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT q.*, c.* FROM queries q JOIN connections c ON c.id = q.connection_id WHERE q.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Query not found' });

    const row = result.rows[0];
    const conn = {
      type: row.type,
      host: row.host,
      port: row.port,
      database_name: row.database_name,
      username: row.username,
      password_encrypted: row.password_encrypted,
      ssl_enabled: row.ssl_enabled,
    };

    const startTime = Date.now();
    const queryResult = await runQuery(conn, row.sql_text);
    queryResult.executionMs = Date.now() - startTime;
    res.json(queryResult);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
