const fs = require('fs');

function setupLogger(app) {
    // Слушаем событие 'server:started'
    app.on('server:started', (port) => {
        const time = new Date().toISOString();
        const message = `[${time}] SERVER:STARTED: Сервер запущен на порту ${port}\n`;
        fs.appendFile('logs.txt', message, (err) => {
            if (err) console.error('Ошибка записи в лог:', err);
        });
    });

    // Слушаем событие 'request:received'
    app.on('request:received', (req) => {
        const time = new Date().toISOString();
        const message = `[${time}] REQUEST:RECEIVED: ${req.method} ${req.url}\n`;
        fs.appendFile('logs.txt', message, (err) => {
            if (err) console.error('Ошибка записи в лог:', err);
        });
    });

    // Слушаем событие 'server:stopped'
    app.on('server:stopped', () => {
        const time = new Date().toISOString();
        const message = `[${time}] SERVER:STOPPED: Сервер остановлен\n`;
        fs.appendFile('logs.txt', message, (err) => {
            if (err) console.error('Ошибка записи в лог:', err);
        });
    });
}

module.exports = setupLogger;