const http = require('http');
const EventEmitter = require('events');
const setupLogger = require('./logger');
const OrderHandler = require('./orderHandler');

// ===== Функция вычисления числа Пи (5.3) =====
function calculatePi() {
    // Формула Лейбница: π = 4 * (1 - 1/3 + 1/5 - 1/7 + 1/9 - ...)
    let pi = 0;
    for (let i = 0; i < 1000000; i++) {
        const sign = i % 2 === 0 ? 1 : -1;
        pi += sign / (2 * i + 1);
    }
    return (pi * 4).toFixed(7); // 7 знаков после запятой
}

// ===== Класс сервера (Задание 1) =====
class AppServer extends EventEmitter {
    constructor() {
        super();
        this.server = null;
        this.orderHandler = new OrderHandler();
        this.setupOrderEvents();
    }

    // 5.3. Обработчики событий OrderHandler
    setupOrderEvents() {
        // Событие 'order:start'
        this.orderHandler.on('order:start', (orderId) => {
            console.log(`→ [order:start] Заказ #${orderId} начат`);
        });

        // Событие 'order:processing'
        this.orderHandler.on('order:processing', (orderId, text) => {
            console.log(`→ Через 2 сек: [order:processing] Заказ #${orderId}: ${text}`);
        });

        // Событие 'order:complete' — вычисляем Пи и выводим результат
        this.orderHandler.on('order:complete', (orderId, sum) => {
            const pi = calculatePi();
            console.log(`→ Через 4 сек: [order:complete] Заказ #${orderId} завершён на сумму ${sum} руб. PI = ${pi}`);
        });
    }

    start(port) {
        this.server = http.createServer((req, res) => {
            this.emit('request:received', req);

            // 5.4. Эндпоинт /order/<id>
            const match = req.url.match(/^\/order\/(\d+)$/);
            if (req.method === 'GET' && match) {
                const orderId = match[1];
                this.orderHandler.processOrder(orderId);
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(`Заказ #${orderId} принят в обработку.`);
                return;
            }

            // Обычный ответ
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

// ===== Создание и запуск =====
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

// ===== Авто-остановка через 20 секунд =====
setTimeout(() => {
    app.stop();
}, 20000);