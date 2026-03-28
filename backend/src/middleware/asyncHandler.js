/**
 * Wraps an async Express handler and forwards any rejected promise to next(err).
 * Eliminates try/catch boilerplate in route handlers and ensures all async
 * errors reach the global error handler rather than becoming unhandled rejections.
 *
 * Usage:
 *   router.get('/resource', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = fn => (req, res, next) => {
  try {
    return Promise.resolve(fn(req, res, next)).catch(next);
  } catch (err) {
    return next(err);
  }
};

module.exports = asyncHandler;
