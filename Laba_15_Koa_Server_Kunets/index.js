// Лабораторная работа №15
// Задание 1: простой HTTP-сервер на Koa.js
// Задание 2: REST API для пользователей (GET, POST, PUT, DELETE)
// Задание 3: middleware — логирование, обработка ошибок, авторизация
// Задание 4: API для студентов (CRUD + фильтрация по группе)
// Задание 5: пагинация, сортировка, поиск, автогенерация 50 студентов
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

// ===== ЗАДАНИЕ 5: Автогенерация 50 студентов =====
const FIRST_NAMES_M = ['Александр', 'Дмитрий', 'Максим', 'Иван', 'Никита', 'Артём', 'Алексей', 'Сергей', 'Андрей', 'Михаил'];
const FIRST_NAMES_F = ['Анна', 'Мария', 'Ольга', 'Екатерина', 'Дарья', 'Елена', 'Виктория', 'Алина', 'Полина', 'Ксения'];
const LAST_NAMES_M = ['Иванов', 'Петров', 'Сидоров', 'Кузнецов', 'Смирнов', 'Попов', 'Соколов', 'Лебедев', 'Козлов', 'Новиков'];
const LAST_NAMES_F = ['Иванова', 'Петрова', 'Сидорова', 'Кузнецова', 'Смирнова', 'Попова', 'Соколова', 'Лебедева', 'Козлова', 'Новикова'];
const GROUPS = ['ББМО-01-23', 'ББМО-02-23', 'ББМО-03-23', 'ИС-21', 'ИС-22', 'ПИ-21'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateStudents(count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale ? randomItem(FIRST_NAMES_M) : randomItem(FIRST_NAMES_F);
    const lastName = isMale ? randomItem(LAST_NAMES_M) : randomItem(LAST_NAMES_F);
    result.push({
      id: i + 1,
      name: `${lastName} ${firstName}`,
      group: randomItem(GROUPS),
      course: Math.floor(Math.random() * 4) + 1,
    });
  }
  return result;
}

