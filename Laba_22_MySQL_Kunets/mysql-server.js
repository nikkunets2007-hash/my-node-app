// Лабораторная работа №22, Задание 5
// Koa.js + MySQL REST API с транзакциями, кэшем и метриками
// Студент: Кунец Никита, группа 401

require('dotenv').config();
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const mysql = require('mysql2/promise');
const fs = require('fs');

const GROUP = '401';
const PORT = 3000;

// ===== Пул =====
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

// ===== Кэш =====
const cache = new Map();
const CACHE_TTL = 60_000;

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return e.value;
}
function cacheSet(key, value) {
  cache.set(key, { value, at: Date.now() });
}
function cacheInvalidate() {
  cache.clear();
}

// ===== Метрики =====
const metrics = { queries: 0, totalTime: 0, errors: 0, cacheHits: 0, cacheMisses: 0 };

async function trackedQuery(sql, params = []) {
  const start = Date.now();
  try {
    const [rows] = await pool.execute(sql, params);
    metrics.queries++;
    metrics.totalTime += Date.now() - start;
    return rows;
  } catch (e) {
    metrics.errors++;
    throw e;
  }
}

// ===== Миграции =====
async function runMigrations() {
  console.log('[INFO] Запуск миграций...');
  await pool.query(`CREATE TABLE IF NOT EXISTS migrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  const migrations = [
    {
      name: '001_create_students',
      sql: `CREATE TABLE IF NOT EXISTS students (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        group_name VARCHAR(20) NOT NULL,
        course INT NOT NULL,
        grade DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
    {
      name: '002_create_groups',
      sql: `CREATE TABLE IF NOT EXISTS groups_table (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(20) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    },
  ];

  let applied = 0;
  for (const m of migrations) {
    const [existing] = await pool.execute('SELECT id FROM migrations WHERE name = ?', [m.name]);
    if (existing.length === 0) {
      await pool.query(m.sql);
      await pool.execute('INSERT INTO migrations (name) VALUES (?)', [m.name]);
      applied++;
      console.log(`[INFO] Применена миграция: ${m.name}`);
    }
  }
  console.log(`[INFO] Миграции применены: ${applied}`);
}

// ===== Koa =====
const app = new Koa();
const router = new Router();

app.use(async (ctx, next) => {
  const start = Date.now();
  try {
    await next();
  } finally {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] [${GROUP}] ${ctx.method} ${ctx.url} ${ctx.status} (${ms}ms)`);
  }
});
app.use(bodyParser());

