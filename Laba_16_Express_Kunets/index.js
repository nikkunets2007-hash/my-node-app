// Лабораторная работа №16
// Задание 1: простой HTTP-сервер на Express.js
// Задание 2: REST API для книг (GET, POST, PUT, DELETE, поиск)
// Задание 3: middleware — логирование, сжатие, rate limit, обработка ошибок
// Студент: Кунец Никита, группа 401

const express = require('express');
const compression = require('compression');
const app = express();

const PORT = 3000;
const GROUP = '401';

// ===== Middleware для парсинга JSON-тела =====
app.use(express.json());

// ===== ЗАДАНИЕ 3.1: Middleware логирования (с статусом ответа) =====
app.use((req, res, next) => {
  const start = Date.now();
  const timeStart = new Date().toLocaleString('ru-RU');
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${timeStart}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${ms}ms`);
  });
  next();
});

// ===== ЗАДАНИЕ 3.2: Middleware сжатия (gzip/deflate) =====
app.use(compression());

// ===== ЗАДАНИЕ 3.3: Middleware Rate Limiter (100 req/min на IP) =====
const rateLimitStore = new Map();
const RATE_LIMIT = 100;
const WINDOW_MS = 60 * 1000;

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    const entry = rateLimitStore.get(ip);
    if (now > entry.resetAt) {
      entry.count = 1;
      entry.resetAt = now + WINDOW_MS;
    } else {
      entry.count++;
    }
  }

  const entry = rateLimitStore.get(ip);
  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  const resetSec = Math.ceil((entry.resetAt - now) / 1000);

  res.set('X-RateLimit-Limit', RATE_LIMIT);
  res.set('X-RateLimit-Remaining', remaining);
  res.set('X-RateLimit-Reset', resetSec);

  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({
      error: 'Too Many Requests',
      status: 429,
      retryAfter: resetSec,
    });
  }

  next();
});

// ===== Хранилище книг (в памяти) =====
let books = [
  { id: 1, title: 'Война и мир', author: 'Толстой', year: 1869 },
  { id: 2, title: 'Преступление и наказание', author: 'Достоевский', year: 1866 },
  { id: 3, title: 'Мастер и Маргарита', author: 'Булгаков', year: 1967 },
];
let nextBookId = 4;

// ================================================================
// ЗАДАНИЕ 1: базовые страницы
// ================================================================

// ---------- Главная ----------
app.get('/', (req, res) => {
  const now = new Date().toLocaleString('ru-RU');
  res.type('text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Лабораторная работа №16</title>
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
        <h1>Лабораторная работа №16</h1>
        <p><span class="label">Группа:</span> ${GROUP}</p>
        <p><span class="label">Студент:</span> Кунец Никита</p>
        <p><span class="label">Дата и время:</span> ${now}</p>
        <p>Привет! Это HTTP-сервер на Express.js.</p>
        <p><b>Доступные маршруты:</b></p>
        <a href="/about">→ /about</a>
        <a href="/contacts">→ /contacts</a>
        <a href="/api/books">→ /api/books (JSON)</a>
        <a href="/api/books/search?author=Толстой">→ /api/books/search?author=Толстой</a>
        <a href="/error">→ /error (тест синхронной ошибки)</a>
        <a href="/async-error">→ /async-error (тест асинхронной ошибки)</a>
      </div>
    </body>
    </html>
  `);
});

