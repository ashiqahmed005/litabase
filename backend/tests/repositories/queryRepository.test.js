jest.mock('../../src/db');
const db   = require('../../src/db');
const repo = require('../../src/repositories/queryRepository');

beforeEach(() => jest.clearAllMocks());

const q = { id: 'q1', name: 'Revenue', sql_text: 'SELECT 1', connection_id: 'c1' };

describe('findAll()', () => {
  it('returns all query rows joined with connection and creator names', async () => {
    db.query.mockResolvedValue({ rows: [q] });
    const result = await repo.findAll();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('LEFT JOIN connections'));
    expect(result).toEqual([q]);
  });
});

describe('findById()', () => {
  it('returns the query for a known id', async () => {
    db.query.mockResolvedValue({ rows: [q] });
    expect(await repo.findById('q1')).toEqual(q);
  });

  it('returns null for an unknown id', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.findById('nope')).toBeNull();
  });
});

describe('findWithConnection()', () => {
  it('joins queries with their connection row', async () => {
    const joined = { ...q, type: 'postgres', host: 'localhost' };
    db.query.mockResolvedValue({ rows: [joined] });

    const result = await repo.findWithConnection('q1');

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('JOIN connections c'),
      ['q1']
    );
    expect(result).toEqual(joined);
  });

  it('returns null when query is not found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.findWithConnection('nope')).toBeNull();
  });
});

describe('create()', () => {
  it('inserts and returns the created query', async () => {
    db.query.mockResolvedValue({ rows: [q] });

    const result = await repo.create({
      name: 'Revenue', description: null, sql_text: 'SELECT 1',
      connection_id: 'c1', createdBy: 'u1',
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO queries'),
      ['Revenue', null, 'SELECT 1', 'c1', 'u1']
    );
    expect(result).toEqual(q);
  });
});

describe('update()', () => {
  it('updates and returns the modified query', async () => {
    const updated = { ...q, name: 'Updated' };
    db.query.mockResolvedValue({ rows: [updated] });

    const result = await repo.update('q1', {
      name: 'Updated', description: 'desc', sql_text: 'SELECT 2', connection_id: 'c1',
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE queries'),
      ['Updated', 'desc', 'SELECT 2', 'c1', 'q1']
    );
    expect(result).toEqual(updated);
  });

  it('returns null when id does not exist', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.update('nope', {})).toBeNull();
  });
});

describe('remove()', () => {
  it('deletes the query by id', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await repo.remove('q1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM queries'),
      ['q1']
    );
  });
});
