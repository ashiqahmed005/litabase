jest.mock('../../src/db');
const db   = require('../../src/db');
const repo = require('../../src/repositories/userRepository');

beforeEach(() => jest.clearAllMocks());

describe('findByEmail()', () => {
  it('queries by email and returns the row', async () => {
    const user = { id: '1', email: 'a@b.com', role: 'admin' };
    db.query.mockResolvedValue({ rows: [user] });

    const result = await repo.findByEmail('a@b.com');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE email'), ['a@b.com']);
    expect(result).toEqual(user);
  });

  it('returns null when no user is found', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.findByEmail('x@y.com')).toBeNull();
  });
});

describe('findById()', () => {
  it('queries by id and returns the row', async () => {
    const user = { id: 'uid', name: 'Alice', email: 'a@b.com', role: 'editor' };
    db.query.mockResolvedValue({ rows: [user] });

    const result = await repo.findById('uid');

    expect(db.query).toHaveBeenCalledWith(expect.stringContaining('WHERE id'), ['uid']);
    expect(result).toEqual(user);
  });

  it('returns null for an unknown id', async () => {
    db.query.mockResolvedValue({ rows: [] });
    expect(await repo.findById('nope')).toBeNull();
  });
});

describe('countAll()', () => {
  it('returns the integer count', async () => {
    db.query.mockResolvedValue({ rows: [{ count: '3' }] });
    expect(await repo.countAll()).toBe(3);
  });

  it('returns 0 for an empty table', async () => {
    db.query.mockResolvedValue({ rows: [{ count: '0' }] });
    expect(await repo.countAll()).toBe(0);
  });
});

describe('create()', () => {
  it('inserts a user and returns the created row', async () => {
    const inserted = { id: 'new', name: 'Bob', email: 'b@c.com', role: 'viewer' };
    db.query.mockResolvedValue({ rows: [inserted] });

    const result = await repo.create({ name: 'Bob', email: 'b@c.com', passwordHash: 'hash', role: 'viewer' });

    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO users'),
      ['Bob', 'b@c.com', 'hash', 'viewer']
    );
    expect(result).toEqual(inserted);
  });
});
