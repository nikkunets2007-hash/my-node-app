const EventEmitter = require('events');

class UserTracker extends EventEmitter {
    constructor() {
        super();
    }

    // 7.2. Метод trackAction(userId, action, metadata)
    trackAction(userId, action, metadata) {
        const eventData = {
            userId: userId,
            action: action,
            timestamp: new Date().toISOString(),
            metadata: metadata,
            id: Math.random().toString(36).substr(2, 9) // уникальный ID события
        };

        // Генерируем событие 'user:action'
        this.emit('user:action', eventData);
    }
}

module.exports = UserTracker;