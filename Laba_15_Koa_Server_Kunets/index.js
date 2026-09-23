// Лабораторная работа №15, Задание 1
// Простой HTTP-сервер на Koa.js
const Koa = require('koa');
const app = new Koa();

const PORT = 3000;
const GROUP = '401';

app.use(async (ctx) => {
  const now = new Date().toLocaleString('ru-RU');

  ctx.type = 'text/html; charset=utf-8';
  ctx.body = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Лабораторная работа №15</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; text-align: center; }
        .card { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; }
        p { font-size: 18px; color: #333; }
        .label { color: #7f8c8d; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Лабораторная работа №15</h1>
        <p><span class="label">Группа:</span> ${GROUP}</p>
        <p><span class="label">Студент:</span> Кунец Никита</p>
        <p><span class="label">Дата и время:</span> ${now}</p>
        <p>Привет! Это простой HTTP-сервер на Koa.js.</p>
      </div>
    </body>
    </html>
  `;
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Открой: http://localhost:${PORT}`);
});