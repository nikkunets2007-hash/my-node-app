const EventEmitter = require('events');

class OrderHandler extends EventEmitter {
    constructor() {
        super();
    }

    // Метод обработки заказа с задержкой
    processOrder(orderId, delay = 2000) {
        // Генерируем событие о получении заказа
        this.emit('order:received', orderId);

        // Эмулируем асинхронную обработку через setTimeout
        setTimeout(() => {
            // Генерируем событие о завершении обработки
            this.emit('order:processed', orderId);
        }, delay);
    }
}

module.exports = OrderHandler;