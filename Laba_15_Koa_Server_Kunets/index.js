// Лабораторная работа №15
// Задание 1: простой HTTP-сервер на Koa.js
// Задание 2: REST API для пользователей (GET, POST, PUT, DELETE)
// Задание 3: middleware — логирование, обработка ошибок, авторизация
// Студент: Кунец Никита, группа 401

const Koa = require('koa');
const app = new Koa();

const PORT = 3000;
const GROUP = '401';

// ===== Хранилище пользователей (в памяти) =====
let users = [
  { id: 1, name: 'Кунец Никита', group: '401' },
  { id: 2, name: 'Челей Максим', group: '401' },
];
let nextId = 3;

// ===== Вспомогательная функция: парсинг JSON-тела =====
function parseBody(ctx) {
  return new Promise((resolve, reject) => {
    let data = '';
    ctx.req.on('data', (chunk) => (data += chunk));
    ctx.req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    ctx.req.on('error', reject);
  });
}

// ===== ЗАДАНИЕ 3.1: Middleware логирования =====
app.use(async (ctx, next) => {
  const start = Date.now();
  const time = new Date().toLocaleString('ru-RU', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  await next();

  const ms = Date.now() - start;
  console.log(`[${time}] ${ctx.method} ${ctx.url} - ${ms}ms`);
});

// ===== ЗАДАНИЕ 3.2: Middleware обработки ошибок =====
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    const status = err.status || 500;
    ctx.status = status;
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = {
      error: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
      status,
    };
    console.error(`Ошибка: ${err.message}`);
  }
});

// ===== ЗАДАНИЕ 3.3: Middleware авторизации =====
app.use(async (ctx, next) => {
  if (ctx.url === '/protected') {
    const auth = ctx.headers['authorization'];
    if (!auth) {
      ctx.status = 401;
      ctx.type = 'application/json; charset=utf-8';
      ctx.body = { error: 'Требуется авторизация', status: 401 };
      return;
    }
  }
  await next();
});

// ===== Middleware CORS =====
app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204;
    return;
  }
  await next();
});

// ===== Главный роутер =====
app.use(async (ctx) => {
  const { method, url } = ctx;

  // ---------- Задание 1: главная страница ----------
  if (method === 'GET' && url === '/') {
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
          a { color: #3498db; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Лабораторная работа №15</h1>
          <p><span class="label">Группа:</span> ${GROUP}</p>
          <p><span class="label">Студент:</span> Кунец Никита</p>
          <p><span class="label">Дата и время:</span> ${now}</p>
          <p>Привет! Это HTTP-сервер на Koa.js.</p>
          <p><a href="/api/users">→ GET /api/users</a></p>
          <p><a href="/protected">→ GET /protected (нужна авторизация)</a></p>
          <p><a href="/error">→ GET /error (тест ошибки)</a></p>
        </div>
      </body>
      </html>
    `;
    return;
  }

  // ---------- Задание 3: /protected — только с авторизацией ----------
  if (method === 'GET' && url === '/protected') {
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = {
      message: 'Доступ разрешён',
      user: 'Кунец Никита',
      group: GROUP,
    };
    return;
  }

  // ---------- Задание 3: /error — намеренная ошибка ----------
  if (method === 'GET' && url === '/error') {
    throw new Error('Это тестовая ошибка для проверки middleware');
  }

  // ---------- Задание 2: GET /api/users — список всех ----------
  if (method === 'GET' && url === '/api/users') {
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = users;
    return;
  }

  // ---------- Задание 2: GET /api/users/:id — один пользователь ----------
  const getMatch = url.match(/^\/api\/users\/(\d+)$/);
  if (method === 'GET' && getMatch) {
    const id = parseInt(getMatch[1], 10);
    const user = users.find((u) => u.id === id);
    if (!user) {
      ctx.status = 404;
      ctx.body = { error: `Пользователь с id=${id} не найден` };
      return;
    }
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = user;
    return;
  }

  // ---------- Задание 2: POST /api/users — создать ----------
  if (method === 'POST' && url === '/api/users') {
    let body;
    try {
      body = await parseBody(ctx);
    } catch {
      ctx.status = 400;
      ctx.body = { error: 'Invalid JSON' };
      return;
    }

    if (!body.name || !body.group) {
      ctx.status = 400;
      ctx.body = { error: 'Поля name и group обязательны' };
      return;
    }

    const newUser = { id: nextId++, name: body.name, group: body.group };
    users.push(newUser);
    ctx.status = 201;
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = newUser;
    return;
  }

  // ---------- Задание 2: PUT /api/users/:id — обновить ----------
  const putMatch = url.match(/^\/api\/users\/(\d+)$/);
  if (method === 'PUT' && putMatch) {
    const id = parseInt(putMatch[1], 10);
    const user = users.find((u) => u.id === id);

    if (!user) {
      ctx.status = 404;
      ctx.body = { error: `Пользователь с id=${id} не найден` };
      return;
    }

    let body;
    try {
      body = await parseBody(ctx);
    } catch {
      ctx.status = 400;
      ctx.body = { error: 'Invalid JSON' };
      return;
    }

    if (!body.name || !body.group) {
      ctx.status = 400;
      ctx.body = { error: 'Поля name и group обязательны' };
      return;
    }

    user.name = body.name;
    user.group = body.group;
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = user;
    return;
  }

  // ---------- Задание 2: DELETE /api/users/:id — удалить ----------
  const delMatch = url.match(/^\/api\/users\/(\d+)$/);
  if (method === 'DELETE' && delMatch) {
    const id = parseInt(delMatch[1], 10);
    const index = users.findIndex((u) => u.id === id);

    if (index === -1) {
      ctx.status = 404;
      ctx.body = { error: `Пользователь с id=${id} не найден` };
      return;
    }

    const deleted = users.splice(index, 1)[0];
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = { message: `Пользователь с id=${id} удалён`, user: deleted };
    return;
  }

  // ---------- 404 для всего остального ----------
  ctx.status = 404;
  ctx.body = { error: 'Not found' };
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Открой: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/users`);
});