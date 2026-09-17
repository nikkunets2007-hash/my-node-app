// Лабораторная работа 14, Задание 4
// Генерация data_10.txt (100 000 строк), потоковая обработка
// Доп. условие варианта 10: найти 10 самых часто встречающихся чисел

import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import readline from 'readline';

const N = 10;
const TOTAL = 100000;
const dataFile = path.join(process.cwd(), `data_${N}.txt`);
const outFile = path.join(process.cwd(), `processed_${N}.txt`);

// 1. Генерация файла (если не существует)
async function generate() {
  try {
    await fsp.access(dataFile);
    console.log(`Файл ${dataFile} уже существует, генерация пропущена.`);
    return;
  } catch {}

  console.log(`Генерация ${dataFile} (${TOTAL} строк)...`);
  const stream = fs.createWriteStream(dataFile);
  for (let i = 1; i <= TOTAL; i++) {
    const num = Math.floor(Math.random() * 1000) + 1;
    stream.write(`${i}, ${num}, Вариант ${N}\n`);
  }
  await new Promise((resolve) => stream.end(resolve));
  console.log('Генерация завершена.');
}

// 2. Обработка через потоки
async function processFile() {
  const start = Date.now();
  const stat = await fsp.stat(dataFile);
  console.log(`\nОбработка файла: data_${N}.txt`);
  console.log(`Размер файла: ${(stat.size / 1024 / 1024).toFixed(2)} МБ\n`);

  const rl = readline.createInterface({
    input: fs.createReadStream(dataFile, { highWaterMark: 64 * 1024 }),
    crlfDelay: Infinity,
  });

  let count = 0;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  const freq = new Map(); // доп. условие: частоты чисел

  rl.on('line', (line) => {
    const parts = line.split(',');
    if (parts.length < 2) return;
    const num = parseInt(parts[1].trim(), 10);
    if (isNaN(num)) return;

    count++;
    sum += num;
    if (num < min) min = num;
    if (num > max) max = num;
    freq.set(num, (freq.get(num) || 0) + 1);

    if (count % (TOTAL / 10) === 0) {
      console.log(
        `Прогресс: ${((count / TOTAL) * 100).toFixed(0)}% (${count} строк обработано)`
      );
    }
  });

  await new Promise((resolve) => rl.on('close', resolve));

  // Топ-10 частых чисел
  const top10 = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const avg = sum / count;
  const result = [
    'Результаты:',
    `- Всего строк: ${count}`,
    `- Сумма чисел: ${sum}`,
    `- Среднее значение: ${avg.toFixed(2)}`,
    `- Максимальное число: ${max}`,
    `- Минимальное число: ${min}`,
    '',
    'Топ-10 самых частых чисел:',
    ...top10.map(([num, c], i) => `  ${i + 1}. Число ${num} — ${c} раз`),
    '',
    `Время выполнения: ${((Date.now() - start) / 1000).toFixed(2)} сек`,
  ].join('\n');

  await fsp.writeFile(outFile, result, 'utf-8');
  console.log('\n' + result);
  console.log(`\nРезультаты сохранены в: processed_${N}.txt`);
}

async function main() {
  await generate();
  await processFile();
}

main().catch((err) => console.error('Ошибка в задании 4:', err.message));