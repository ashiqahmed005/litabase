const db = require('../db');

async function findAll() {
  const { rows } = await db.query(
    `SELECT d.*, u.name AS created_by_name,
       (SELECT COUNT(*) FROM widgets w WHERE w.dashboard_id = d.id) AS widget_count
     FROM dashboards d
     LEFT JOIN users u ON u.id = d.created_by
     ORDER BY d.updated_at DESC`
  );
  return rows;
}

async function findById(id) {
  const { rows } = await db.query('SELECT * FROM dashboards WHERE id = $1', [id]);
  return rows[0] ?? null;
}

/**
 * Fetches a dashboard with its widgets in a single round-trip pair (parallel queries).
 */
async function findWithWidgets(id) {
  const [dashResult, widgetResult] = await Promise.all([
    db.query('SELECT * FROM dashboards WHERE id = $1', [id]),
    db.query(
      `SELECT w.*, q.name AS query_name, q.sql_text
       FROM widgets w
       LEFT JOIN queries q ON q.id = w.query_id
       WHERE w.dashboard_id = $1
       ORDER BY w.created_at ASC`,
      [id]
    ),
  ]);

  if (!dashResult.rows[0]) return null;
  return { ...dashResult.rows[0], widgets: widgetResult.rows };
}

async function create({ name, description, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO dashboards (name, description, created_by) VALUES ($1, $2, $3) RETURNING *`,
    [name, description ?? null, createdBy]
  );
  return rows[0];
}

async function update(id, { name, description, layout }) {
  const { rows } = await db.query(
    `UPDATE dashboards SET name=$1, description=$2, layout=$3, updated_at=NOW()
     WHERE id=$4 RETURNING *`,
    [name, description, JSON.stringify(layout ?? []), id]
  );
  return rows[0] ?? null;
}

async function remove(id) {
  await db.query('DELETE FROM dashboards WHERE id = $1', [id]);
}

async function addWidget(dashboardId, { query_id, title, chart_type, chart_config, position }) {
  const { rows } = await db.query(
    `INSERT INTO widgets (dashboard_id, query_id, title, chart_type, chart_config, position)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [dashboardId, query_id, title ?? null, chart_type ?? 'table',
     JSON.stringify(chart_config ?? {}), JSON.stringify(position ?? {})]
  );
  return rows[0];
}

async function updateWidget(dashboardId, widgetId, { title, chart_type, chart_config, position }) {
  const { rows } = await db.query(
    `UPDATE widgets SET title=$1, chart_type=$2, chart_config=$3, position=$4
     WHERE id=$5 AND dashboard_id=$6 RETURNING *`,
    [title, chart_type, JSON.stringify(chart_config ?? {}), JSON.stringify(position ?? {}),
     widgetId, dashboardId]
  );
  return rows[0] ?? null;
}

async function removeWidget(dashboardId, widgetId) {
  await db.query('DELETE FROM widgets WHERE id = $1 AND dashboard_id = $2', [widgetId, dashboardId]);
}

module.exports = { findAll, findById, findWithWidgets, create, update, remove, addWidget, updateWidget, removeWidget };