// ---------- /about ----------
app.get('/about', (req, res) => {
  res.type('text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head><meta charset="UTF-8"><title>О разработчике</title>
    <style>body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; text-align: center; }
    .card { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; }
    h1 { color: #2c3e50; } p { font-size: 18px; } .label { color: #7f8c8d; } a { color: #3498db; }</style></head>
    <body>
      <div class="card">
        <h1>О разработчике</h1>
        <p><span class="label">ФИО:</span> Кунец Никита</p>
        <p><span class="label">Группа:</span> ${GROUP}</p>
        <p><span class="label">Лабораторная:</span> №16 (Express.js)</p>
        <p><a href="/">← На главную</a></p>
      </div>
    </body>
    </html>
  `);
});

// ---------- /contacts ----------
app.get('/contacts', (req, res) => {
  res.type('text/html; charset=utf-8');
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head><meta charset="UTF-8"><title>Контакты</title>
    <style>body { font-family: Arial, sans-serif; padding: 40px; background: #f5f5f5; text-align: center; }
    .card { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; }
    h1 { color: #2c3e50; } p { font-size: 18px; } .label { color: #7f8c8d; } a { color: #3498db; }</style></head>
    <body>
      <div class="card">
        <h1>Контакты</h1>
        <p><span class="label">Email:</span> kunets@example.com</p>
        <p><span class="label">GitHub:</span> nikkunets2007-hash</p>
        <p><a href="/">← На главную</a></p>
      </div>
    </body>
    </html>
  `);
});

// ================================================================
// ЗАДАНИЕ 2: REST API для книг
// ================================================================

// ---------- GET /api/books/search?author=Толстой ----------
// ⚠️ ВАЖНО: этот роут должен идти ДО /api/books/:id
app.get('/api/books/search', (req, res) => {
  const author = req.query.author;
  if (!author) {
    return res.status(400).json({ error: 'Параметр author обязателен' });
  }
  const result = books.filter(
    (b) => b.author.toLowerCase() === author.toLowerCase()
  );
  res.json(result);
});

// ---------- GET /api/books — список всех ----------
app.get('/api/books', (req, res) => {
  res.json(books);
});

// ---------- GET /api/books/:id — одна книга ----------
app.get('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find((b) => b.id === id);
  if (!book) {
    return res.status(404).json({ error: `Книга с id=${id} не найдена` });
  }
  res.json(book);
});

// ---------- POST /api/books — создать ----------
app.post('/api/books', (req, res) => {
  const { title, author, year } = req.body;

  if (!title || !author || year === undefined) {
    return res.status(400).json({ error: 'Поля title, author и year обязательны' });
  }
  if (typeof year !== 'number' || year < 0) {
    return res.status(400).json({ error: 'Поле year должно быть положительным числом' });
  }

  const newBook = { id: nextBookId++, title, author, year };
  books.push(newBook);
  res.status(201).json(newBook);
});

// ---------- PUT /api/books/:id — обновить ----------
app.put('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const book = books.find((b) => b.id === id);

  if (!book) {
    return res.status(404).json({ error: `Книга с id=${id} не найдена` });
  }

  const { title, author, year } = req.body;

  if (title !== undefined) book.title = title;
  if (author !== undefined) book.author = author;
  if (year !== undefined) {
    if (typeof year !== 'number' || year < 0) {
      return res.status(400).json({ error: 'Поле year должно быть положительным числом' });
    }
    book.year = year;
  }

  res.json(book);
});

// ---------- DELETE /api/books/:id — удалить ----------
app.delete('/api/books/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = books.findIndex((b) => b.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Книга с id=${id} не найдена` });
  }

  const deleted = books.splice(index, 1)[0];
  res.json({ message: `Книга с id=${id} удалена`, book: deleted });
});

// ================================================================
// ЗАДАНИЕ 3.5: Тестовые роуты для ошибок
// ================================================================

// ---------- /error — синхронная ошибка ----------
app.get('/error', (req, res, next) => {
  throw new Error('Это тестовая синхронная ошибка');
});

// ---------- /async-error — асинхронная ошибка ----------
app.get('/async-error', async (req, res, next) => {
  try {
    await new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Это тестовая асинхронная ошибка')), 100)
    );
  } catch (err) {
    next(err);
  }
});

// ================================================================
// ЗАДАНИЕ 3.4: Централизованный обработчик ошибок
// (должен идти ПОСЛЕ всех роутов)
// ================================================================
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`Ошибка: ${err.message}`);
  res.status(status).json({
    error: status === 500 ? 'Внутренняя ошибка сервера' : err.message,
    status,
  });
});

// ===== 404 для всего остального =====
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', status: 404 });
});

// ===== Запуск =====
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Открой: http://localhost:${PORT}`);
  console.log(`API книг: http://localhost:${PORT}/api/books`);
});