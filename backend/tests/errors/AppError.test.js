const {
  AppError, ValidationError, UnauthorizedError,
  ForbiddenError, NotFoundError, ConflictError,
} = require('../../src/errors/AppError');

describe('AppError base class', () => {
  it('defaults to status 500', () => {
    expect(new AppError('oops').statusCode).toBe(500);
  });

  it('accepts a custom status code', () => {
    expect(new AppError('bad', 422).statusCode).toBe(422);
  });

  it('sets message and name', () => {
    const err = new AppError('something broke');
    expect(err.message).toBe('something broke');
    expect(err.name).toBe('AppError');
  });

  it('is an instance of Error', () => {
    expect(new AppError('x')).toBeInstanceOf(Error);
  });

  it('captures a stack trace', () => {
    expect(new AppError('x').stack).toBeDefined();
  });
});

describe('ValidationError', () => {
  it('has statusCode 400', () => expect(new ValidationError('bad input').statusCode).toBe(400));
  it('is an AppError', ()  => expect(new ValidationError('x')).toBeInstanceOf(AppError));
  it('preserves message',  () => expect(new ValidationError('msg').message).toBe('msg'));
});

describe('UnauthorizedError', () => {
  it('has statusCode 401', () => expect(new UnauthorizedError().statusCode).toBe(401));
  it('defaults message',   () => expect(new UnauthorizedError().message).toBe('Unauthorized'));
  it('accepts custom message', () => expect(new UnauthorizedError('nope').message).toBe('nope'));
});

describe('ForbiddenError', () => {
  it('has statusCode 403', () => expect(new ForbiddenError().statusCode).toBe(403));
  it('defaults message',   () => expect(new ForbiddenError().message).toBe('Insufficient permissions'));
});

describe('NotFoundError', () => {
  it('has statusCode 404', () => expect(new NotFoundError('gone').statusCode).toBe(404));
  it('preserves message',  () => expect(new NotFoundError('gone').message).toBe('gone'));
});

describe('ConflictError', () => {
  it('has statusCode 409', () => expect(new ConflictError('dup').statusCode).toBe(409));
  it('is an AppError',     () => expect(new ConflictError('x')).toBeInstanceOf(AppError));
});
