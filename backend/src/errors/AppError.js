/**
 * Base class for all operational errors (errors we expect and handle).
 * The global error handler checks instanceof AppError to determine status code.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) { super(message, 400); }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 401); }
}

class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') { super(message, 403); }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(message, 404); }
}

class ConflictError extends AppError {
  constructor(message) { super(message, 409); }
}

module.exports = { AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError };
