// Лабораторная работа №20, Задание 2
// Работа с HTTP-заголовками
// Студент: Кунец Никита, группа 401

const http = require('http');

const GROUP = '401';
const PORT = 3000;

const server = http.createServer((req, res) => {
  res.setHeader('X-Powered-By', 'Node.js');
  res.setHeader('X-Group', GROUP);
  res.setHeader('Cache-Control', 'no-cache');

  // GET /headers — все входящие заголовки
  if (req.method === 'GET' && req.url === '/headers') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      headers: req.headers,
      method: req.method,
      url: req.url,
      httpVersion: req.httpVersion,
    }, null, 2));
    return;
  }

  // GET /headers/set — установка кастомных заголовков
  if (req.method === 'GET' && req.url === '/headers/set') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Custom', 'Hello');
    res.end('<h1>Заголовки установлены</h1><p>Проверь через curl -I</p>');
    return;
  }

  // GET /headers/check — проверка наличия заголовков
  if (req.method === 'GET' && req.url === '/headers/check') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      hasContentType: res.hasHeader('Content-Type'),
      hasXGroup: res.hasHeader('X-Group'),
      hasUnknown: res.hasHeader('X-Unknown'),
    }, null, 2));
    return;
  }

  res.statusCode = 404;
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`Headers-сервер на порту ${PORT}`);
  console.log(`GET /headers, /headers/set, /headers/check`);
});
