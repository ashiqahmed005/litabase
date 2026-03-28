jest.mock('../../src/repositories/queryRepository');
jest.mock('../../src/repositories/connectionRepository');
jest.mock('../../src/services/queryRunner');

const queryRepo    = require('../../src/repositories/queryRepository');
const connRepo     = require('../../src/repositories/connectionRepository');
const { runQuery } = require('../../src/services/queryRunner');
const ctrl         = require('../../src/controllers/queryController');
const { ValidationError, NotFoundError } = require('../../src/errors/AppError');

beforeEach(() => jest.clearAllMocks());

function makeRes() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const q      = { id: 'q1', name: 'Revenue', sql_text: 'SELECT 1', connection_id: 'c1' };
const conn   = { id: 'c1', type: 'postgres', host: 'localhost' };
const user   = { id: 'u1', role: 'editor' };

describe('list()', () => {
  it('returns all queries', async () => {
    queryRepo.findAll.mockResolvedValue([q]);
    const res = makeRes();
    await ctrl.list({}, res);
    expect(res.json).toHaveBeenCalledWith([q]);
  });
});

describe('findOne()', () => {
  it('throws NotFoundError for an unknown id', async () => {
    queryRepo.findById.mockResolvedValue(null);
    await expect(ctrl.findOne({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns the query', async () => {
    queryRepo.findById.mockResolvedValue(q);
    const res = makeRes();
    await ctrl.findOne({ params: { id: 'q1' } }, res);
    expect(res.json).toHaveBeenCalledWith(q);
  });
});

describe('runAdHoc()', () => {
  it('throws ValidationError when connection_id or sql is missing', async () => {
    await expect(ctrl.runAdHoc({ body: { sql: 'SELECT 1' } }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('throws NotFoundError when connection does not exist', async () => {
    connRepo.findById.mockResolvedValue(null);
    await expect(ctrl.runAdHoc({ body: { connection_id: 'nope', sql: 'SELECT 1' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('runs the query and returns results with executionMs', async () => {
    connRepo.findById.mockResolvedValue(conn);
    runQuery.mockResolvedValue({ columns: ['n'], rows: [[1]], rowCount: 1 });

    const res = makeRes();
    await ctrl.runAdHoc({ body: { connection_id: 'c1', sql: 'SELECT 1' } }, res);

    expect(runQuery).toHaveBeenCalledWith(conn, 'SELECT 1');
    expect(res.json.mock.calls[0][0]).toHaveProperty('executionMs');
  });
});

describe('create()', () => {
  it('throws ValidationError for missing required fields', async () => {
    await expect(ctrl.create({ body: { name: 'Q' }, user }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('creates and returns 201 with the query', async () => {
    queryRepo.create.mockResolvedValue(q);
    const res = makeRes();
    await ctrl.create({
      body: { name: 'Revenue', sql_text: 'SELECT 1', connection_id: 'c1' }, user,
    }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(q);
  });
});

describe('update()', () => {
  it('throws NotFoundError when query does not exist', async () => {
    queryRepo.update.mockResolvedValue(null);
    await expect(ctrl.update({
      params: { id: 'nope' },
      body: { name: 'x', sql_text: 'y', connection_id: 'c1' },
    }, makeRes())).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates and returns the query', async () => {
    queryRepo.update.mockResolvedValue(q);
    const res = makeRes();
    await ctrl.update({ params: { id: 'q1' }, body: { name: 'R', sql_text: 'S', connection_id: 'c1' } }, res);
    expect(res.json).toHaveBeenCalledWith(q);
  });
});

describe('remove()', () => {
  it('throws NotFoundError for an unknown id', async () => {
    queryRepo.findById.mockResolvedValue(null);
    await expect(ctrl.remove({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes and returns success', async () => {
    queryRepo.findById.mockResolvedValue(q);
    queryRepo.remove.mockResolvedValue(undefined);
    const res = makeRes();
    await ctrl.remove({ params: { id: 'q1' } }, res);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

describe('runSaved()', () => {
  it('throws NotFoundError when query is not found', async () => {
    queryRepo.findWithConnection.mockResolvedValue(null);
    await expect(ctrl.runSaved({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('runs the saved query and returns results with executionMs', async () => {
    const row = { ...q, ...conn, sql_text: 'SELECT 1', password_encrypted: null };
    queryRepo.findWithConnection.mockResolvedValue(row);
    runQuery.mockResolvedValue({ columns: ['n'], rows: [[1]], rowCount: 1 });

    const res = makeRes();
    await ctrl.runSaved({ params: { id: 'q1' } }, res);

    expect(runQuery).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'postgres' }),
      'SELECT 1'
    );
    expect(res.json.mock.calls[0][0]).toHaveProperty('executionMs');
  });
});
