// Лабораторная работа №19, Задание 3
// Наследование от EventEmitter
// Студент: Кунец Никита, группа 401

const EventEmitter = require('events');
const GROUP = '401';

class DatabaseConnection extends EventEmitter {
  connect() {
    console.log('[EVENT] Подключение к БД...');
    this.emit('connect');
  }

  query(sql) {
    console.log(`[EVENT] Выполнение запроса: ${sql}`);
    const result = sql.trim().toUpperCase().startsWith('SELECT')
      ? '50 записей'
      : '1 запись добавлена';
    this.emit('query', { sql, result });
  }

  close() {
    console.log('[EVENT] Закрытие соединения');
    this.emit('close');
  }

  error(message) {
    this.emit('error', new Error(message));
  }
}

console.log(`=== DatabaseConnection (группа ${GROUP}) ===`);

const db = new DatabaseConnection();

db.on('connect', () => {
  console.log('[EVENT] Соединение установлено');
});
db.on('query', ({ sql, result }) => {
  console.log(`[EVENT] Результат: ${result}`);
});
db.on('close', () => {
  console.log('[EVENT] Соединение закрыто');
});
db.on('error', (err) => {
  console.log(`[EVENT] Ошибка: ${err.message}`);
});

db.connect();
db.query('SELECT * FROM students');
db.query('INSERT INTO students');
db.close();

console.log('');
console.log('=== Демонстрация ошибки ===');
db.error('Connection timeout');
console.log('(без слушателя error — процесс упал бы с исключением)');
