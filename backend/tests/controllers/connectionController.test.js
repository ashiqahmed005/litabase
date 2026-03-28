jest.mock('../../src/repositories/connectionRepository');
jest.mock('../../src/services/crypto');
jest.mock('../../src/services/queryRunner');

const connRepo     = require('../../src/repositories/connectionRepository');
const { encrypt }  = require('../../src/services/crypto');
const { runQuery } = require('../../src/services/queryRunner');
const ctrl         = require('../../src/controllers/connectionController');
const { ValidationError, NotFoundError } = require('../../src/errors/AppError');

beforeEach(() => jest.clearAllMocks());

function makeRes() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

const conn = { id: 'c1', name: 'Prod', type: 'postgres', password_encrypted: 'enc' };
const adminUser = { id: 'u1', role: 'admin' };

// ─── list ────────────────────────────────────────────────────────────────────

describe('list()', () => {
  it('returns all connections', async () => {
    connRepo.findAll.mockResolvedValue([conn]);
    const res = makeRes();
    await ctrl.list({}, res);
    expect(res.json).toHaveBeenCalledWith([conn]);
  });
});

// ─── create ──────────────────────────────────────────────────────────────────

describe('create()', () => {
  it('throws ValidationError when name or type is missing', async () => {
    await expect(ctrl.create({ body: { name: 'DB' }, user: adminUser }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('encrypts the password before storing', async () => {
    encrypt.mockReturnValue('encrypted');
    connRepo.create.mockResolvedValue(conn);

    await ctrl.create({ body: { name: 'DB', type: 'postgres', password: 'secret' }, user: adminUser }, makeRes());

    expect(encrypt).toHaveBeenCalledWith('secret');
    expect(connRepo.create).toHaveBeenCalledWith(expect.objectContaining({ passwordEncrypted: 'encrypted' }));
  });

  it('sets passwordEncrypted to null when no password is provided', async () => {
    connRepo.create.mockResolvedValue(conn);

    await ctrl.create({ body: { name: 'DB', type: 'sqlite' }, user: adminUser }, makeRes());

    expect(connRepo.create).toHaveBeenCalledWith(expect.objectContaining({ passwordEncrypted: null }));
    expect(encrypt).not.toHaveBeenCalled();
  });

  it('returns 201 with the created connection', async () => {
    connRepo.create.mockResolvedValue(conn);
    const res = makeRes();
    await ctrl.create({ body: { name: 'DB', type: 'postgres' }, user: adminUser }, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(conn);
  });
});

// ─── test ────────────────────────────────────────────────────────────────────

describe('test()', () => {
  it('throws NotFoundError when connection does not exist', async () => {
    connRepo.findById.mockResolvedValue(null);
    await expect(ctrl.test({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('runs a test query and returns success', async () => {
    connRepo.findById.mockResolvedValue(conn);
    runQuery.mockResolvedValue({});

    const res = makeRes();
    await ctrl.test({ params: { id: 'c1' } }, res);

    expect(runQuery).toHaveBeenCalledWith(conn, 'SELECT 1 AS test');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── update ──────────────────────────────────────────────────────────────────

describe('update()', () => {
  it('throws NotFoundError when connection does not exist', async () => {
    connRepo.findById.mockResolvedValue(null);
    await expect(ctrl.update({ params: { id: 'nope' }, body: {} }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('preserves the existing encrypted password when no new password is given', async () => {
    connRepo.findById.mockResolvedValue(conn);
    connRepo.update.mockResolvedValue(conn);

    await ctrl.update({ params: { id: 'c1' }, body: { name: 'DB', type: 'postgres' } }, makeRes());

    expect(encrypt).not.toHaveBeenCalled();
    expect(connRepo.update).toHaveBeenCalledWith('c1',
      expect.objectContaining({ passwordEncrypted: 'enc' })
    );
  });

  it('re-encrypts when a new password is supplied', async () => {
    connRepo.findById.mockResolvedValue(conn);
    connRepo.update.mockResolvedValue(conn);
    encrypt.mockReturnValue('new-enc');

    await ctrl.update({ params: { id: 'c1' }, body: { name: 'DB', type: 'postgres', password: 'new' } }, makeRes());

    expect(encrypt).toHaveBeenCalledWith('new');
    expect(connRepo.update).toHaveBeenCalledWith('c1',
      expect.objectContaining({ passwordEncrypted: 'new-enc' })
    );
  });
});

// ─── remove ──────────────────────────────────────────────────────────────────

describe('remove()', () => {
  it('throws NotFoundError when connection does not exist', async () => {
    connRepo.findById.mockResolvedValue(null);
    await expect(ctrl.remove({ params: { id: 'nope' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('deletes and returns success', async () => {
    connRepo.findById.mockResolvedValue(conn);
    connRepo.remove.mockResolvedValue(undefined);
    const res = makeRes();
    await ctrl.remove({ params: { id: 'c1' } }, res);
    expect(connRepo.remove).toHaveBeenCalledWith('c1');
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
