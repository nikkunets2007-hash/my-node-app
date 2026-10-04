// Лабораторная работа №18, Задание 4
// Мониторинг системы в реальном времени
// Студент: Кунец Никита, группа 401

const os = require('os');
const fs = require('fs');
const path = require('path');

const GROUP = '401';
const LOG_FILE = path.join(__dirname, 'monitor.log');
const INTERVAL = 2000;

// Форматирование времени для лога
function logTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Запись в лог
function logWarning(msg) {
  const line = `[${logTimestamp()}] [${GROUP}] Предупреждение: ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line, 'utf-8');
}

// ===== Первичный сбор данных =====
function collectSnapshot() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  return {
    timestamp: new Date().toISOString(),
    group: GROUP,
    platform: os.platform(),
    hostname: os.hostname(),
    cpus: cpus.length,
    cpuModel: cpus[0].model,
    totalMemGB: (totalMem / 1024 / 1024 / 1024).toFixed(2),
    freeMemGB: (freeMem / 1024 / 1024 / 1024).toFixed(2),
  };
}

// ===== Расчёт загрузки CPU за интервал =====
function getCpuTimes() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type of Object.keys(cpu.times)) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  return { idle, total };
}

let lastTimes = getCpuTimes();
let warnings = 0;

function calcCpuLoad() {
  const current = getCpuTimes();
  const idleDiff = current.idle - lastTimes.idle;
  const totalDiff = current.total - lastTimes.total;
  lastTimes = current;
  if (totalDiff === 0) return 0;
  const busy = totalDiff - idleDiff;
  return (busy / totalDiff) * 100;
}

// ===== Первичный вывод =====
console.log('=== Первичный сбор данных ===');
const snapshot = collectSnapshot();
console.log(JSON.stringify(snapshot, null, 2));
console.log('');
console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.`);

// ===== Периодический мониторинг =====
const interval = setInterval(() => {
  const cpuLoad = calcCpuLoad();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const freePercent = (freeMem / totalMem) * 100;
  const usedPercent = 100 - freePercent;

  let status = '';
  if (cpuLoad > 80) {
    status = ' КРИТИЧНО';
    warnings++;
    logWarning(`CPU ${cpuLoad.toFixed(1)}%`);
  } else if (cpuLoad > 50) {
    status = ' ⚠';
    warnings++;
    logWarning(`CPU ${cpuLoad.toFixed(1)}%`);
  }

  if (freePercent < 10) {
    status += ' ⚠ RAM';
    warnings++;
    logWarning(`RAM свободно ${freePercent.toFixed(1)}%`);
  }

  const line = `CPU: ${cpuLoad.toFixed(1)}% | RAM: ${usedPercent.toFixed(1)}% (${(freeMem / 1024 / 1024 / 1024).toFixed(2)} ГБ свободно)${status}`;
  process.stdout.write('\r' + line.padEnd(80));
}, INTERVAL);

// ===== Корректное завершение =====
process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n');
  console.log(`Мониторинг остановлен. Предупреждений: ${warnings}`);
  process.exit(0);
});
