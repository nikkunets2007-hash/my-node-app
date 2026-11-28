// Централизованная обработка ошибок
module.exports = async (ctx, next) => {
  try {
    await next();
    if (ctx.status === 404) {
      ctx.status = 404;
      ctx.body = { error: 'Not Found' };
    }
  } catch (err) {
    const status = err.status || 500;
    ctx.status = status;
    ctx.body = {
      error: err.message || 'Internal Server Error',
      details: err.details || undefined,
    };
    if (status >= 500) console.error('[ERROR]', err);
  }
};
