const dashRepo = require('../repositories/dashboardRepository');
const { ValidationError, NotFoundError } = require('../errors/AppError');

async function list(req, res) {
  res.json(await dashRepo.findAll());
}

async function findOne(req, res) {
  const dashboard = await dashRepo.findWithWidgets(req.params.id);
  if (!dashboard) throw new NotFoundError('Dashboard not found');
  res.json(dashboard);
}

async function create(req, res) {
  const { name, description } = req.body;
  if (!name) throw new ValidationError('name is required');

  const dashboard = await dashRepo.create({ name, description, createdBy: req.user.id });
  res.status(201).json(dashboard);
}

async function update(req, res) {
  const { name, description, layout } = req.body;
  const dashboard = await dashRepo.update(req.params.id, { name, description, layout });
  if (!dashboard) throw new NotFoundError('Dashboard not found');
  res.json(dashboard);
}

async function remove(req, res) {
  const existing = await dashRepo.findById(req.params.id);
  if (!existing) throw new NotFoundError('Dashboard not found');
  await dashRepo.remove(req.params.id);
  res.json({ success: true });
}

async function addWidget(req, res) {
  if (!req.body.query_id) throw new ValidationError('query_id is required');
  const widget = await dashRepo.addWidget(req.params.id, req.body);
  res.status(201).json(widget);
}

async function updateWidget(req, res) {
  const widget = await dashRepo.updateWidget(req.params.id, req.params.widgetId, req.body);
  if (!widget) throw new NotFoundError('Widget not found');
  res.json(widget);
}

async function removeWidget(req, res) {
  await dashRepo.removeWidget(req.params.id, req.params.widgetId);
  res.json({ success: true });
}

module.exports = { list, findOne, create, update, remove, addWidget, updateWidget, removeWidget };
