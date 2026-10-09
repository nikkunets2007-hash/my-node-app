// Лабораторная работа №18, Задание 1
// Базовая информация о платформе и архитектуре
// Студент: Кунец Никита, группа 401

const os = require('os');

const GROUP = '401';

// Форматирование времени работы
function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h} ч ${m} мин ${s} сек`;
}

// Определение платформы
function detectPlatform(platform) {
  switch (platform) {
    case 'win32': return 'Вы работаете в Windows';
    case 'linux': return 'Вы работаете в Linux';
    case 'darwin': return 'Вы работаете в macOS';
    default: return 'Неизвестная платформа';
  }
}

console.log(`=== Информация о системе (группа ${GROUP}) ===`);
console.log(`Платформа: ${os.platform()}`);
console.log(`Тип ОС: ${os.type()}`);
console.log(`Архитектура: ${os.arch()}`);
console.log(`Версия ОС: ${os.release()}`);
console.log(`Имя хоста: ${os.hostname()}`);
console.log(`Время работы: ${formatUptime(os.uptime())}`);
console.log(detectPlatform(os.platform()));
