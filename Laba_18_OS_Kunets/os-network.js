// Лабораторная работа №18, Задание 3
// Сетевые интерфейсы и информация о пользователе
// Студент: Кунец Никита, группа 401

const os = require('os');

const GROUP = '401';

// Маскировка MAC-адреса
function maskMac(mac) {
  if (!mac || mac === '00:00:00:00:00:00') return mac;
  const parts = mac.split(':');
  return parts.slice(0, 3).join(':') + ':**:**:**';
}

// ===== Сетевые интерфейсы =====
console.log('=== Сетевые интерфейсы ===');
const interfaces = os.networkInterfaces();
let mainInterface = null;
let totalCount = 0;

for (const [name, addrs] of Object.entries(interfaces)) {
  for (const addr of addrs) {
    totalCount++;
    const isIPv4 = addr.family === 'IPv4' || addr.family === 4;
    if (isIPv4 && !addr.internal && !mainInterface) {
      mainInterface = { name, address: addr.address };
    }

    // Выводим только IPv4 (для краткости)
    if (isIPv4) {
      console.log(`Интерфейс: ${name}`);
      console.log(`  IPv4: ${addr.address}`);
      console.log(`  MAC: ${maskMac(addr.mac)}`);
      console.log(`  Внутренний: ${addr.internal ? 'да' : 'нет'}`);
    }
  }
}

console.log(`Всего интерфейсов: ${Object.keys(interfaces).length}`);
if (mainInterface) {
  console.log(`Основной интерфейс: ${mainInterface.name} (${mainInterface.address})`);
}

// ===== Информация о пользователе =====
console.log('');
console.log('=== Информация о пользователе ===');
const userInfo = os.userInfo();
console.log(`Имя пользователя: ${userInfo.username}`);
if (os.platform() !== 'win32') {
  console.log(`UID: ${userInfo.uid}`);
  console.log(`GID: ${userInfo.gid}`);
}
console.log(`Домашняя директория: ${userInfo.homedir}`);
console.log(`Оболочка: ${userInfo.shell || '(нет)'}`);
console.log(`Группа: ${GROUP}`);

// Проверка root
const isRoot = os.platform() !== 'win32' && userInfo.uid === 0;
console.log(`Проверка root: ${isRoot ? 'да (ВЫ ROOT!)' : 'нет'}`);
