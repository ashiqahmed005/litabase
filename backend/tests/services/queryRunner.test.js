// Mock all three database drivers before the queryRunner module is loaded.
// Jest hoists jest.mock() calls, so these intercept the lazy require()s
// inside the driver functions even though they use require() at call-time.

const mockPgClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  query:   jest.fn(),
  end:     jest.fn().mockResolvedValue(undefined),
};
jest.mock('pg', () => ({ Client: jest.fn(() => mockPgClient) }));

const mockMysqlConn = {
  execute: jest.fn(),
  end:     jest.fn().mockResolvedValue(undefined),
};
jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn().mockResolvedValue(mockMysqlConn),
}));

const mockSqliteStmt = { all: jest.fn() };
jest.mock('better-sqlite3', () =>
  jest.fn(() => ({
    prepare: jest.fn().mockReturnValue(mockSqliteStmt),
    close:   jest.fn(),
  }))
);

// Set encryption key so crypto.js doesn't throw
process.env.ENCRYPTION_KEY = 'test-key-exactly-32-chars-xxxxxx';

const { runQuery } = require('../../src/services/queryRunner');

const pgConn = {
  type: 'postgres', host: 'localhost', port: 5432,
  database_name: 'db', username: 'user', password_encrypted: null, ssl_enabled: false,
};
const mysqlConn = {
  type: 'mysql', host: 'localhost', port: 3306,
  database_name: 'db', username: 'user', password_encrypted: null, ssl_enabled: false,
};
const sqliteConn = {
  type: 'sqlite', database_name: '/tmp/test.db',
};

// ─── Postgres ─────────────────────────────────────────────────────────────────

describe('runQuery — postgres', () => {
  beforeEach(() => jest.clearAllMocks());

  it('connects, queries, and disconnects', async () => {
    mockPgClient.query.mockResolvedValue({ fields: [{ name: 'id' }], rows: [{ id: 1 }] });

    await runQuery(pgConn, 'SELECT 1');

    expect(mockPgClient.connect).toHaveBeenCalled();
    expect(mockPgClient.query).toHaveBeenCalledWith('SELECT 1');
    expect(mockPgClient.end).toHaveBeenCalled();
  });

  it('returns formatted { columns, rows, rowCount }', async () => {
    mockPgClient.query.mockResolvedValue({
      fields: [{ name: 'id' }, { name: 'name' }],
      rows:   [{ id: 1, name: 'Alice' }],
    });

    const result = await runQuery(pgConn, 'SELECT id, name FROM users');

    expect(result.columns).toEqual(['id', 'name']);
    expect(result.rows).toEqual([[1, 'Alice']]);
    expect(result.rowCount).toBe(1);
  });

  it('calls end() even when query throws', async () => {
    mockPgClient.query.mockRejectedValue(new Error('query failed'));

    await expect(runQuery(pgConn, 'BAD SQL')).rejects.toThrow('query failed');
    expect(mockPgClient.end).toHaveBeenCalled();
  });
});

// ─── MySQL ────────────────────────────────────────────────────────────────────

describe('runQuery — mysql', () => {
  beforeEach(() => jest.clearAllMocks());

  it('connects, executes, and disconnects', async () => {
    mockMysqlConn.execute.mockResolvedValue([
      [{ id: 1 }],
      [{ name: 'id' }],
    ]);

    await runQuery(mysqlConn, 'SELECT 1');

    expect(mockMysqlConn.execute).toHaveBeenCalledWith('SELECT 1');
    expect(mockMysqlConn.end).toHaveBeenCalled();
  });

  it('returns formatted results', async () => {
    mockMysqlConn.execute.mockResolvedValue([
      [{ count: 5 }],
      [{ name: 'count' }],
    ]);

    const result = await runQuery(mysqlConn, 'SELECT COUNT(*) AS count FROM t');

    expect(result.columns).toEqual(['count']);
    expect(result.rows).toEqual([[5]]);
  });

  it('calls end() even when execute throws', async () => {
    mockMysqlConn.execute.mockRejectedValue(new Error('mysql error'));

    await expect(runQuery(mysqlConn, 'BAD')).rejects.toThrow('mysql error');
    expect(mockMysqlConn.end).toHaveBeenCalled();
  });
});

// ─── SQLite ───────────────────────────────────────────────────────────────────

describe('runQuery — sqlite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('prepares and runs the statement', async () => {
    mockSqliteStmt.all.mockReturnValue([{ id: 1, val: 'a' }]);

    const result = await runQuery(sqliteConn, 'SELECT * FROM t');

    expect(mockSqliteStmt.all).toHaveBeenCalled();
    expect(result.columns).toEqual(['id', 'val']);
    expect(result.rows).toEqual([[1, 'a']]);
  });

  it('returns empty columns and rows for an empty result set', async () => {
    mockSqliteStmt.all.mockReturnValue([]);

    const result = await runQuery(sqliteConn, 'SELECT * FROM t WHERE 1=0');

    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.rowCount).toBe(0);
  });
});

// ─── Unsupported type ────────────────────────────────────────────────────────

describe('runQuery — unsupported type', () => {
  it('throws for an unknown connection type', async () => {
    await expect(runQuery({ type: 'oracle' }, 'SELECT 1'))
      .rejects.toThrow('Unsupported connection type: oracle');
  });
});
