const EventEmitter = require('events');

class OrderHandler extends EventEmitter {
    constructor() {
        super();
    }

    // 5.2. Метод processOrder(orderId)
    processOrder(orderId) {
        // Генерирует событие 'order:start' с orderId
        this.emit('order:start', orderId);

        // Через 2 секунды генерирует 'order:processing'
        setTimeout(() => {
            this.emit('order:processing', orderId, 'Идёт обработка...');
        }, 2000);

        // Ещё через 2 секунды генерирует 'order:complete' с orderId и случайной суммой от 100 до 1000
        setTimeout(() => {
            const sum = Math.floor(Math.random() * 901) + 100; // от 100 до 1000
            this.emit('order:complete', orderId, sum);
        }, 4000);
    }
}

module.exports = OrderHandler;