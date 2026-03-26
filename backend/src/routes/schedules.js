const router = require('express').Router();
const cron = require('node-cron');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const scheduler = require('../services/scheduler');

router.use(authenticate);

// GET /api/schedules
router.get('/', async (req, res) => {
  const result = await db.query(
    `SELECT s.*, d.name as dashboard_name, u.name as created_by_name
     FROM schedules s
     LEFT JOIN dashboards d ON d.id = s.dashboard_id
     LEFT JOIN users u ON u.id = s.created_by
     ORDER BY s.created_at DESC`
  );
  res.json(result.rows);
});

// POST /api/schedules
router.post('/', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, dashboard_id, cron_expression, recipients, format } = req.body;
    if (!name || !dashboard_id || !cron_expression || !recipients?.length) {
      return res.status(400).json({ error: 'name, dashboard_id, cron_expression, and recipients are required' });
    }
    if (!cron.validate(cron_expression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const result = await db.query(
      `INSERT INTO schedules (name, dashboard_id, cron_expression, recipients, format, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, dashboard_id, cron_expression, recipients, format || 'email', req.user.id]
    );

    const schedule = result.rows[0];
    scheduler.startSchedule(schedule);
    res.status(201).json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

// PUT /api/schedules/:id
router.put('/:id', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const { name, cron_expression, recipients, format, is_active } = req.body;
    if (cron_expression && !cron.validate(cron_expression)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const result = await db.query(
      `UPDATE schedules SET name=$1, cron_expression=$2, recipients=$3, format=$4, is_active=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [name, cron_expression, recipients, format, is_active, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Schedule not found' });

    const schedule = result.rows[0];
    if (schedule.is_active) {
      scheduler.startSchedule(schedule);
    } else {
      scheduler.stopSchedule(schedule.id);
    }

    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id', requireRole('admin'), async (req, res) => {
  scheduler.stopSchedule(req.params.id);
  await db.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// POST /api/schedules/:id/run  — manual trigger
router.post('/:id/run', requireRole('admin', 'editor'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, d.name as dashboard_name FROM schedules s JOIN dashboards d ON d.id = s.dashboard_id WHERE s.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Schedule not found' });

    scheduler.runSchedule(result.rows[0]); // async, fire and forget
    res.json({ success: true, message: 'Schedule triggered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger schedule' });
  }
});

module.exports = router;
