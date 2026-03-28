const asyncHandler = require('../../src/middleware/asyncHandler');

const noop = () => {};

describe('asyncHandler', () => {
  it('calls the wrapped function with req, res, next', async () => {
    const fn  = jest.fn().mockResolvedValue(undefined);
    const req = {}, res = {}, next = jest.fn();
    await asyncHandler(fn)(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('does not call next when the handler resolves successfully', async () => {
    const fn   = jest.fn().mockResolvedValue(undefined);
    const next = jest.fn();
    await asyncHandler(fn)({}, {}, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a rejected promise to next(err)', async () => {
    const err  = new Error('boom');
    const fn   = jest.fn().mockRejectedValue(err);
    const next = jest.fn();
    await asyncHandler(fn)({}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('forwards a synchronous throw to next(err)', async () => {
    const err = new Error('sync throw');
    const fn  = () => { throw err; };
    const next = jest.fn();
    await asyncHandler(fn)({}, {}, next);
    expect(next).toHaveBeenCalledWith(err);
  });

  it('returns the original handler\'s return value wrapped in a Promise', () => {
    const fn = () => Promise.resolve('value');
    const result = asyncHandler(fn)({}, {}, noop);
    expect(result).toBeInstanceOf(Promise);
  });
});
