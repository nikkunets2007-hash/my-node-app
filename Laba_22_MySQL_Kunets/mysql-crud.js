// Лабораторная работа №22, Задание 2
// CRUD-операции с таблицей students
// Студент: Кунец Никита, группа 401

require('dotenv').config();
const mysql = require('mysql2/promise');

const GROUP = '401';
const TABLE = 'students';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

async function main() {
  // ===== Создание таблицы =====
  console.log('=== Создание таблицы ===');
  await pool.query(`DROP TABLE IF EXISTS ${TABLE}`);
  await pool.query(`
    CREATE TABLE ${TABLE} (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      group_name VARCHAR(20) NOT NULL,
      course INT NOT NULL,
      grade DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('✔ Таблица students создана');

  // ===== INSERT =====
  console.log('');
  console.log('=== INSERT ===');

  // Один студент
  const [r1] = await pool.execute(
    `INSERT INTO ${TABLE} (name, group_name, course, grade) VALUES (?, ?, ?, ?)`,
    ['Иван', GROUP, 2, 4.5]
  );
  console.log(`✔ Вставлен студент: id=${r1.insertId}, affectedRows=${r1.affectedRows}`);

  // Несколько студентов
  const [r2] = await pool.query(
    `INSERT INTO ${TABLE} (name, group_name, course, grade) VALUES
      ('Мария', '${GROUP}', 2, 3.8),
      ('Петр', '${GROUP}', 3, 4.2),
      ('Анна', '402', 2, 4.7)`
  );
  console.log(`✔ Вставлено 3 студента: affectedRows=${r2.affectedRows}`);

  // ===== SELECT =====
  console.log('');
  console.log('=== SELECT ===');
  console.log('Все студенты:');
  const [all] = await pool.query(`SELECT * FROM ${TABLE}`);
  for (const s of all) {
    console.log(`id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${s.grade}`);
  }

  console.log(`\nСтуденты группы ${GROUP} (сортировка по grade):`);
  const [sorted] = await pool.query(
    `SELECT * FROM ${TABLE} WHERE group_name = ? ORDER BY grade DESC`,
    [GROUP]
  );
  for (const s of sorted) {
    console.log(`id=${s.id}, name=${s.name}, grade=${s.grade}`);
  }

  // Пагинация
  console.log('\nПагинация LIMIT 2 OFFSET 1:');
  const [paged] = await pool.query(`SELECT * FROM ${TABLE} LIMIT 2 OFFSET 1`);
  for (const s of paged) {
    console.log(`id=${s.id}, name=${s.name}`);
  }

  // ===== UPDATE =====
  console.log('');
  console.log('=== UPDATE ===');
  const [u1] = await pool.execute(
    `UPDATE ${TABLE} SET grade = ? WHERE id = ?`,
    [4.8, 1]
  );
  console.log(`✔ Обновлён студент id=1: affectedRows=${u1.affectedRows}, changedRows=${u1.changedRows}`);

  // Повторное обновление тем же значением
  const [u2] = await pool.execute(
    `UPDATE ${TABLE} SET grade = ? WHERE id = ?`,
    [4.8, 1]
  );
  console.log(`✔ Повторное обновление: affectedRows=${u2.affectedRows}, changedRows=${u2.changedRows}`);

  // ===== DELETE =====
  console.log('');
  console.log('=== DELETE ===');
  const [d1] = await pool.execute(`DELETE FROM ${TABLE} WHERE id = ?`, [1]);
  console.log(`✔ Удалён студент id=1: affectedRows=${d1.affectedRows}`);

  // ===== Защита от SQL-инъекции =====
  console.log('');
  console.log('=== Защита от SQL-инъекции ===');
  const evil = "'; DROP TABLE students; --";
  console.log(`Попытка инъекции: "${evil}"`);

  // Безопасный параметризованный запрос
  const [safe] = await pool.execute(
    `SELECT * FROM ${TABLE} WHERE name = ?`,
    [evil]
  );
  console.log(`✔ Параметризованный запрос безопасен (найдено: ${safe.length})`);

  // Проверяем, что таблица не удалена
  const [tables] = await pool.query(`SHOW TABLES LIKE '${TABLE}'`);
  console.log(`Таблица students существует: ${tables.length === 1 ? 'да' : 'нет'}`);
  console.log('✖ Конкатенация привела бы к удалению таблицы');

  // ===== Финальный SELECT =====
  console.log('');
  console.log('=== Финальное состояние ===');
  const [final] = await pool.query(`SELECT * FROM ${TABLE}`);
  for (const s of final) {
    console.log(`id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${s.grade}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error('✖ Ошибка:', err.code, err.message);
  process.exit(1);
});
