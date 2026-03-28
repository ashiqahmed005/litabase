jest.mock('../../src/repositories/userRepository');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const userRepo = require('../../src/repositories/userRepository');
const ctrl     = require('../../src/controllers/authController');
const { ValidationError, UnauthorizedError, NotFoundError, ConflictError } = require('../../src/errors/AppError');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'secret';
  jwt.sign.mockReturnValue('signed-token');
});

function makeRes() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

// ─── register ────────────────────────────────────────────────────────────────

describe('register()', () => {
  it('throws ValidationError when required fields are missing', async () => {
    await expect(ctrl.register({ body: { name: 'Alice' } }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('throws ConflictError when the email is already taken', async () => {
    userRepo.findByEmail.mockResolvedValue({ id: 'existing' });
    await expect(ctrl.register({ body: { name: 'A', email: 'a@b.com', password: 'pw' } }, makeRes()))
      .rejects.toBeInstanceOf(ConflictError);
  });

  it('makes the first registered user an admin', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.countAll.mockResolvedValue(0);
    bcrypt.hash.mockResolvedValue('hashed');
    userRepo.create.mockResolvedValue({ id: '1', name: 'Alice', email: 'a@b.com', role: 'admin' });

    await ctrl.register({ body: { name: 'Alice', email: 'a@b.com', password: 'pw' } }, makeRes());

    expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'admin' }));
  });

  it('assigns the viewer role to subsequent registrations', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.countAll.mockResolvedValue(5);
    bcrypt.hash.mockResolvedValue('hashed');
    userRepo.create.mockResolvedValue({ id: '2', name: 'Bob', email: 'b@c.com', role: 'viewer' });

    await ctrl.register({ body: { name: 'Bob', email: 'b@c.com', password: 'pw' } }, makeRes());

    expect(userRepo.create).toHaveBeenCalledWith(expect.objectContaining({ role: 'viewer' }));
  });

  it('returns 201 with token and user on success', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    userRepo.countAll.mockResolvedValue(1);
    bcrypt.hash.mockResolvedValue('hashed');
    const user = { id: '1', name: 'A', email: 'a@b.com', role: 'viewer' };
    userRepo.create.mockResolvedValue(user);

    const res = makeRes();
    await ctrl.register({ body: { name: 'A', email: 'a@b.com', password: 'pw' } }, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ token: 'signed-token', user });
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login()', () => {
  it('throws ValidationError when email or password is missing', async () => {
    await expect(ctrl.login({ body: { email: 'a@b.com' } }, makeRes()))
      .rejects.toBeInstanceOf(ValidationError);
  });

  it('throws UnauthorizedError for an unknown email', async () => {
    userRepo.findByEmail.mockResolvedValue(null);
    await expect(ctrl.login({ body: { email: 'x@y.com', password: 'pw' } }, makeRes()))
      .rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('throws UnauthorizedError for a wrong password', async () => {
    userRepo.findByEmail.mockResolvedValue({ id: '1', password_hash: 'hash' });
    bcrypt.compare.mockResolvedValue(false);
    await expect(ctrl.login({ body: { email: 'a@b.com', password: 'wrong' } }, makeRes()))
      .rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('returns token and user profile on successful login', async () => {
    const user = { id: '1', name: 'Alice', email: 'a@b.com', role: 'admin', password_hash: 'h' };
    userRepo.findByEmail.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true);

    const res = makeRes();
    await ctrl.login({ body: { email: 'a@b.com', password: 'pw' } }, res);

    expect(res.json).toHaveBeenCalledWith({
      token: 'signed-token',
      user: { id: '1', name: 'Alice', email: 'a@b.com', role: 'admin' },
    });
  });
});

// ─── me ──────────────────────────────────────────────────────────────────────

describe('me()', () => {
  it('throws NotFoundError when the user no longer exists', async () => {
    userRepo.findById.mockResolvedValue(null);
    await expect(ctrl.me({ user: { id: '1' } }, makeRes()))
      .rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns the user profile', async () => {
    const user = { id: '1', name: 'Alice', email: 'a@b.com', role: 'admin' };
    userRepo.findById.mockResolvedValue(user);

    const res = makeRes();
    await ctrl.me({ user: { id: '1' } }, res);

    expect(res.json).toHaveBeenCalledWith(user);
  });
});
