// Задание 1: команда info
const GROUP = '401';
const STUDENT = 'Кунец Никита';

module.exports = function info() {
  const now = new Date().toLocaleDateString('ru-RU');
  console.log(`Группа: ${GROUP}`);
  console.log(`Студент: ${STUDENT}`);
  console.log(`Лабораторная работа: №17`);
  console.log(`Дата: ${now}`);
};