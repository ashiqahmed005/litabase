const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepo = require('../repositories/userRepository');
const { ValidationError, UnauthorizedError, NotFoundError, ConflictError } = require('../errors/AppError');

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new ValidationError('name, email, and password are required');

  if (await userRepo.findByEmail(email)) throw new ConflictError('Email already registered');

  const passwordHash = await bcrypt.hash(password, 12);
  const role = (await userRepo.countAll()) === 0 ? 'admin' : 'viewer';
  const user = await userRepo.create({ name, email, passwordHash, role });

  res.status(201).json({ token: signToken(user), user });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) throw new ValidationError('email and password are required');

  const user = await userRepo.findByEmail(email);
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new UnauthorizedError('Invalid credentials');

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

async function me(req, res) {
  const user = await userRepo.findById(req.user.id);
  if (!user) throw new NotFoundError('User not found');
  res.json(user);
}

module.exports = { register, login, me };
