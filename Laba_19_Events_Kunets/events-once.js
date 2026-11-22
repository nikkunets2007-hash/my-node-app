// Лабораторная работа №19, Задание 2
// Методы on, once, addListener и управление подписками
// Студент: Кунец Никита, группа 401

const EventEmitter = require('events');
const GROUP = '401';

const emitter = new EventEmitter();

// ===== Сравнение on и once =====
console.log('=== Сравнение on и once ===');

let onCount = 0;
let onceCount = 0;

emitter.on('tick', () => {
  onCount++;
  console.log(`[tick #${onCount}] on-слушатель`);
});

emitter.once('tick', () => {
  onceCount++;
  console.log(`[tick #${onCount}] once-слушатель`);
});

emitter.emit('tick');
emitter.emit('tick');
emitter.emit('tick');

console.log(`on-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз`);

// ===== Управление подписками =====
console.log('');
console.log('=== Управление подписками ===');

const emitter2 = new EventEmitter();
const l1 = () => {};
const l2 = () => {};
const l3 = () => {};

emitter2.on('test', l1);
emitter2.on('test', l2);
emitter2.on('test', l3);

console.log(`Слушателей до удаления: ${emitter2.listenerCount('test')}`);
emitter2.removeListener('test', l2);
console.log(`Слушателей после удаления одного: ${emitter2.listenerCount('test')}`);
emitter2.removeAllListeners('test');
console.log(`Слушателей после removeAllListeners: ${emitter2.listenerCount('test')}`);

// ===== Порядок вызова =====
console.log('');
console.log('=== Порядок вызова ===');

const emitter3 = new EventEmitter();
emitter3.on('order', () => console.log(`1. Первый слушатель (группа ${GROUP})`));
emitter3.on('order', () => console.log('2. Второй слушатель'));
emitter3.on('order', () => console.log('3. Третий слушатель'));
emitter3.emit('order');
