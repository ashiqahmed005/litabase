const cron = require('node-cron');
const scheduleRepo = require('../repositories/scheduleRepository');
const scheduler    = require('../services/scheduler');
const { ValidationError, NotFoundError } = require('../errors/AppError');

async function list(req, res) {
  res.json(await scheduleRepo.findAll());
}

async function create(req, res) {
  const { name, dashboard_id, cron_expression, recipients, format } = req.body;
  if (!name || !dashboard_id || !cron_expression || !recipients?.length) {
    throw new ValidationError('name, dashboard_id, cron_expression, and recipients are required');
  }
  if (!cron.validate(cron_expression)) throw new ValidationError('Invalid cron expression');

  const schedule = await scheduleRepo.create({
    name, dashboard_id, cron_expression, recipients, format, createdBy: req.user.id,
  });
  scheduler.startSchedule(schedule);
  res.status(201).json(schedule);
}

async function update(req, res) {
  const { name, cron_expression, recipients, format, is_active } = req.body;
  if (cron_expression && !cron.validate(cron_expression)) throw new ValidationError('Invalid cron expression');

  const schedule = await scheduleRepo.update(req.params.id, { name, cron_expression, recipients, format, is_active });
  if (!schedule) throw new NotFoundError('Schedule not found');

  schedule.is_active ? scheduler.startSchedule(schedule) : scheduler.stopSchedule(schedule.id);
  res.json(schedule);
}

async function remove(req, res) {
  scheduler.stopSchedule(req.params.id);
  await scheduleRepo.remove(req.params.id);
  res.json({ success: true });
}

async function run(req, res) {
  const schedule = await scheduleRepo.findById(req.params.id);
  if (!schedule) throw new NotFoundError('Schedule not found');

  scheduler.runSchedule(schedule); // fire-and-forget — don't await
  res.json({ success: true, message: 'Schedule triggered' });
}

module.exports = { list, create, update, remove, run };
