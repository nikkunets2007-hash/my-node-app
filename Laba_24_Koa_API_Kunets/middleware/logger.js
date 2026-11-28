// Логирование запросов
module.exports = async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[LOG] ${ctx.method} ${ctx.url} ${ctx.status} (${ms}ms)`);
};
