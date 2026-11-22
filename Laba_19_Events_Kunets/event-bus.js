// Лабораторная работа №19, Задание 5
// EventBus: приоритеты, wildcard, once-кэш, метрики, os + http
// Студент: Кунец Никита, группа 401

const EventEmitter = require('events');
const http = require('http');
const os = require('os');

const GROUP = '401';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this._priorities = new Map();
    this._onceSet = new Set();
    this._anyListeners = [];
    this._metrics = {};
    this._total = 0;
  }

  on(event, listener, priority = 0) {
    if (!this._priorities.has(event)) this._priorities.set(event, new Map());
    this._priorities.get(event).set(listener, priority);
    return super.on(event, listener);
  }

  once(event, listener, priority = 0) {
    const wrapped = (...args) => {
      this.removeListener(event, wrapped);
      listener(...args);
    };
    this._onceSet.add(wrapped);
    return this.on(event, wrapped, priority);
  }

  removeListener(event, listener) {
    const map = this._priorities.get(event);
    if (map) map.delete(listener);
    return super.removeListener(event, listener);
  }

  onAny(listener) {
    this._anyListeners.push(listener);
  }

  off(event, listener) {
    return this.removeListener(event, listener);
  }

  emit(event, ...args) {
    if (!this._metrics[event]) this._metrics[event] = { calls: 0, errors: 0, lastAt: null };
    this._metrics[event].calls++;
    this._metrics[event].lastAt = new Date().toISOString();
    this._total++;

    for (const l of this._anyListeners) {
      try { l(event, args); } catch (e) { /* ignore */ }
    }

    const map = this._priorities.get(event);
    if (map) {
      const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
      for (const [fn] of sorted) {
        try { fn(...args); }
        catch (e) {
          this._metrics[event].errors++;
          console.log(`[ERROR] [${GROUP}] Ошибка в слушателе "${event}": ${e.message}`);
        }
      }
      return sorted.length > 0;
    }
    return super.emit(event, ...args);
  }

  getMetrics() {
    return {
      group: GROUP,
      events: Object.fromEntries(Object.entries(this._metrics).map(([k, v]) => [k, v.calls])),
      total: this._total,
      listeners: Object.fromEntries([...this._priorities.entries()].map(([k, m]) => [k, m.size])),
    };
  }
}

console.log(`=== EventBus (группа ${GROUP}) ===`);

const bus = new EventBus();

console.log('--- Приоритеты ---');
bus.on('prio', () => console.log('[priority 0] Низкий приоритет'), 0);
bus.on('prio', () => console.log('[priority 10] Высокий приоритет'), 10);
bus.on('prio', () => console.log('[priority 5] Средний приоритет'), 5);
bus.emit('prio');

console.log('');
console.log('--- Wildcard ---');
bus.onAny((event, args) => console.log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`));
bus.emit('greet', 'Иван');
bus.emit('info', GROUP);

console.log('');
console.log('--- Once-кэш ---');
let onceCalls = 0;
bus.once('tick', () => { onceCalls++; console.log('[tick] once-слушатель'); });
bus.on('tick', () => console.log('[tick] обычный слушатель'));
bus.emit('tick');
bus.emit('tick');
bus.emit('tick');
console.log(`once-слушатель вызван: ${onceCalls} раз`);

console.log('');
console.log('--- Обработка ошибок ---');
bus.on('test', () => { throw new Error('boom1'); });
bus.on('test', () => { throw new Error('boom2'); });
bus.emit('test');

console.log('');
console.log('--- Метрики ---');
console.log(JSON.stringify(bus.getMetrics(), null, 2));

const server = http.createServer((req, res) => {
  bus.emit('request', req.url);
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(bus.getMetrics(), null, 2));
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`EventBus OK, группа ${GROUP}. FreeMem: ${(os.freemem()/1024/1024).toFixed(1)} MB\n`);
  }
});

bus.on('request', (url) => console.log(`[HTTP] request: ${url}`));

server.listen(3000, () => {
  console.log('');
  console.log('HTTP-сервер на http://localhost:3000 — /metrics, Ctrl+C для выхода');
});
