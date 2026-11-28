// Лабораторная работа №19, Задание 1
// Создание простого EventEmitter и подписка на события
// Студент: Кунец Никита, группа 401

const EventEmitter = require('events');
const GROUP = '401';

const emitter = new EventEmitter();

// Подписка на события
emitter.on('greet', (name) => {
  console.log(`[greet] Привет, ${name}!`);
});

emitter.on('info', () => {
  console.log(`[info] Группа: ${GROUP}`);
});

emitter.on('bye', () => {
  console.log('[bye] До свидания!');
});

console.log('=== Демонстрация EventEmitter ===');

// Эмитим события по очереди
emitter.emit('greet', 'Иван');
emitter.emit('info');
emitter.emit('bye');

// Демонстрация возвращаемого значения emit()
console.log('');
const noListeners = emitter.emit('unknown');
console.log(`Событие "unknown" без слушателей: ${noListeners}`);

const hasListeners = emitter.emit('greet', 'Иван');
console.log(`Событие "greet" со слушателями: ${hasListeners}`);
