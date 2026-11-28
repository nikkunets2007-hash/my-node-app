// Middleware: проверка JWT и ролей
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_401';

exports.authMiddleware = async (ctx, next) => {
  console.log('[AUTH] Проверка токена для:', ctx.method, ctx.path);
  const authHeader = ctx.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[AUTH] Нет токена');
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized', status: 401 };
    return;
  }
  const token = authHeader.split(' ')[1];
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    console.log('[AUTH] Ошибка JWT:', e.message);
    ctx.status = 401;
    ctx.body = { error: 'Invalid or expired token', status: 401 };
    return;
  }
  console.log('[AUTH] Токен валиден, userId:', payload.userId);
  ctx.user = payload;

  // Важно: next() вызываем ВНЕ try/catch, чтобы ошибки бизнес-логики не превращались в 401
  await next();
};

exports.requireRole = (role) => async (ctx, next) => {
  if (!ctx.user || ctx.user.role !== role) {
    ctx.status = 403;
    ctx.body = { error: `Forbidden: ${role} role required`, status: 403 };
    return;
  }
  await next();
};
