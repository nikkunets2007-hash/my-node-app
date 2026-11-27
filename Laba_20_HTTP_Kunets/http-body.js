// Лабораторная работа №20, Задание 3
// Чтение тела запроса (POST)
// Студент: Кунец Никита, группа 401

const http = require('http');
const querystring = require('querystring');

const GROUP = '401';
const PORT = 3000;
const MAX_BODY = 1024 * 1024; // 1 MB

function readBody(req, res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Payload Too Large'), { code: 413 }));
        // Не делаем req.destroy() сразу, даём обработать ошибку и отправить ответ
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('X-Group', GROUP);

  if (req.method === 'POST' && req.url === '/echo') {
    try {
      const body = await readBody(req, res);
      const ct = req.headers['content-type'] || '';
      console.log(`[body] /echo получено ${body.length} байт, Content-Type: ${ct}`);

      if (ct.includes('application/json')) {
        const obj = JSON.parse(body.toString('utf-8') || '{}');
        obj.group = GROUP;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(obj, null, 2));
      } else {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(body.toString('utf-8'));
      }
    } catch (err) {
      if (err.code === 413) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Connection', 'close');
        res.end('413 Payload Too Large');
      } else {
        res.statusCode = 500;
        res.end('500 Internal Server Error');
      }
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/form') {
    try {
      const body = await readBody(req, res);
      const data = querystring.parse(body.toString('utf-8'));
      console.log(`[body] /form получено ${body.length} байт`);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(data, null, 2));
    } catch (err) {
      res.statusCode = err.code === 413 ? 413 : 500;
      res.setHeader('Connection', 'close');
      res.end(err.message);
    }
    return;
  }

  res.statusCode = 404;
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log(`Body-сервер на порту ${PORT}. POST /echo, POST /form`);
});
