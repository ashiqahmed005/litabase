const jwt = require('jsonwebtoken');
const { authenticate, requireRole } = require('../../src/middleware/auth');

const SECRET = 'test-secret';

beforeEach(() => { process.env.JWT_SECRET = SECRET; });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res = { json: jest.fn(), status: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function validToken(payload = { id: '1', email: 'a@b.com', role: 'admin' }) {
  return jwt.sign(payload, SECRET);
}

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate', () => {
  it('returns 401 when Authorization header is absent', () => {
    const req  = { headers: {} };
    const res  = makeRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with "Bearer "', () => {
    const req  = { headers: { authorization: 'Token abc' } };
    const res  = makeRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for an invalid token', () => {
    const req  = { headers: { authorization: 'Bearer notavalidtoken' } };
    const res  = makeRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with the wrong secret', () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, 'wrong-secret');
    const req   = { headers: { authorization: `Bearer ${token}` } };
    const res   = makeRes();
    const next  = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('sets req.user and calls next for a valid token', () => {
    const payload = { id: 'u1', email: 'a@b.com', role: 'editor' };
    const req     = { headers: { authorization: `Bearer ${validToken(payload)}` } };
    const res     = makeRes();
    const next    = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.id).toBe('u1');
    expect(req.user.role).toBe('editor');
  });
});

// ─── requireRole ─────────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('calls next when the user role is in the allowed list', () => {
    const req  = { user: { role: 'editor' } };
    const res  = makeRes();
    const next = jest.fn();
    requireRole('admin', 'editor')(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when the user role is not in the allowed list', () => {
    const req  = { user: { role: 'viewer' } };
    const res  = makeRes();
    const next = jest.fn();
    requireRole('admin', 'editor')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows an admin through any single-role guard', () => {
    const req  = { user: { role: 'admin' } };
    const next = jest.fn();
    requireRole('admin')(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
