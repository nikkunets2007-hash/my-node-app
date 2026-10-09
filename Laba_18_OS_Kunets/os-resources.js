// Лабораторная работа №18, Задание 2
// Информация о процессоре и памяти
// Студент: Кунец Никита, группа 401

const os = require('os');

const GROUP = '401';

// ===== Процессор =====
const cpus = os.cpus();
console.log('=== Информация о процессоре ===');
console.log(`Количество логических ядер: ${cpus.length}`);
console.log(`Модель процессора: ${cpus[0].model}`);

const avgSpeed = Math.round(cpus.reduce((s, c) => s + c.speed, 0) / cpus.length);
console.log(`Средняя частота: ${avgSpeed} МГц`);

// ===== Память =====
const totalMem = os.totalmem();
const freeMem = os.freemem();
const usedMem = totalMem - freeMem;
const freePercent = (freeMem / totalMem) * 100;
const usedPercent = (usedMem / totalMem) * 100;

const toGB = (b) => (b / 1024 / 1024 / 1024).toFixed(2);

console.log('');
console.log('=== Информация о памяти ===');
console.log(`Общий объём: ${toGB(totalMem)} ГБ`);
console.log(`Свободно: ${toGB(freeMem)} ГБ`);
console.log(`Использовано: ${toGB(usedMem)} ГБ (${usedPercent.toFixed(1)}%)`);
console.log(`Группа: ${GROUP}`);

// Адаптивный вывод
if (freePercent < 20) {
  console.log('ВНИМАНИЕ: Свободной памяти меньше 20%!');
} else {
  console.log('Память в норме');
}

// ===== Средняя загрузка =====
console.log('');
console.log('=== Средняя загрузка системы ===');
const load = os.loadavg();
if (os.platform() === 'win32') {
  console.log('Средняя загрузка недоступна в Windows (loadavg = [0, 0, 0])');
} else {
  console.log(`За 1 мин: ${load[0].toFixed(2)}`);
  console.log(`За 5 мин: ${load[1].toFixed(2)}`);
  console.log(`За 15 мин: ${load[2].toFixed(2)}`);
}
