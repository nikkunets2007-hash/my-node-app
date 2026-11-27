// Лабораторная работа №22, Задание 3
// Обработка ошибок, стриминг, транзакции
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

// ===== 1. Категории ошибок =====
async function demonstrateErrors() {
  console.log('=== Демонстрация ошибок ===');

  // ECONNREFUSED
  try {
    const bad = await mysql.createConnection({ ...config, port: 9999 });
    await bad.end();
  } catch (err) {
    console.log(`[${err.code}] Сервер недоступен: ${config.host}:9999`);
  }

  // ER_ACCESS_DENIED_ERROR
  try {
    const bad = await mysql.createConnection({ ...config, password: 'wrong_password' });
    await bad.end();
  } catch (err) {
    console.log(`[${err.code}] Неверный пароль для пользователя ${config.user}`);
  }

  // ER_PARSE_ERROR
  const pool = mysql.createPool(config);
  try {
    await pool.query('SELECT * FRM students');
  } catch (err) {
    console.log(`[${err.code}] Синтаксическая ошибка: SELECT * FRM students`);
  }

  // ER_DUP_ENTRY
  await pool.query(`DROP TABLE IF EXISTS test_dup`);
  await pool.query(`CREATE TABLE test_dup (
    id INT PRIMARY KEY,
    name VARCHAR(50) NOT NULL
  )`);
  await pool.query(`INSERT INTO test_dup VALUES (1, 'A')`);
  try {
    await pool.query(`INSERT INTO test_dup VALUES (1, 'B')`);
  } catch (err) {
    console.log(`[${err.code}] Дублирование ключа: id=1`);
  }

  // ER_BAD_NULL_ERROR (name NOT NULL)
  try {
    await pool.query(`INSERT INTO test_dup (id, name) VALUES (2, NULL)`);
  } catch (err) {
    console.log(`[${err.code}] NULL в NOT NULL столбце: name`);
  }

  await pool.query(`DROP TABLE IF EXISTS test_dup`);
  await pool.end();
}

// ===== 2. Обработка ошибок пула =====
async function poolErrorHandling() {
  console.log('');
  console.log('=== Обработка ошибок пула ===');
  const pool = mysql.createPool(config);

  pool.on('error', (err) => {
    console.log(`[POOL ERROR] ${err.code}`);
  });

  console.log('[POOL] Обработчик ошибок установлен');
  console.log('[POOL] При критических ошибках пул пересоздаётся');

  await pool.end();
}

// ===== 3. Потоковый запрос =====
async function streamingDemo() {
  console.log('');
  console.log('=== Потоковый запрос ===');

  const pool = mysql.createPool(config);
  const conn = await pool.getConnection();

  try {
    await conn.query('DROP TABLE IF EXISTS big_data');
    await conn.query(`CREATE TABLE big_data (
      id INT PRIMARY KEY AUTO_INCREMENT,
      value VARCHAR(50),
      num INT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    console.log('Генерация 100000 записей...');
    const batchSize = 1000;
    const totalRows = 100000;
    for (let i = 0; i < totalRows; i += batchSize) {
      const values = [];
      for (let j = 0; j < batchSize; j++) {
        values.push(`('value_${i + j}', ${i + j})`);
      }
      await conn.query(`INSERT INTO big_data (value, num) VALUES ${values.join(',')}`);
    }
    console.log('✔ 100000 записей создано');

    console.log('Чтение 100000 записей через .stream()...');
    const start = Date.now();
    let count = 0;
    const stream = conn.connection.query('SELECT * FROM big_data').stream();

    await new Promise((resolve, reject) => {
      stream.on('data', () => {
        count++;
        if (count % 10000 === 0) {
          console.log(`[STREAM] Получено: ${count} (${Math.round((count / totalRows) * 100)}%)`);
        }
      });
      stream.on('end', () => {
        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`✔ Обработано за ${elapsed} сек`);
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        console.log(`Пик памяти: ${mem} МБ`);
        resolve();
      });
      stream.on('error', reject);
    });

    console.log('');
    console.log('Сравнение: SELECT целиком');
    const memBefore = process.memoryUsage().heapUsed;
    const [allRows] = await conn.query('SELECT * FROM big_data');
    const memAfter = process.memoryUsage().heapUsed;
    console.log(`Загружено ${allRows.length} строк в память`);
    console.log(`Прирост памяти: ${((memAfter - memBefore) / 1024 / 1024).toFixed(1)} МБ`);
    console.log('(при больших объёмах это приводит к JavaScript heap out of memory)');
  } finally {
    conn.release();
    await pool.end();
  }
}

// ===== 4. Транзакции =====
async function transactionDemo() {
  console.log('');
  console.log('=== Транзакция ===');

  const pool = mysql.createPool(config);
  const conn = await pool.getConnection();

  try {
    await conn.query('DROP TABLE IF EXISTS tx_test');
    await conn.query(`CREATE TABLE tx_test (
      id INT PRIMARY KEY,
      name VARCHAR(50)
    ) ENGINE=InnoDB`);

    console.log('Начало транзакции (успешной)');
    await conn.beginTransaction();
    try {
      await conn.query(`INSERT INTO tx_test VALUES (1, 'Первый')`);
      console.log('✔ INSERT 1 выполнен');
      await conn.query(`INSERT INTO tx_test VALUES (2, 'Второй')`);
      console.log('✔ INSERT 2 выполнен');
      await conn.commit();
      console.log('✔ COMMIT выполнен');
    } catch (e) {
      await conn.rollback();
      console.log('✖ ROLLBACK выполнен');
    }

    console.log('');
    console.log('Начало транзакции (с ошибкой)');
    await conn.beginTransaction();
    try {
      await conn.query(`INSERT INTO tx_test VALUES (3, 'Третий')`);
      console.log('✔ INSERT 3 выполнен');
      await conn.query(`INSERT INTO tx_test VALUES (1, 'Дубликат')`);
      console.log('✔ INSERT 4 выполнен');
      await conn.commit();
      console.log('✔ COMMIT выполнен');
    } catch (e) {
      console.log(`✖ INSERT не выполнен (${e.code})`);
      await conn.rollback();
      console.log('Rollback выполнен');
    }

    const [rows] = await conn.query('SELECT * FROM tx_test ORDER BY id');
    console.log('');
    console.log('Содержимое tx_test после транзакций:');
    for (const r of rows) console.log(`  id=${r.id}, name=${r.name}`);
    console.log('(запись id=3 откатилась, т.к. транзакция не завершилась)');
  } finally {
    conn.release();
    console.log('Соединение возвращено в пул');
    await pool.end();
  }
}

(async () => {
  await demonstrateErrors();
  await poolErrorHandling();
  await streamingDemo();
  await transactionDemo();
})();
