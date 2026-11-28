// Лабораторная работа №24, Задание 2 (MVC)
// Студент: Кунец Никита, группа 401

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const dbMiddleware = require('./middleware/db');
const errorMiddleware = require('./middleware/error');
const loggerMiddleware = require('./middleware/logger');
const usersRouter = require('./routes/users');
const { connectDB, closeDB } = require('./db');

const GROUP = '401';
const PORT = process.env.PORT || 3000;

const app = new Koa();

app.use(errorMiddleware);
app.use(loggerMiddleware);
app.use(async (ctx, next) => {
  ctx.set('X-Group', GROUP);
  await next();
});
app.use(dbMiddleware);
app.use(bodyParser());

app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[INFO] Koa-сервер на порту ${PORT}`);
      console.log(`[INFO] Группа: ${GROUP}`);
    });
  } catch (err) {
    console.error('[FATAL]', err.message);
    process.exit(1);
  }
})();

process.on('SIGINT', async () => {
  console.log('\n[INFO] Завершение работы...');
  await closeDB();
  process.exit(0);
});
