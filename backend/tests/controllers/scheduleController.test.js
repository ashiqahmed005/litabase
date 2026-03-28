jest.mock('node-cron');
jest.mock('../../src/repositories/scheduleRepository');
jest.mock('../../src/services/scheduler');

const cron         = require('node-cron');
const scheduleRepo = require('../../src/repositories/scheduleRepository');
const scheduler    = require('../../src/services/scheduler');
const ctrl         = require('../../src/controllers/scheduleController');
const { ValidationError, NotFoundError } = require('../../src/errors/AppError');

beforeEach(() => {
  jest.clearAllMocks();
  cron.validate.mockReturnValue(true);
});

function makeRes() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const sched = { id: 's1', name: 'Daily', dashboard_id: 'd1', cron_expression: '0 9 * * *', is_active: true };
const user  = { id: 'u1', role: 'editor' };

describe('list()', () => {
  it('returns all schedules', async () => {
    scheduleRepo.findAll.mockResolvedValue([sched]);
    const res = makeRes();
    await ctrl.list({}, res);
    expect(res.json).toHaveBeenCalledWith([sched]);
  });
});

describe('create()', () => {
  it('throws ValidationError when required fields are missing', async () => {
    await expect(ctrl.create({ body: { name: 'X' }, user }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ValidationError for an invalid cron expression', async () => {
    cron.validate.mockReturnValue(false);
    await expect(ctrl.create({
      body: { name: 'X', dashboard_id: 'd1', cron_expression: 'bad', recipients: ['a@b.com'] },
      user,
    }, makeRes())).rejects.toBeInstanceOf(ValidationError);
  });

  it('creates a schedule, starts it, and returns 201', async () => {
    scheduleRepo.create.mockResolvedValue(sched);
    const res = makeRes();
    await ctrl.create({
      body: { name: 'Daily', dashboard_id: 'd1', cron_expression: '0 9 * * *', recipients: ['a@b.com'] },
      user,
    }, res);
    expect(scheduler.startSchedule).toHaveBeenCalledWith(sched);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(sched);
  });
});

describe('update()', () => {
  it('throws ValidationError for an invalid cron expression', async () => {
    cron.validate.mockReturnValue(false);
    await expect(ctrl.update({
      params: { id: 's1' },
      body: { cron_expression: 'bad' },
    }, makeRes())).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFoundError when schedule does not exist', async () => {
    scheduleRepo.update.mockResolvedValue(null);
    await expect(ctrl.update({ params: { id: 'nope' }, body: {} }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('starts the schedule when is_active is true', async () => {
    scheduleRepo.update.mockResolvedValue({ ...sched, is_active: true });
    await ctrl.update({ params: { id: 's1' }, body: {} }, makeRes());
    expect(scheduler.startSchedule).toHaveBeenCalled();
    expect(scheduler.stopSchedule).not.toHaveBeenCalled();
  });

  it('stops the schedule when is_active is false', async () => {
    scheduleRepo.update.mockResolvedValue({ ...sched, is_active: false });
    await ctrl.update({ params: { id: 's1' }, body: { is_active: false } }, makeRes());
    expect(scheduler.stopSchedule).toHaveBeenCalledWith('s1');
    expect(scheduler.startSchedule).not.toHaveBeenCalled();
  });
});

describe('remove()', () => {
  it('stops the cron task and deletes the record', async () => {
    scheduleRepo.remove.mockResolvedValue(undefined);
    const res = makeRes();
    await ctrl.remove({ params: { id: 's1' } }, res);
    expect(scheduler.stopSchedule).toHaveBeenCalledWith('s1');
    expect(scheduleRepo.remove).toHaveBeenCalledWith('s1');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('run()', () => {
  it('throws NotFoundError when schedule does not exist', async () => {
    scheduleRepo.findById.mockResolvedValue(null);
    await expect(ctrl.run({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('triggers the schedule as fire-and-forget and returns success', async () => {
    scheduleRepo.findById.mockResolvedValue(sched);
    const res = makeRes();
    await ctrl.run({ params: { id: 's1' } }, res);
    expect(scheduler.runSchedule).toHaveBeenCalledWith(sched);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
