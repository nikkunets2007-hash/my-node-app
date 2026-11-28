// Маршруты пользователей (с JSDoc для Swagger)
const Router = require('@koa/router');
const controller = require('../controllers/userController');

const router = new Router({ prefix: '/api/users' });

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Список пользователей (с пагинацией)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [name, -name, age, -age] }
 *     responses:
 *       200:
 *         description: Список пользователей
 *   post:
 *     summary: Создать пользователя
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               group_name: { type: string }
 *               age: { type: integer }
 *     responses:
 *       201:
 *         description: Создан
 */
router.get('/', controller.list);
router.post('/', controller.create);

/**
 * @openapi
 * /api/users/search:
 *   get:
 *     summary: Поиск по имени/email
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Результаты поиска
 */
router.get('/search', controller.search);

/**
 * @openapi
 * /api/users/stats:
 *   get:
 *     summary: Статистика (агрегация)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Статистика
 */
router.get('/stats', controller.stats);

/**
 * @openapi
 * /api/users/export:
 *   get:
 *     summary: Экспорт в CSV
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: CSV файл
 */
router.get('/export', controller.exportCsv);

router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
