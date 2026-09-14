const http = require('http');
const EventEmitter = require('events');
const setupLogger = require('./logger');
const OrderHandler = require('./orderHandler');

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

// ===== Задание 3: Асинхронная обработка заказов =====
const orderHandler = new OrderHandler();

orderHandler.on('order:received', (orderId) => {
    console.log(`📦 Заказ ${orderId} получен, начинаем обработку...`);
});

orderHandler.on('order:processed', (orderId) => {
    console.log(`✅ Заказ ${orderId} успешно обработан!`);
});

// Запускаем обработку заказа №123 с задержкой 2 секунды
orderHandler.processOrder(123, 2000);

// ===== Эмуляция остановки сервера через 10 секунд =====
setTimeout(() => {
    app.stop();
}, 10000);