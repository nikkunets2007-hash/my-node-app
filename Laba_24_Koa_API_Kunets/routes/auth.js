// Маршруты аутентификации
const Router = require('@koa/router');
const controller = require('../controllers/authController');

const router = new Router({ prefix: '/api/auth' });

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/refresh', controller.refresh);

module.exports = router;
