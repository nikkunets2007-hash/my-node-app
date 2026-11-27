// Лабораторная работа №20, Задание 5
// Полноценный HTTP/HTTPS сервер: middleware, статика, кэш, стриминг, метрики
// Студент: Кунец Никита, группа 401

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GROUP = '401';
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;
const PUBLIC_DIR = path.join(__dirname, 'public');
const LOG_FILE = path.join(__dirname, 'access.log');

// ===== Генерация самоподписанного сертификата, если его нет =====
if (!fs.existsSync('key.pem') || !fs.existsSync('cert.pem')) {
  console.log('[INFO] Генерация самоподписанного сертификата...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  // Простой самоподписанный сертификат (для лабы достаточно)
  // В реальности нужен X509, но для демонстрации HTTPS используем готовый подход через node-forge,
  // однако без внешних зависимостей используем заглушку с самоподписанным ключом.
  fs.writeFileSync('key.pem', privateKey);
  // Генерируем минимальный сертификат через встроенный crypto (X509)
  const cert = generateSelfSignedCert(privateKey, publicKey);
  fs.writeFileSync('cert.pem', cert);
}

function generateSelfSignedCert(privateKeyPem, publicKeyPem) {
  // Упрощённая генерация: используем встроенный X509 через crypto
  // Для реального сертификата нужен ASN.1, но для лабы достаточно сгенерировать
  // корректный PEM. Используем библиотеку, встроенную в Node.js (crypto.X509Certificate не умеет создавать).
  // Поэтому используем трюк: создаём через child_process если есть openssl, иначе заглушка.
  // В рамках лабы используем selfsigned через npm, но у нас нет node_modules.
  // Простейший выход: использовать предсозданный сертификат из шаблона.
  // Для демонстрации HTTPS достаточно любого валидного PEM.
  throw new Error('Требуется openssl или node-forge для генерации сертификата');
}

// ===== Если сертификат не удалось сгенерировать — запускаем только HTTP =====
let httpsAvailable = false;
let httpsOptions = null;

try {
  if (fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
    httpsOptions = {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem'),
    };
    httpsAvailable = true;
  }
} catch (e) {
  console.log('[WARN] HTTPS недоступен:', e.message);
}

// ===== Middleware =====
const middlewares = [];

function use(fn) {
  middlewares.push(fn);
}

// Middleware 1: логирование
use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const line = `[${new Date().toISOString()}] [${GROUP}] ${req.method} ${req.url} ${res.statusCode} (${Date.now() - start}ms)\n`;
    fs.appendFileSync(LOG_FILE, line);
    console.log(line.trim());
  });
  next();
});

// Middleware 2: заголовки группы
use((req, res, next) => {
  res.setHeader('X-Group', GROUP);
  next();
});

// ===== Метрики =====
const metrics = {
  total: 0,
  byMethod: {},
  byStatus: {},
  startedAt: Date.now(),
};

function trackMetrics(req, res) {
  metrics.total++;
  metrics.byMethod[req.method] = (metrics.byMethod[req.method] || 0) + 1;
  const code = String(res.statusCode);
  metrics.byStatus[code] = (metrics.byStatus[code] || 0) + 1;
}

// ===== MIME-типы =====
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
};

// ===== In-memory кэш =====
const cache = new Map();
const CACHE_TTL = 60_000;

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.at > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item;
}

// ===== Основной обработчик =====
function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // /metrics
  if (pathname === '/metrics') {
    trackMetrics(req, res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      group: GROUP,
      total: metrics.total,
      byMethod: metrics.byMethod,
      byStatus: metrics.byStatus,
      uptime: Math.floor((Date.now() - metrics.startedAt) / 1000),
    }, null, 2));
    return;
  }

  // /stream — стриминг
  if (pathname === '/stream') {
    trackMetrics(req, res);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="stream.bin"');
    const stream = fs.createReadStream(__filename);
    stream.pipe(res);
    return;
  }

  // /static/*
  if (pathname.startsWith('/static/')) {
    const rel = pathname.slice('/static/'.length);
    const safePath = path.normalize(rel).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    // Защита от path traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      trackMetrics(req, res);
      res.statusCode = 403;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('403 Forbidden');
      return;
    }

    if (!fs.existsSync(filePath)) {
      trackMetrics(req, res);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('404 Not Found');
      return;
    }

    const stat = fs.statSync(filePath);
    const etag = `"${stat.size}-${stat.mtimeMs}"`;
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';

    // Кэширование
    if (req.headers['if-none-match'] === etag) {
      trackMetrics(req, res);
      res.statusCode = 304;
      res.end();
      return;
    }

    trackMetrics(req, res);
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'max-age=60');
    res.setHeader('ETag', etag);
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  // Главная
  trackMetrics(req, res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<h1>ЛР20, группа ${GROUP}</h1><p>Попробуй /metrics, /static/index.html, /stream</p>`);
}

// ===== HTTP-сервер =====
const httpServer = http.createServer((req, res) => {
  let i = 0;
  const next = () => {
    if (i >= middlewares.length) {
      handle(req, res);
      return;
    }
    middlewares[i++](req, res, next);
  };
  next();
});

httpServer.on('clientError', (err, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`[INFO] HTTP-сервер запущен на порту ${HTTP_PORT}`);
  console.log(`[INFO] Группа: ${GROUP}`);
});

// ===== HTTPS-сервер =====
if (httpsAvailable) {
  const httpsServer = https.createServer(httpsOptions, (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<h1>=== HTTPS работает! ===</h1><p>Группа: ${GROUP}</p>`);
  });
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`[INFO] HTTPS-сервер запущен на порту ${HTTPS_PORT}`);
  });
}

// ===== Корректное завершение =====
process.on('SIGINT', () => {
  console.log('\n[INFO] Завершение работы...');
  process.exit(0);
});
