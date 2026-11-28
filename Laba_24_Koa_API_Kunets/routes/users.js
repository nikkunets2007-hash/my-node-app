// Маршруты пользователей
const Router = require('@koa/router');
const controller = require('../controllers/userController');

const router = new Router({ prefix: '/api/users' });

router.get('/', controller.list);
router.get('/search', controller.search);
router.get('/stats', controller.stats);
router.get('/export', controller.exportCsv);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
