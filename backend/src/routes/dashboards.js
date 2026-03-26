const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);

// GET /api/dashboards
router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT d.*, u.name as created_by_name,
       (SELECT COUNT(*) FROM widgets w WHERE w.dashboard_id = d.id) as widget_count
     FROM dashboards d
     LEFT JOIN users u ON u.id = d.created_by
     ORDER BY d.updated_at DESC`
  );
  res.json(result.rows);
});

// GET /api/dashboards/:id  — includes widgets
router.get('/:id', async (req, res) => {
  const dashResult = await db.query('SELECT * FROM dashboards WHERE id = $1', [req.params.id]);
  if (!dashResult.rows[0]) return res.status(404).json({ error: 'Dashboard not found' });

  const widgetResult = await db.query(
    `SELECT w.*, q.name as query_name, q.sql_text
     FROM widgets w
     LEFT JOIN queries q ON q.id = w.query_id
     WHERE w.dashboard_id = $1
     ORDER BY w.created_at ASC`,
    [req.params.id]
  );

  res.json({ ...dashResult.rows[0], widgets: widgetResult.rows });
});

// POST /api/dashboards
router.post('/', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await db.query(
      `INSERT INTO dashboards (name, description, created_by) VALUES ($1, $2, $3) RETURNING *`,
      [name, description || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create dashboard' });
  }
});

// PUT /api/dashboards/:id
router.put('/:id', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, description, layout } = req.body;
    const result = await db.query(
      `UPDATE dashboards SET name=$1, description=$2, layout=$3, updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [name, description, JSON.stringify(layout || []), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Dashboard not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update dashboard' });
  }
});

// DELETE /api/dashboards/:id
router.delete('/:id', requireRole('admin', 'editor'), async (req, res) => {
  await db.query('DELETE FROM dashboards WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// POST /api/dashboards/:id/widgets
router.post('/:id/widgets', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { query_id, title, chart_type, chart_config, position } = req.body;
    if (!query_id) return res.status(400).json({ error: 'query_id is required' });

    const result = await db.query(
      `INSERT INTO widgets (dashboard_id, query_id, title, chart_type, chart_config, position)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.params.id, query_id, title || null, chart_type || 'table',
       JSON.stringify(chart_config || {}), JSON.stringify(position || {})]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add widget' });
  }
});

// PUT /api/dashboards/:id/widgets/:widgetId
router.put('/:id/widgets/:widgetId', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { title, chart_type, chart_config, position } = req.body;
    const result = await db.query(
      `UPDATE widgets SET title=$1, chart_type=$2, chart_config=$3, position=$4
       WHERE id=$5 AND dashboard_id=$6 RETURNING *`,
      [title, chart_type, JSON.stringify(chart_config || {}), JSON.stringify(position || {}),
       req.params.widgetId, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Widget not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update widget' });
  }
});

// DELETE /api/dashboards/:id/widgets/:widgetId
router.delete('/:id/widgets/:widgetId', requireRole('admin', 'editor'), async (req, res) => {
  await db.query('DELETE FROM widgets WHERE id = $1 AND dashboard_id = $2', [req.params.widgetId, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
