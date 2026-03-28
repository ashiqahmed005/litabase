jest.mock('../../src/db');
const db   = require('../../src/db');
const repo = require('../../src/repositories/scheduleRepository');

beforeEach(() => jest.clearAllMocks());

const sched = { id: 's1', name: 'Daily', dashboard_id: 'd1', cron_expression: '0 9 * * *', is_active: true };

describe('findAll()', () => {
  it('returns schedules joined with dashboard and creator names', async () => {
    db.query.mockResolvedValue({ rows: [sched] });
    const result = await repo.findAll();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN dashboards'));
    expect(result).toEqual([sched]);
  });
});

describe('findById()', () => {
  it('returns a schedule joined with dashboard name', async () => {
    db.query.mockResolvedValue({ rows: [sched] });
    const result = await repo.findById('s1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN dashboards'),
      ['s1']
    );
    expect(result).toEqual(sched);
  });

  it('returns null for an unknown id', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.findById('nope')).toBeNull();
  });
});

describe('findAllActive()', () => {
  it('filters by is_active = true', async () => {
    db.query.mockResolvedValue({ rows: [sched] });
    await repo.findAllActive();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('is_active = true'));
  });
});

describe('findWidgetsForDashboard()', () => {
  it('returns widgets joined with query SQL and connection details', async () => {
    const row = { id: 'w1', sql_text: 'SELECT 1', type: 'postgres' };
    db.query.mockResolvedValue({ rows: [row] });

    const result = await repo.findWidgetsForDashboard('d1');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN queries'),
      ['d1']
    );
    expect(result).toEqual([row]);
  });
});

describe('create()', () => {
  it('inserts and returns the schedule', async () => {
    db.query.mockResolvedValue({ rows: [sched] });

    const result = await repo.create({
      name: 'Daily', dashboard_id: 'd1', cron_expression: '0 9 * * *',
      recipients: ['a@b.com'], format: 'email', createdBy: 'u1',
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO schedules'),
      expect.arrayContaining(['Daily', 'd1', '0 9 * * *'])
    );
    expect(result).toEqual(sched);
  });

  it('defaults format to "email" when not provided', async () => {
    db.query.mockResolvedValue({ rows: [sched] });
    await repo.create({ name: 'x', dashboard_id: 'd1', cron_expression: '* * * * *', recipients: [], createdBy: 'u1' });
    expect(db.query.mock.calls[0][1]).toContain('email');
  });
});

describe('update()', () => {
  it('updates and returns the schedule', async () => {
    const updated = { ...sched, name: 'Weekly' };
    db.query.mockResolvedValue({ rows: [updated] });

    const result = await repo.update('s1', {
      name: 'Weekly', cron_expression: '0 9 * * 1',
      recipients: ['b@c.com'], format: 'email', is_active: true,
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE schedules'),
      expect.arrayContaining(['Weekly', '0 9 * * 1'])
    );
    expect(result).toEqual(updated);
  });

  it('returns null when id does not exist', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.update('nope', {})).toBeNull();
  });
});

describe('remove()', () => {
  it('deletes the schedule by id', async () => {
    db.query.mockResolvedValue({});
    await repo.remove('s1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM schedules'),
      ['s1']
    );
  });
});

describe('markLastRun()', () => {
  it('updates last_run_at for the schedule', async () => {
    db.query.mockResolvedValue({});
    await repo.markLastRun('s1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('last_run_at'),
      ['s1']
    );
  });
});
