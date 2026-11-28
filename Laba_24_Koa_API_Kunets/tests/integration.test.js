// Интеграционные тесты для контроллера (без БД)
const Joi = require('joi');

describe('Integration: validation', () => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
  });

  test('валидные данные проходят', () => {
    const { error } = schema.validate({ name: 'Иван', email: 'ivan@example.com' });
    expect(error).toBeUndefined();
  });

  test('невалидный email — ошибка', () => {
    const { error } = schema.validate({ name: 'Иван', email: 'invalid' });
    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe('email');
  });

  test('слишком короткое имя — ошибка', () => {
    const { error } = schema.validate({ name: 'П', email: 'ivan@example.com' });
    expect(error).toBeDefined();
    expect(error.details[0].path[0]).toBe('name');
  });
});
