// Лабораторная работа №20, Задание 4
// Маршрутизация на request.url и request.method, REST API
// Студент: Кунец Никита, группа 401

const http = require('http');

const GROUP = '401';
const PORT = 3000;

let students = [
  { id: 1, name: 'Иван', group: GROUP },
  { id: 2, name: 'Мария', group: GROUP },
];
let nextId = 3;

const routes = [
  { method: 'GET', pattern: /^\/api\/students$/, handler: listStudents },
  { method: 'GET', pattern: /^\/api\/students\/(\d+)$/, handler: getStudent },
  { method: 'POST', pattern: /^\/api\/students$/, handler: createStudent },
  { method: 'PUT', pattern: /^\/api\/students\/(\d+)$/, handler: updateStudent },
  { method: 'DELETE', pattern: /^\/api\/students\/(\d+)$/, handler: deleteStudent },
];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function sendJSON(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data, null, 2));
}

function listStudents(req, res, query) {
  let result = students;
  if (query.group) result = result.filter((s) => s.group === query.group);
  sendJSON(res, 200, result);
}

function getStudent(req, res, query, params) {
  const id = Number(params[0]);
  const s = students.find((x) => x.id === id);
  if (!s) return sendJSON(res, 404, { error: 'Not found' });
  sendJSON(res, 200, s);
}

async function createStudent(req, res) {
  const body = await readBody(req);
  const data = JSON.parse(body || '{}');
  const s = { id: nextId++, name: data.name || 'Безымянный', group: data.group || GROUP };
  students.push(s);
  sendJSON(res, 201, s);
}

async function updateStudent(req, res, query, params) {
  const id = Number(params[0]);
  const s = students.find((x) => x.id === id);
  if (!s) return sendJSON(res, 404, { error: 'Not found' });
  const body = await readBody(req);
  const data = JSON.parse(body || '{}');
  if (data.name) s.name = data.name;
  if (data.group) s.group = data.group;
  sendJSON(res, 200, s);
}

function deleteStudent(req, res, query, params) {
  const id = Number(params[0]);
  const idx = students.findIndex((x) => x.id === id);
  if (idx === -1) return sendJSON(res, 404, { error: 'Not found' });
  students.splice(idx, 1);
  sendJSON(res, 200, { deleted: true, id });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const path = u.pathname;
  const query = Object.fromEntries(u.searchParams);

  let matchedPath = false;
  for (const route of routes) {
    const m = path.match(route.pattern);
    if (!m) continue;
    matchedPath = true;
    if (route.method !== req.method) continue;
    res.setHeader('X-Group', GROUP);
    await route.handler(req, res, query, m.slice(1));
    console.log(`[${new Date().toISOString()}] [${GROUP}] ${req.method} ${req.url} ${res.statusCode}`);
    return;
  }

  res.setHeader('X-Group', GROUP);
  if (matchedPath) {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('405 Method Not Allowed');
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('404 Not Found');
  }
  console.log(`[${new Date().toISOString()}] [${GROUP}] ${req.method} ${req.url} ${res.statusCode}`);
});

server.listen(PORT, () => {
  console.log(`Router-сервер на порту ${PORT}. REST API /api/students`);
});
