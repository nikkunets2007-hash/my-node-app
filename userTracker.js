const EventEmitter = require('events');

class UserTracker extends EventEmitter {
    constructor() {
        super();
    }

    // Метод для отслеживания действия пользователя
    trackAction(userId, action, details = {}) {
        const eventData = {
            userId: userId,
            action: action,
            timestamp: new Date().toISOString(),
            details: details
        };

        // Генерируем кастомное событие 'user:action' со сложным объектом
        this.emit('user:action', eventData);
    }
}

module.exports = UserTracker;