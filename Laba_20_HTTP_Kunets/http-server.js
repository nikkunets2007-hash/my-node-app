// Лабораторная работа №20, Задание 1
// Простой HTTP-сервер на чистом модуле http
// Студент: Кунец Никита, группа 401

const http = require('http');

const GROUP = '401';
const PORT = 3000;

const html = (title, body) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body><h1>${title}</h1>${body}</body></html>`;

const server = http.createServer((req, res) => {
  const start = Date.now();
  const time = () => new Date().toISOString().replace('T', ' ').slice(0, 19);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Group', GROUP);

  let status = 200;
  let page = '';

  if (req.method === 'GET' && req.url === '/') {
    page = html('=== Лабораторная работа №20 ===', `
      <p>Группа: ${GROUP}</p>
      <p>Метод: ${req.method}</p>
      <p>URL: ${req.url}</p>`);
  } else if (req.method === 'GET' && req.url === '/about') {
    page = html('=== О студенте ===', `
      <p>Группа: ${GROUP}</p>
      <p>Студент: Кунец Никита</p>`);
  } else {
    status = 404;
    page = html('=== 404 Not Found ===', `<p>Путь ${req.url} не найден</p>`);
  }

  res.statusCode = status;
  res.end(page);

  console.log(`[${time()}] ${req.method} ${req.url} ${status} (${Date.now() - start}ms)`);
});

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
