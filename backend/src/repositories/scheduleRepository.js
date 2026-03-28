const db = require('../db');

async function findAll() {
  const { rows } = await db.query(
    `SELECT s.*, d.name AS dashboard_name, u.name AS created_by_name
     FROM schedules s
     LEFT JOIN dashboards d ON d.id = s.dashboard_id
     LEFT JOIN users u ON u.id = s.created_by
     ORDER BY s.created_at DESC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query(
    `SELECT s.*, d.name AS dashboard_name
     FROM schedules s
     JOIN dashboards d ON d.id = s.dashboard_id
     WHERE s.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

async function findAllActive() {
  const { rows } = await db.query(
    `SELECT s.*, d.name AS dashboard_name
     FROM schedules s
     JOIN dashboards d ON d.id = s.dashboard_id
     WHERE s.is_active = true`
  );
  return rows;
}

/**
 * Returns all widgets for a dashboard, joined with their query SQL and connection details.
 * Used by the scheduler to execute each widget's query when sending a report.
 */
async function findWidgetsForDashboard(dashboardId) {
  const { rows } = await db.query(
    `SELECT w.*, q.sql_text, q.name AS query_name, c.*
     FROM widgets w
     JOIN queries q ON q.id = w.query_id
     JOIN connections c ON c.id = q.connection_id
     WHERE w.dashboard_id = $1`,
    [dashboardId]
  );
  return rows;
}

async function create({ name, dashboard_id, cron_expression, recipients, format, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO schedules (name, dashboard_id, cron_expression, recipients, format, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [name, dashboard_id, cron_expression, recipients, format ?? 'email', createdBy]
  );
  return rows[0];
}

async function update(id, { name, cron_expression, recipients, format, is_active }) {
  const { rows } = await db.query(
    `UPDATE schedules
     SET name=$1, cron_expression=$2, recipients=$3, format=$4, is_active=$5, updated_at=NOW()
     WHERE id=$6 RETURNING *`,
    [name, cron_expression, recipients, format, is_active, id]
  );
  return rows[0] ?? null;
}

async function remove(id) {
  await db.query('DELETE FROM schedules WHERE id = $1', [id]);
}

async function markLastRun(id) {
  await db.query('UPDATE schedules SET last_run_at = NOW() WHERE id = $1', [id]);
}

module.exports = { findAll, findById, findAllActive, findWidgetsForDashboard, create, update, remove, markLastRun };