// ===== GET /api/students =====
router.get('/api/students', async (ctx) => {
  const limit = Math.min(Number(ctx.query.limit) || 10, 100);
  const offset = Number(ctx.query.offset) || 0;
  const cacheKey = `students:${limit}:${offset}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    metrics.cacheHits++;
    ctx.body = cached;
    return;
  }
  metrics.cacheMisses++;

  const [countRow] = await pool.execute('SELECT COUNT(*) AS total FROM students');
  const total = countRow[0].total;
  const rows = await trackedQuery(
    `SELECT id, name, group_name, course, grade FROM students ORDER BY id LIMIT ${limit} OFFSET ${offset}`
  );

  const result = {
    data: rows,
    pagination: { total, limit, offset, pages: Math.ceil(total / limit) },
  };
  cacheSet(cacheKey, result);
  ctx.body = result;
});

// ===== GET /api/students/stats =====
router.get('/api/students/stats', async (ctx) => {
  const cached = cacheGet('stats');
  if (cached) {
    metrics.cacheHits++;
    ctx.body = cached;
    return;
  }
  metrics.cacheMisses++;

  const [totalRow] = await pool.query('SELECT COUNT(*) AS total FROM students');
  const [avgRow] = await pool.query('SELECT AVG(grade) AS avg_grade FROM students');
  const [byGroup] = await pool.query(
    'SELECT group_name, COUNT(*) AS cnt FROM students GROUP BY group_name'
  );
  const result = {
    total: totalRow[0].total,
    averageGrade: Number(avgRow[0].avg_grade || 0).toFixed(2),
    byGroup: Object.fromEntries(byGroup.map((g) => [g.group_name, g.cnt])),
  };
  cacheSet('stats', result);
  ctx.body = result;
});

// ===== GET /api/students/:id =====
router.get('/api/students/:id', async (ctx) => {
  const rows = await trackedQuery(
    'SELECT id, name, group_name, course, grade FROM students WHERE id = ?',
    [ctx.params.id]
  );
  if (!rows.length) ctx.throw(404, 'Student not found');
  ctx.body = rows[0];
});

// ===== POST /api/students =====
router.post('/api/students', async (ctx) => {
  const { name, group_name, course, grade } = ctx.request.body || {};
  if (!name || !group_name) ctx.throw(400, 'name and group_name are required');
  const [r] = await pool.execute(
    'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
    [name, group_name, course || 1, grade ?? null]
  );
  cacheInvalidate();
  ctx.status = 201;
  ctx.body = { id: r.insertId, name, group_name, course, grade };
});

// ===== POST /api/students/batch (транзакция) =====
router.post('/api/students/batch', async (ctx) => {
  const students = ctx.request.body;
  if (!Array.isArray(students)) ctx.throw(400, 'Body must be an array');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const created = [];
    for (const s of students) {
      if (!s.name || !s.group_name) throw new Error('name and group_name required');
      const [r] = await conn.execute(
        'INSERT INTO students (name, group_name, course, grade) VALUES (?, ?, ?, ?)',
        [s.name, s.group_name, s.course || 1, s.grade ?? null]
      );
      created.push({ id: r.insertId, ...s });
    }
    await conn.commit();
    cacheInvalidate();
    ctx.body = { created: created.length, transaction: 'committed', data: created };
  } catch (e) {
    await conn.rollback();
    cacheInvalidate();
    ctx.status = 400;
    ctx.body = { error: e.message, transaction: 'rolled back' };
  } finally {
    conn.release();
  }
});

// ===== PUT /api/students/:id =====
router.put('/api/students/:id', async (ctx) => {
  const { name, group_name, course, grade } = ctx.request.body || {};
  const fields = [];
  const params = [];
  if (name) { fields.push('name = ?'); params.push(name); }
  if (group_name) { fields.push('group_name = ?'); params.push(group_name); }
  if (course) { fields.push('course = ?'); params.push(course); }
  if (grade !== undefined) { fields.push('grade = ?'); params.push(grade); }
  if (!fields.length) ctx.throw(400, 'No fields to update');
  params.push(ctx.params.id);
  const [r] = await pool.execute(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, params);
  if (!r.affectedRows) ctx.throw(404, 'Student not found');
  cacheInvalidate();
  ctx.body = { updated: true, id: Number(ctx.params.id) };
});

// ===== DELETE /api/students/:id =====
router.delete('/api/students/:id', async (ctx) => {
  const [r] = await pool.execute('DELETE FROM students WHERE id = ?', [ctx.params.id]);
  if (!r.affectedRows) ctx.throw(404, 'Student not found');
  cacheInvalidate();
  ctx.body = { deleted: true, id: Number(ctx.params.id) };
});

// ===== GET /api/groups =====
router.get('/api/groups', async (ctx) => {
  const rows = await pool.query(
    'SELECT group_name AS name, COUNT(*) AS students FROM students GROUP BY group_name'
  );
  ctx.body = rows[0];
});

// ===== GET /api/groups/:id/students =====
router.get('/api/groups/:id/students', async (ctx) => {
  const rows = await trackedQuery(
    'SELECT * FROM students WHERE group_name = ?',
    [ctx.params.id]
  );
  ctx.body = rows;
});

// ===== GET /api/cache/stats =====
router.get('/api/cache/stats', async (ctx) => {
  const total = metrics.cacheHits + metrics.cacheMisses;
  ctx.body = {
    size: cache.size,
    hits: metrics.cacheHits,
    misses: metrics.cacheMisses,
    hitRate: total ? (metrics.cacheHits / total).toFixed(2) : 0,
  };
});

// ===== GET /api/metrics =====
router.get('/api/metrics', async (ctx) => {
  const total = metrics.cacheHits + metrics.cacheMisses;
  ctx.body = {
    queries: metrics.queries,
    avgTime: metrics.queries ? (metrics.totalTime / metrics.queries).toFixed(2) : 0,
    errors: metrics.errors,
    cacheHitRate: total ? Number((metrics.cacheHits / total).toFixed(2)) : 0,
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

// ===== Обработка ошибок =====
app.on('error', (err, ctx) => {
  console.error('[ERROR]', err.message);
});

// ===== Старт =====
(async () => {
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`[INFO] Koa-сервер запущен на порту ${PORT}`);
    console.log(`[INFO] Группа: ${GROUP}`);
  });
})();
