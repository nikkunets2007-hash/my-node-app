// Админские маршруты (только для role=admin)
const Router = require('@koa/router');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = new Router({ prefix: '/api/admin' });

router.get('/users', authMiddleware, requireRole('admin'), async (ctx) => {
  const users = await ctx.db.collection('users').find({}).toArray();
  ctx.body = { data: users };
});

module.exports = router;
