const cron         = require('node-cron');
const scheduleRepo = require('../repositories/scheduleRepository');
const { runQuery } = require('./queryRunner');
const { sendReport, resultsToCsv } = require('./emailer');

// scheduleId (string) → node-cron Task
const activeTasks = new Map();

async function loadAndStartAll() {
  const schedules = await scheduleRepo.findAllActive();
  for (const schedule of schedules) {
    startSchedule(schedule);
  }
  console.log(`Scheduler: loaded ${schedules.length} active schedule(s).`);
}

function startSchedule(schedule) {
  // Stop any existing task for this schedule before replacing it
  stopSchedule(schedule.id);

  if (!cron.validate(schedule.cron_expression)) {
    console.warn(`Scheduler: invalid cron expression for schedule "${schedule.id}": ${schedule.cron_expression}`);
    return;
  }

  const task = cron.schedule(schedule.cron_expression, () => runSchedule(schedule));
  activeTasks.set(schedule.id, task);
}

function stopSchedule(scheduleId) {
  const task = activeTasks.get(scheduleId);
  if (task) {
    task.stop();
    activeTasks.delete(scheduleId);
  }
}

async function runSchedule(schedule) {
  console.log(`Scheduler: running "${schedule.name}"`);
  try {
    const widgets = await scheduleRepo.findWidgetsForDashboard(schedule.dashboard_id);

    let htmlBody = `<h2>${escapeHtml(schedule.dashboard_name || 'Dashboard Report')}</h2>`;
    const csvParts = [];

    for (const widget of widgets) {
      const label = widget.title || widget.query_name;
      try {
        const result = await runQuery(widget, widget.sql_text);
        htmlBody  += buildHtmlTable(label, result);
        csvParts.push(`# ${label}`, resultsToCsv(result.columns, result.rows), '');
      } catch (err) {
        htmlBody += `<p><strong>Error</strong> in &ldquo;${escapeHtml(label)}&rdquo;: ${escapeHtml(err.message)}</p>`;
      }
    }

    await sendReport({
      to:      schedule.recipients,
      subject: `Report: ${schedule.name}`,
      html:    `<html><body style="font-family:sans-serif;color:#333">${htmlBody}</body></html>`,
      csvAttachment: {
        filename: `${schedule.name.replace(/\s+/g, '_')}.csv`,
        content:  csvParts.join('\n'),
      },
    });

    await scheduleRepo.markLastRun(schedule.id);
    console.log(`Scheduler: "${schedule.name}" completed.`);
  } catch (err) {
    console.error(`Scheduler: "${schedule.name}" failed —`, err.message);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtmlTable(title, result) {
  const th = result.columns
    .map(c => `<th style="padding:6px;border:1px solid #ddd;background:#f0f0f0">${escapeHtml(c)}</th>`)
    .join('');
  const tbody = result.rows.slice(0, 500)
    .map(row =>
      `<tr>${row.map(cell => `<td style="padding:6px;border:1px solid #ddd">${escapeHtml(cell)}</td>`).join('')}</tr>`
    )
    .join('');

  return `
    <h3>${escapeHtml(title)}</h3>
    <table style="border-collapse:collapse;margin-bottom:24px">
      <thead><tr>${th}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>`;
}

module.exports = { loadAndStartAll, startSchedule, stopSchedule, runSchedule };
