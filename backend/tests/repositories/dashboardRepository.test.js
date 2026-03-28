jest.mock('../../src/db');
const db   = require('../../src/db');
const repo = require('../../src/repositories/dashboardRepository');

beforeEach(() => jest.clearAllMocks());

const dash   = { id: 'd1', name: 'Sales', description: null };
const widget = { id: 'w1', dashboard_id: 'd1', title: 'Revenue', chart_type: 'bar' };

describe('findAll()', () => {
  it('returns dashboards with widget counts', async () => {
    db.query.mockResolvedValue({ rows: [{ ...dash, widget_count: '2' }] });
    const result = await repo.findAll();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('widget_count'));
    expect(result[0].widget_count).toBe('2');
  });
});

describe('findById()', () => {
  it('returns the dashboard for a known id', async () => {
    db.query.mockResolvedValue({ rows: [dash] });
    expect(await repo.findById('d1')).toEqual(dash);
  });

  it('returns null for an unknown id', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.findById('nope')).toBeNull();
  });
});

describe('findWithWidgets()', () => {
  it('returns dashboard merged with its widgets array', async () => {
    // Both queries run in parallel — mock resolves in order
    db.query
      .mockResolvedValueOnce({ rows: [dash] })
      .mockResolvedValueOnce({ rows: [widget] });

    const result = await repo.findWithWidgets('d1');

    expect(result).toMatchObject({ id: 'd1', name: 'Sales' });
    expect(result.widgets).toEqual([widget]);
  });

  it('returns null when the dashboard does not exist', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    expect(await repo.findWithWidgets('nope')).toBeNull();
  });

  it('issues both queries in parallel (Promise.all)', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await repo.findWithWidgets('d1');
    // Both dashboard and widget queries are fired
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});

describe('create()', () => {
  it('inserts and returns the dashboard', async () => {
    db.query.mockResolvedValue({ rows: [dash] });

    const result = await repo.create({ name: 'Sales', description: null, createdBy: 'u1' });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO dashboards'),
      ['Sales', null, 'u1']
    );
    expect(result).toEqual(dash);
  });
});

describe('update()', () => {
  it('updates and returns the dashboard', async () => {
    db.query.mockResolvedValue({ rows: [{ ...dash, name: 'New Name' }] });

    const result = await repo.update('d1', { name: 'New Name', description: 'desc', layout: [] });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE dashboards'),
      expect.arrayContaining(['New Name', 'desc'])
    );
    expect(result.name).toBe('New Name');
  });

  it('returns null when id does not exist', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.update('nope', { name: 'x', layout: [] })).toBeNull();
  });
});

describe('remove()', () => {
  it('deletes the dashboard', async () => {
    db.query.mockResolvedValue({});
    await repo.remove('d1');
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM dashboards'), ['d1']);
  });
});

describe('addWidget()', () => {
  it('inserts a widget and returns it', async () => {
    db.query.mockResolvedValue({ rows: [widget] });

    const result = await repo.addWidget('d1', {
      query_id: 'q1', title: 'Revenue', chart_type: 'bar', chart_config: {}, position: {},
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO widgets'),
      expect.arrayContaining(['d1', 'q1', 'Revenue'])
    );
    expect(result).toEqual(widget);
  });

  it('defaults chart_type to "table" when not provided', async () => {
    db.query.mockResolvedValue({ rows: [widget] });
    await repo.addWidget('d1', { query_id: 'q1' });
    expect(db.query.mock.calls[0][1]).toContain('table');
  });
});

describe('updateWidget()', () => {
  it('updates and returns the widget', async () => {
    const updated = { ...widget, title: 'Updated' };
    db.query.mockResolvedValue({ rows: [updated] });

    const result = await repo.updateWidget('d1', 'w1', {
      title: 'Updated', chart_type: 'line', chart_config: {}, position: {},
    });

    expect(result).toEqual(updated);
  });

  it('returns null when widget is not found in this dashboard', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.updateWidget('d1', 'nope', {})).toBeNull();
  });
});

describe('removeWidget()', () => {
  it('deletes the widget scoped to the dashboard', async () => {
    db.query.mockResolvedValue({});
    await repo.removeWidget('d1', 'w1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM widgets'),
      ['w1', 'd1']
    );
  });
});
