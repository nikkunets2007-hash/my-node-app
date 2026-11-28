// Лабораторная работа №19, Задание 4
// newListener, removeListener, метапрограммирование
// Студент: Кунец Никита, группа 401

const EventEmitter = require('events');
const GROUP = '401';
const PREFIX = `[${GROUP}]`;

// ===== Система плагинов =====
console.log('=== Система плагинов ===');

class PluginManager extends EventEmitter {
  constructor() {
    super();
    this.plugins = new Map();

    this.on('newListener', (event, listener) => {
      console.log(`[newListener] Добавлен слушатель "${event}"`);
    });
    this.on('removeListener', (event, listener) => {
      console.log(`[removeListener] Удалён слушатель "${event}"`);
    });
  }

  register(name, handlers) {
    this.plugins.set(name, handlers);
    this.emit('plugin:registered', name);
    for (const evt of Object.keys(handlers)) {
      this.on(evt, handlers[evt]);
    }
  }

  unregister(name) {
    const handlers = this.plugins.get(name);
    if (!handlers) return;
    for (const evt of Object.keys(handlers)) {
      this.removeListener(evt, handlers[evt]);
    }
    this.plugins.delete(name);
    this.emit('plugin:removed', name);
  }
}

const pm = new PluginManager();
pm.on('plugin:registered', (n) => console.log(`[PLUGIN] Зарегистрирован: ${n}`));
pm.on('plugin:removed', (n) => console.log(`[PLUGIN] Удалён: ${n}`));

pm.register('LoggerPlugin', { log: () => {} });
pm.register('AlertPlugin', { alert: () => {} });
pm.unregister('LoggerPlugin');

// ===== Утечка памяти =====
console.log('');
console.log('=== Демонстрация утечки ===');

const leak = new EventEmitter();
leak.setMaxListeners(2000);
for (let i = 0; i < 10; i++) leak.on('leak', () => {});
console.log(`Слушателей до: ${leak.listenerCount('leak')}`);

for (let i = 0; i < 1000; i++) leak.on('leak', () => {});
console.log(`Слушателей после добавления 1000: ${leak.listenerCount('leak')}`);

leak.removeAllListeners('leak');
console.log(`Слушателей после removeAllListeners: ${leak.listenerCount('leak')}`);

// ===== Асинхронные слушатели =====
console.log('');
console.log('=== Асинхронные слушатели ===');

const asyncEmitter = new EventEmitter();

asyncEmitter.on('async', async () => {
  await new Promise((r) => setTimeout(r, 100));
  console.log(`${PREFIX} async-слушатель завершён через 100ms`);
});

console.log(`${PREFIX} emit вызван (не ждёт async-слушатель)`);
asyncEmitter.emit('async');
