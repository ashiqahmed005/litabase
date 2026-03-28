jest.mock('../../src/db');
const db   = require('../../src/db');
const repo = require('../../src/repositories/connectionRepository');

beforeEach(() => jest.clearAllMocks());

const conn = { id: 'c1', name: 'Prod DB', type: 'postgres', host: 'localhost' };

describe('findAll()', () => {
  it('returns all connection rows', async () => {
    db.query.mockResolvedValue({ rows: [conn] });
    const result = await repo.findAll();
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'));
    expect(result).toEqual([conn]);
  });
});

describe('findById()', () => {
  it('returns the connection for a known id', async () => {
    db.query.mockResolvedValue({ rows: [conn] });
    expect(await repo.findById('c1')).toEqual(conn);
    expect(db.query).toHaveBeenCalledWith(expect.any(String), ['c1']);
  });

  it('returns null for an unknown id', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.findById('nope')).toBeNull();
  });
});

describe('create()', () => {
  it('inserts and returns the created connection', async () => {
    db.query.mockResolvedValue({ rows: [conn] });

    const result = await repo.create({
      name: 'Prod DB', type: 'postgres', host: 'localhost',
      port: 5432, database_name: 'app', username: 'admin',
      passwordEncrypted: 'enc', ssl_enabled: false, createdBy: 'u1',
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO connections'),
      expect.arrayContaining(['Prod DB', 'postgres', 'localhost'])
    );
    expect(result).toEqual(conn);
  });

  it('coerces null for optional fields', async () => {
    db.query.mockResolvedValue({ rows: [conn] });

    await repo.create({ name: 'SQLite', type: 'sqlite', passwordEncrypted: null, createdBy: 'u1' });

    const params = db.query.mock.calls[0][1];
    // host, port, database_name, username should be null when not supplied
    expect(params).toContain(null);
  });
});

describe('update()', () => {
  it('updates and returns the updated connection', async () => {
    const updated = { ...conn, name: 'Staging DB' };
    db.query.mockResolvedValue({ rows: [updated] });

    const result = await repo.update('c1', {
      name: 'Staging DB', type: 'postgres', host: 'localhost',
      port: 5432, database_name: 'app', username: 'admin',
      passwordEncrypted: 'enc', ssl_enabled: true,
    });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE connections'),
      expect.arrayContaining(['Staging DB'])
    );
    expect(result).toEqual(updated);
  });

  it('returns null when the id does not exist', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.update('nope', {})).toBeNull();
  });
});

describe('remove()', () => {
  it('executes a DELETE query with the given id', async () => {
    db.query.mockResolvedValue({ rows: [] });
    await repo.remove('c1');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM connections'),
      ['c1']
    );
  });
});
