jest.mock('../../src/repositories/dashboardRepository');

const dashRepo = require('../../src/repositories/dashboardRepository');
const ctrl     = require('../../src/controllers/dashboardController');
const { ValidationError, NotFoundError } = require('../../src/errors/AppError');

beforeEach(() => jest.clearAllMocks());

function makeRes() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const dash   = { id: 'd1', name: 'Sales', description: null };
const widget = { id: 'w1', title: 'Revenue', chart_type: 'bar' };
const user   = { id: 'u1', role: 'editor' };

describe('list()', () => {
  it('returns all dashboards', async () => {
    dashRepo.findAll.mockResolvedValue([dash]);
    const res = makeRes();
    await ctrl.list({}, res);
    expect(res.json).toHaveBeenCalledWith([dash]);
  });
});

describe('findOne()', () => {
  it('throws NotFoundError for an unknown id', async () => {
    dashRepo.findWithWidgets.mockResolvedValue(null);
    await expect(ctrl.findOne({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns the dashboard with widgets', async () => {
    dashRepo.findWithWidgets.mockResolvedValue({ ...dash, widgets: [widget] });
    const res = makeRes();
    await ctrl.findOne({ params: { id: 'd1' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ widgets: [widget] }));
  });
});

describe('create()', () => {
  it('throws ValidationError when name is missing', async () => {
    await expect(ctrl.create({ body: {}, user }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('creates and returns 201 with the dashboard', async () => {
    dashRepo.create.mockResolvedValue(dash);
    const res = makeRes();
    await ctrl.create({ body: { name: 'Sales' }, user }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(dash);
  });

  it('passes the creator id from req.user', async () => {
    dashRepo.create.mockResolvedValue(dash);
    await ctrl.create({ body: { name: 'Sales' }, user }, makeRes());
    expect(dashRepo.create).toHaveBeenCalledWith(expect.objectContaining({ createdBy: 'u1' }));
  });
});

describe('update()', () => {
  it('throws NotFoundError when dashboard does not exist', async () => {
    dashRepo.update.mockResolvedValue(null);
    await expect(ctrl.update({ params: { id: 'nope' }, body: { name: 'X' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates and returns the dashboard', async () => {
    dashRepo.update.mockResolvedValue({ ...dash, name: 'Updated' });
    const res = makeRes();
    await ctrl.update({ params: { id: 'd1' }, body: { name: 'Updated' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
  });
});

describe('remove()', () => {
  it('throws NotFoundError for an unknown id', async () => {
    dashRepo.findById.mockResolvedValue(null);
    await expect(ctrl.remove({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes and returns success', async () => {
    dashRepo.findById.mockResolvedValue(dash);
    dashRepo.remove.mockResolvedValue(undefined);
    const res = makeRes();
    await ctrl.remove({ params: { id: 'd1' } }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('addWidget()', () => {
  it('throws ValidationError when query_id is missing', async () => {
    await expect(ctrl.addWidget({ params: { id: 'd1' }, body: {} }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('adds a widget and returns 201', async () => {
    dashRepo.addWidget.mockResolvedValue(widget);
    const res = makeRes();
    await ctrl.addWidget({ params: { id: 'd1' }, body: { query_id: 'q1' } }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(widget);
  });
});

describe('updateWidget()', () => {
  it('throws NotFoundError when widget is not found', async () => {
    dashRepo.updateWidget.mockResolvedValue(null);
    await expect(ctrl.updateWidget({ params: { id: 'd1', widgetId: 'nope' }, body: {} }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates and returns the widget', async () => {
    const updated = { ...widget, title: 'New' };
    dashRepo.updateWidget.mockResolvedValue(updated);
    const res = makeRes();
    await ctrl.updateWidget({ params: { id: 'd1', widgetId: 'w1' }, body: { title: 'New' } }, res);
    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

describe('removeWidget()', () => {
  it('removes and returns success', async () => {
    dashRepo.removeWidget.mockResolvedValue(undefined);
    const res = makeRes();
    await ctrl.removeWidget({ params: { id: 'd1', widgetId: 'w1' } }, res);
    expect(dashRepo.removeWidget).toHaveBeenCalledWith('d1', 'w1');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