let students = generateStudents(50);
let nextStudentId = 51;

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
  const path = url.split('?')[0];

  // ---------- Задание 1: главная страница ----------
  if (method === 'GET' && path === '/') {
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
          a { color: #3498db; display: block; margin: 8px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Лабораторная работа №15</h1>
          <p><span class="label">Группа:</span> ${GROUP}</p>
          <p><span class="label">Студент:</span> Кунец Никита</p>
          <p><span class="label">Дата и время:</span> ${now}</p>
          <p>Привет! Это HTTP-сервер на Koa.js.</p>
          <a href="/api/users">→ GET /api/users</a>
          <a href="/students?limit=5">→ GET /students?limit=5</a>
          <a href="/students?limit=5&offset=10">→ GET /students?limit=5&offset=10</a>
          <a href="/students?sort=name&limit=5">→ GET /students?sort=name&limit=5</a>
          <a href="/students?search=Ан&limit=5">→ GET /students?search=Ан&limit=5</a>
          <a href="/protected">→ GET /protected (нужна авторизация)</a>
          <a href="/error">→ GET /error (тест ошибки)</a>
        </div>
      </body>
      </html>
    `;
    return;
  }

  // ---------- Задание 3: /protected ----------
  if (method === 'GET' && path === '/protected') {
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = { message: 'Доступ разрешён', user: 'Кунец Никита', group: GROUP };
    return;
  }

  // ---------- Задание 3: /error ----------
  if (method === 'GET' && path === '/error') {
    throw new Error('Это тестовая ошибка для проверки middleware');
  }

  // ================================================================
  // ЗАДАНИЯ 4-5: API для студентов
  // ================================================================

  // ---------- GET /students — пагинация, сортировка, поиск, фильтр ----------
  if (method === 'GET' && path === '/students') {
    const query = new URL(url, `http://localhost:${PORT}`).searchParams;

    let result = [...students];

    // Фильтр по группе
    const groupFilter = query.get('group');
    if (groupFilter) {
      result = result.filter((s) => s.group === groupFilter);
    }

    // Поиск по имени (регистронезависимый)
    const search = query.get('search');
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    // Сортировка
    const sort = query.get('sort');
    if (sort) {
      const desc = sort.startsWith('-');
      const field = desc ? sort.slice(1) : sort;
      if (['name', 'group', 'course', 'id'].includes(field)) {
        result.sort((a, b) => {
          let va = a[field];
          let vb = b[field];
          if (typeof va === 'string') {
            va = va.toLowerCase();
            vb = vb.toLowerCase();
          }
          if (va < vb) return desc ? 1 : -1;
          if (va > vb) return desc ? -1 : 1;
          return 0;
        });
      }
    }

    // Пагинация
    const limit = parseInt(query.get('limit'), 10) || 10;
    const offset = parseInt(query.get('offset'), 10) || 0;
    const total = result.length;
    const paged = result.slice(offset, offset + limit);

    ctx.type = 'application/json; charset=utf-8';
    ctx.body = {
      total,
      limit,
      offset,
      count: paged.length,
      data: paged,
    };
    return;
  }

  // ---------- GET /students/:id — один студент ----------
  const getStudentMatch = path.match(/^\/students\/(\d+)$/);
  if (method === 'GET' && getStudentMatch) {
    const id = parseInt(getStudentMatch[1], 10);
    const student = students.find((s) => s.id === id);
    if (!student) {
      ctx.status = 404;
      ctx.body = { error: `Студент с id=${id} не найден` };
      return;
    }
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = student;
    return;
  }

  // ---------- POST /students — создать ----------
  if (method === 'POST' && path === '/students') {
    let body;
    try {
      body = await parseBody(ctx);
    } catch {
      ctx.status = 400;
      ctx.body = { error: 'Invalid JSON' };
      return;
    }

    if (!body.name || !body.group || body.course === undefined) {
      ctx.status = 400;
      ctx.body = { error: 'Поля name, group и course обязательны' };
      return;
    }

    if (typeof body.course !== 'number' || body.course < 1 || body.course > 6) {
      ctx.status = 400;
      ctx.body = { error: 'Поле course должно быть числом от 1 до 6' };
      return;
    }

    const newStudent = {
      id: nextStudentId++,
      name: body.name,
      group: body.group,
      course: body.course,
    };
    students.push(newStudent);
    ctx.status = 201;
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = newStudent;
    return;
  }

  // ---------- PUT /students/:id — обновить ----------
  const putStudentMatch = path.match(/^\/students\/(\d+)$/);
  if (method === 'PUT' && putStudentMatch) {
    const id = parseInt(putStudentMatch[1], 10);
    const student = students.find((s) => s.id === id);

    if (!student) {
      ctx.status = 404;
      ctx.body = { error: `Студент с id=${id} не найден` };
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

    if (body.name !== undefined) student.name = body.name;
    if (body.group !== undefined) student.group = body.group;
    if (body.course !== undefined) {
      if (typeof body.course !== 'number' || body.course < 1 || body.course > 6) {
        ctx.status = 400;
        ctx.body = { error: 'Поле course должно быть числом от 1 до 6' };
        return;
      }
      student.course = body.course;
    }

    ctx.type = 'application/json; charset=utf-8';
    ctx.body = student;
    return;
  }

  // ---------- DELETE /students/:id — удалить ----------
  const delStudentMatch = path.match(/^\/students\/(\d+)$/);
  if (method === 'DELETE' && delStudentMatch) {
    const id = parseInt(delStudentMatch[1], 10);
    const index = students.findIndex((s) => s.id === id);

    if (index === -1) {
      ctx.status = 404;
      ctx.body = { error: `Студент с id=${id} не найден` };
      return;
    }

    const deleted = students.splice(index, 1)[0];
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = { message: `Студент с id=${id} удалён`, student: deleted };
    return;
  }

  // ================================================================
  // ЗАДАНИЕ 2: API для пользователей
  // ================================================================

  if (method === 'GET' && path === '/api/users') {
    ctx.type = 'application/json; charset=utf-8';
    ctx.body = users;
    return;
  }

  const getMatch = path.match(/^\/api\/users\/(\d+)$/);
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

  if (method === 'POST' && path === '/api/users') {
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

  const putMatch = path.match(/^\/api\/users\/(\d+)$/);
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

  const delMatch = path.match(/^\/api\/users\/(\d+)$/);
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

  // ---------- 404 ----------
  ctx.status = 404;
  ctx.body = { error: 'Not found' };
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Открой: http://localhost:${PORT}`);
  console.log(`Студенты (50 шт): http://localhost:${PORT}/students`);
});