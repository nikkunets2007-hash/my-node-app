const http = require('http');
const EventEmitter = require('events');
const setupLogger = require('./logger');

class AppServer extends EventEmitter {
    constructor() {
        super();
        this.server = null;
    }

    start(port) {
        this.server = http.createServer((req, res) => {
            this.emit('request:received', req);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('Hello from Event-Driven Server!');
        });

        this.server.listen(port, () => {
            this.emit('server:started', port);
        });
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                this.emit('server:stopped');
            });
        }
    }
}

const app = new AppServer();

setupLogger(app);

app.on('server:started', (port) => {
    console.log(`🚀 Сервер запущен на порту ${port}`);
});

app.on('request:received', (req) => {
    console.log(`📩 Получен запрос: ${req.method} ${req.url}`);
});

app.on('server:stopped', () => {
    console.log('🔴 Сервер остановлен');
});

const PORT = 3000;
app.start(PORT);

setTimeout(() => {
    app.stop();
}, 10000);