const cron = require('node-cron');
const db = require('../db');
const { runQuery } = require('./queryRunner');
const { sendReport, resultsToCsv } = require('./emailer');

// Map of scheduleId -> cron task
const activeTasks = new Map();

async function loadAndStartAll() {
  const result = await db.query(
    `SELECT s.*, d.name as dashboard_name
     FROM schedules s
     JOIN dashboards d ON d.id = s.dashboard_id
     WHERE s.is_active = true`
  );
  for (const schedule of result.rows) {
    startSchedule(schedule);
  }
  console.log(`Scheduler: loaded ${result.rows.length} active schedules.`);
}

function startSchedule(schedule) {
  if (activeTasks.has(schedule.id)) {
    activeTasks.get(schedule.id).stop();
  }

  if (!cron.validate(schedule.cron_expression)) {
    console.warn(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expression}`);
    return;
  }

  const task = cron.schedule(schedule.cron_expression, async () => {
    await runSchedule(schedule);
  });

  activeTasks.set(schedule.id, task);
}

function stopSchedule(scheduleId) {
  if (activeTasks.has(scheduleId)) {
    activeTasks.get(scheduleId).stop();
    activeTasks.delete(scheduleId);
  }
}

async function runSchedule(schedule) {
  console.log(`Running schedule: ${schedule.name}`);
  try {
    // Get all widgets for this dashboard
    const widgetsResult = await db.query(
      `SELECT w.*, q.sql_text, q.name as query_name, c.*
       FROM widgets w
       JOIN queries q ON q.id = w.query_id
       JOIN connections c ON c.id = q.connection_id
       WHERE w.dashboard_id = $1`,
      [schedule.dashboard_id]
    );

    let htmlSections = `<h2>${schedule.dashboard_name || 'Dashboard Report'}</h2>`;
    const csvParts = [];

    for (const widget of widgetsResult.rows) {
      try {
        const result = await runQuery(widget, widget.sql_text);
        htmlSections += buildHtmlTable(widget.title || widget.query_name, result);
        csvParts.push(`# ${widget.title || widget.query_name}`);
        csvParts.push(resultsToCsv(result.columns, result.rows));
        csvParts.push('');
      } catch (err) {
        htmlSections += `<p>Error running "${widget.title}": ${err.message}</p>`;
      }
    }

    await sendReport({
      to: schedule.recipients,
      subject: `Report: ${schedule.name}`,
      html: `<html><body style="font-family:sans-serif">${htmlSections}</body></html>`,
      csvAttachment: {
        filename: `${schedule.name.replace(/\s+/g, '_')}.csv`,
        content: csvParts.join('\n'),
      },
    });

    await db.query('UPDATE schedules SET last_run_at = NOW() WHERE id = $1', [schedule.id]);
    console.log(`Schedule ${schedule.name} completed.`);
  } catch (err) {
    console.error(`Schedule ${schedule.name} failed:`, err.message);
  }
}

function buildHtmlTable(title, result) {
  const headers = result.columns.map(c => `<th style="padding:6px;border:1px solid #ddd">${c}</th>`).join('');
  const rows = result.rows.slice(0, 500).map(row =>
    `<tr>${row.map(cell => `<td style="padding:6px;border:1px solid #ddd">${cell ?? ''}</td>`).join('')}</tr>`
  ).join('');
  return `
    <h3>${title}</h3>
    <table style="border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#f0f0f0">${headers}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

module.exports = { loadAndStartAll, startSchedule, stopSchedule, runSchedule };
