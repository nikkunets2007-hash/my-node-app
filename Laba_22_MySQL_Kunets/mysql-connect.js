// Лабораторная работа №22, Задание 1
// Подключение к MySQL: одиночное соединение и пул
// Студент: Кунец Никита, группа 401

require('dotenv').config();
const mysql = require('mysql2/promise');

const GROUP = '401';

const config = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// ===== Одиночное соединение =====
async function singleConnection() {
  console.log('=== Одиночное соединение ===');
  let conn;
  try {
    conn = await mysql.createConnection(config);
    console.log('✔ Подключение установлено');

    const [rows] = await conn.query('SELECT VERSION() AS version, DATABASE() AS db, USER() AS user');
    const r = rows[0];
    console.log(`Версия MySQL: ${r.version}`);
    console.log(`Текущая БД: ${r.db}`);
    console.log(`Пользователь: ${r.user}`);
    console.log(`Группа: ${GROUP}`);
  } catch (err) {
    console.error('✖ Ошибка:', err.code, err.message);
  } finally {
    if (conn) {
      await conn.end();
      console.log('✖ Соединение закрыто');
    }
  }
}

// ===== Пул соединений =====
async function poolConnection() {
  console.log('');
  console.log('=== Пул соединений ===');
  const pool = mysql.createPool({ ...config, connectionLimit: 10 });
  try {
    const [rows] = await pool.query('SELECT VERSION() AS version, DATABASE() AS db');
    const r = rows[0];
    console.log('✔ Пул создан (лимит: 10)');
    console.log(`Версия MySQL: ${r.version}`);
    console.log(`Текущая БД: ${r.db}`);
    console.log('✔ Пул готов к работе');
  } catch (err) {
    console.error('✖ Ошибка пула:', err.code, err.message);
  } finally {
    await pool.end();
  }
}

(async () => {
  await singleConnection();
  await poolConnection();
})();
