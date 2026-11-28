// Контроллер аутентификации: регистрация, вход, refresh
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthModel = require('../models/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_401';
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

function generateTokens(user) {
  const payload = { userId: user._id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { accessToken, refreshToken, expiresIn: 900 };
}

exports.register = async (ctx) => {
  const { name, email, password } = ctx.request.body || {};
  if (!name || !email || !password) ctx.throw(400, 'name, email, password are required');

  const existing = await AuthModel.findByEmail(ctx, email);
  if (existing) ctx.throw(409, 'Email already exists');

  const user = await AuthModel.register(ctx, { name, email, password, role: 'user' });
  const tokens = generateTokens(user);

  ctx.status = 201;
  ctx.body = {
    data: { userId: user._id, email: user.email, role: user.role },
    ...tokens,
  };
};

exports.login = async (ctx) => {
  const { email, password } = ctx.request.body || {};
  if (!email || !password) ctx.throw(400, 'email and password are required');

  const user = await AuthModel.findByEmail(ctx, email);
  if (!user) ctx.throw(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) ctx.throw(401, 'Invalid credentials');

  console.log(`[AUTH] Успешный вход: ${email}`);
  const tokens = generateTokens(user);
  ctx.body = tokens;
};

exports.refresh = async (ctx) => {
  const { refreshToken } = ctx.request.body || {};
  if (!refreshToken) ctx.throw(400, 'refreshToken is required');
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const user = await AuthModel.findById(ctx, payload.userId);
    if (!user) ctx.throw(401, 'User not found');
    ctx.body = generateTokens(user);
  } catch (e) {
    ctx.throw(401, 'Invalid refresh token');
  }
};
