// Задание 1: команда greet
const GROUP = '401';

module.exports = function greet(name) {
  if (!name) {
    console.error('Ошибка: не указано имя');
    console.error('Использование: my-cli greet <имя>');
    process.exit(1);
  }
  console.log(`Привет, ${name}! Добро пожаловать в CLI-приложение группы ${GROUP}.`);
};
