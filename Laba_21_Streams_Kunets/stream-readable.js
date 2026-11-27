// Лабораторная работа №21, Задание 1
// Readable-поток, чтение данных в flowing-режиме
// Студент: Кунец Никита, группа 401

const { Readable } = require('stream');

const GROUP = '401';
const CHUNKS = [
  `Группа: ${GROUP}`,
  'Студент: Кунец Никита',
  'Лабораторная работа: №21',
  'Тема: Потоки в Node.js',
];

console.log('=== Демонстрация Readable-потока ===');

let chunkIndex = 0;
let totalChunks = 0;
let totalBytes = 0;

const readable = new Readable({
  read() {
    if (chunkIndex < CHUNKS.length) {
      const data = CHUNKS[chunkIndex];
      chunkIndex++;
      this.push(data);
    } else {
      this.push(null);
    }
  },
});

readable.on('data', (chunk) => {
  totalChunks++;
  const text = chunk.toString();
  totalBytes += chunk.length;
  console.log(`[CHUNK ${totalChunks}] ${text}`);
});

readable.on('end', () => {
  console.log('[END] Поток завершён');
  console.log(`Всего получено чанков: ${totalChunks}`);
  console.log(`Общий размер данных: ${totalBytes} байт`);
});

readable.on('error', (err) => {
  console.error('[ERROR]', err.message);
});
