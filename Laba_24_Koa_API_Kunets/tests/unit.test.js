// Юнит-тесты для middleware
const errorMiddleware = require('../middleware/error');
const loggerMiddleware = require('../middleware/logger');

describe('Unit: errorMiddleware', () => {
  test('должен пропускать успешный запрос', async () => {
    const ctx = { status: 200 };
    const next = async () => { ctx.status = 200; };
    await errorMiddleware(ctx, next);
    expect(ctx.status).toBe(200);
  });

  test('должен обрабатывать 404', async () => {
    const ctx = { status: 404 };
    const next = async () => {};
    await errorMiddleware(ctx, next);
    expect(ctx.body).toEqual({ error: 'Not Found' });
  });
});

describe('Unit: loggerMiddleware', () => {
  test('должен вызывать next', async () => {
    const ctx = { method: 'GET', url: '/test', status: 200 };
    let called = false;
    const next = async () => { called = true; };
    await loggerMiddleware(ctx, next);
    expect(called).toBe(true);
  });
});
