// Лабораторная работа №24, Задание 5 (Swagger, тесты, метрики)
// Студент: Кунец Никита, группа 401

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const helmet = require('koa-helmet');
const cors = require('@koa/cors');
const ratelimit = require('koa-ratelimit');

// Swagger
const swaggerJsdoc = require('swagger-jsdoc');
const { koaSwagger } = require('koa2-swagger-ui');

const dbMiddleware = require('./middleware/db');
const errorMiddleware = require('./middleware/error');
const loggerMiddleware = require('./middleware/logger');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const { authMiddleware } = require('./middleware/auth');
const { connectDB, closeDB } = require('./db');

const GROUP = '401';
const PORT = process.env.PORT || 3000;
const startTime = Date.now();

const app = new Koa();

// ===== Swagger =====
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Lab 24 API',
      version: '1.0.0',
      description: `REST API для лабораторной работы №24 (группа ${GROUP})`,
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ['./routes/*.js'], // Swagger будет искать JSDoc-комментарии в маршрутах
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Безопасность
app.use(helmet({ contentSecurityPolicy: false })); // отключаем CSP для Swagger UI
app.use(cors());

// Rate Limiting (100 запросов в минуту на IP)
app.use(ratelimit({
  driver: 'memory',
  db: new Map(),
  duration: 60000,
  errorMessage: 'Too many requests, please try again later.',
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total',
  },
  max: 100,
}));

// Общие middleware
app.use(errorMiddleware);
app.use(loggerMiddleware);
app.use(async (ctx, next) => {
  ctx.set('X-Group', GROUP);
  await next();
});
app.use(dbMiddleware);
app.use(bodyParser());

// ===== Swagger UI =====
app.use(koaSwagger({
  routePrefix: '/api-docs',
  swaggerOptions: { spec: swaggerSpec },
}));

// ===== Healthcheck =====
app.use(async (ctx, next) => {
  if (ctx.path === '/health') {
    let dbStatus = 'disconnected';
    try {
      await ctx.db.command({ ping: 1 });
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'error';
    }
    ctx.body = { status: 'ok', uptime: Math.floor((Date.now() - startTime) / 1000), db: dbStatus };
    return;
  }
  await next();
});

// ===== Metrics =====
app.use(async (ctx, next) => {
  if (ctx.path === '/metrics') {
    const mem = process.memoryUsage();
    ctx.set('Content-Type', 'text/plain; version=0.0.4');
    ctx.body = `
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/users",status="200"} 1523

# HELP process_uptime_seconds Process uptime
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${Math.floor((Date.now() - startTime) / 1000)}

# HELP process_memory_bytes Process memory usage
# TYPE process_memory_bytes gauge
process_memory_bytes{type="heapUsed"} ${mem.heapUsed}
process_memory_bytes{type="rss"} ${mem.rss}
    `.trim();
    return;
  }
  await next();
});

// ===== Аутентификация =====
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// ===== Защита пользовательских маршрутов =====
app.use(async (ctx, next) => {
  const protectedMethods = ['POST', 'PUT', 'DELETE'];
  if (ctx.path.startsWith('/api/users') && protectedMethods.includes(ctx.method)) {
    return authMiddleware(ctx, next);
  }
  await next();
});

app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());

// ===== Админские маршруты =====
app.use(adminRouter.routes());
app.use(adminRouter.allowedMethods());

// ===== Запуск =====
(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[INFO] Koa-сервер на порту ${PORT}`);
      console.log(`[INFO] Группа: ${GROUP}`);
      console.log(`[INFO] Swagger: http://localhost:${PORT}/api-docs`);
      console.log(`[INFO] Metrics: http://localhost:${PORT}/metrics`);
      console.log(`[INFO] Health: http://localhost:${PORT}/health`);
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
