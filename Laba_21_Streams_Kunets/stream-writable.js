// Лабораторная работа №21, Задание 2
// Writable-поток, запись данных и backpressure
// Студент: Кунец Никита, группа 401

const { Writable } = require('stream');

const GROUP = '401';
const DATA = [
  `Группа: ${GROUP}`,
  'Студент: Кунец Никита',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js',
];

console.log('=== Демонстрация Writable-потока ===');

let written = 0;

const writable = new Writable({
  highWaterMark: 16,
  write(chunk, encoding, callback) {
    written++;
    console.log(`[WRITE] ${chunk.toString()}`);
    setTimeout(callback, 50);
  },
});

writable.on('drain', () => {
  console.log('[DRAIN] Буфер освобождён, продолжаем запись');
});

writable.on('finish', () => {
  console.log('[FINISH] Все данные записаны');
  console.log(`Всего записано: ${written} чанка`);
});

writable.on('error', (err) => {
  console.error('[ERROR]', err.message);
});

for (const text of DATA) {
  const ok = writable.write(text);
  console.log(`write() вернул: ${ok}${ok ? '' : ' ← буфер переполнен!'}`);
}

writable.end();
