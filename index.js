const http = require('http');
const EventEmitter = require('events');

// 3.1. Создаем класс AppServer, который наследуется от EventEmitter
class AppServer extends EventEmitter {
    constructor() {
        super();
        this.server = null;
    }

    // 3.2. Метод start(port)
    start(port) {
        this.server = http.createServer((req, res) => {
            // 3.2. При входящем запросе генерируем событие 'request:received'
            this.emit('request:received', req);

            // Отправляем ответ браузеру (чтобы страница не висела)
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>Привет, мир!</h1>');
        });

        this.server.listen(port, () => {
            // 3.2. Генерируем событие 'server:started' с портом
            this.emit('server:started', port);
        });
    }

    // 3.2. Метод stop()
    stop() {
        if (this.server) {
            this.server.close(() => {
                // 3.2. Генерируем событие 'server:stopped'
                this.emit('server:stopped');
            });
        }
    }
}

// Создаем экземпляр сервера
const app = new AppServer();

// 3.3. Регистрируем обработчики событий

// При 'server:started' — выводим в консоль 🚀 Сервер запущен на порту <port>
app.on('server:started', (port) => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
});

// При 'request:received' — выводим в консоль 📩 Получен запрос: <method> <url>
app.on('request:received', (req) => {
    console.log(`📩 Получен запрос: ${req.method} ${req.url}`);
});

// При 'server:stopped' — выводим в консоль 🔴 Сервер остановлен
app.on('server:stopped', () => {
    console.log('🔴 Сервер остановлен');
});

// Запускаем сервер на порту 3000
const PORT = 3000;
app.start(PORT);