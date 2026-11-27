// Лабораторная работа №22, Задание 4
// Слой доступа к данным (DAO) с валидацией
// Студент: Кунец Никита, группа 401

require('dotenv').config();
const mysql = require('mysql2/promise');

const GROUP = '401';

class StudentDAO {
  constructor(pool) {
    this.pool = pool;
    this.table = 'students';
  }

  validate(data) {
    if (!data.name || data.name.length < 2 || data.name.length > 100) {
      throw new Error('name слишком короткое (мин. 2 символа)');
    }
    if (!data.group_name || !/^(\d{3}|[А-Яа-яA-Za-z]{2,}-\d{2}-\d{2})$/.test(data.group_name)) {
      throw new Error('group_name не соответствует формату (401 или ББМО-XX-XX)');
    }
    if (!Number.isInteger(data.course) || data.course < 1 || data.course > 4) {
      throw new Error('course должен быть целым от 1 до 4');
    }
    if (data.grade !== null && data.grade !== undefined) {
      if (typeof data.grade !== 'number' || data.grade < 0 || data.grade > 5) {
        throw new Error('grade должен быть от 0 до 5 или NULL');
      }
    }
  }

  async create(data) {
    this.validate(data);
    const [r] = await this.pool.execute(
      `INSERT INTO ${this.table} (name, group_name, course, grade) VALUES (?, ?, ?, ?)`,
      [data.name, data.group_name, data.course, data.grade ?? null]
    );
    return { id: r.insertId, ...data };
  }

  async findById(id) {
    const [rows] = await this.pool.execute(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  async findAll(options = {}) {
    const limit = Math.min(options.limit ?? 10, 100);
    const offset = options.offset ?? 0;
    const where = [];
    const params = [];

    if (options.group_name) {
      where.push('group_name = ?');
      params.push(options.group_name);
    }
    if (options.course) {
      where.push('course = ?');
      params.push(options.course);
    }
    if (options.grade_min !== undefined) {
      where.push('grade >= ?');
      params.push(options.grade_min);
    }
    if (options.grade_max !== undefined) {
      where.push('grade <= ?');
      params.push(options.grade_max);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    let orderSql = 'ORDER BY id ASC';
    if (options.order_by === 'name') orderSql = 'ORDER BY name ASC';
    if (options.order_by === 'name_desc') orderSql = 'ORDER BY name DESC';
    if (options.order_by === 'grade') orderSql = 'ORDER BY grade ASC';
    if (options.order_by === 'grade_desc') orderSql = 'ORDER BY grade DESC';

    const [countRows] = await this.pool.execute(
      `SELECT COUNT(*) AS total FROM ${this.table} ${whereSql}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await this.pool.execute(
      `SELECT * FROM ${this.table} ${whereSql} ${orderSql} LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return {
      data: rows,
      pagination: {
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async update(id, data) {
    const fields = [];
    const params = [];
    for (const [k, v] of Object.entries(data)) {
      if (['name', 'group_name', 'course', 'grade'].includes(k)) {
        fields.push(`${k} = ?`);
        params.push(v);
      }
    }
    if (!fields.length) return false;
    params.push(id);
    const [r] = await this.pool.execute(
      `UPDATE ${this.table} SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
    return r.affectedRows > 0;
  }

  async delete(id) {
    const [r] = await this.pool.execute(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    return r.affectedRows > 0;
  }

  async search(query) {
    const [rows] = await this.pool.execute(
      `SELECT * FROM ${this.table} WHERE name LIKE ? ORDER BY name`,
      [`%${query}%`]
    );
    return rows;
  }

  async getStats() {
    const [totalRow] = await this.pool.query(`SELECT COUNT(*) AS total FROM ${this.table}`);
    const [avgRow] = await this.pool.query(
      `SELECT AVG(grade) AS avg_grade, MIN(grade) AS min_grade, MAX(grade) AS max_grade FROM ${this.table}`
    );
    const [byGroup] = await this.pool.query(
      `SELECT group_name, COUNT(*) AS cnt FROM ${this.table} GROUP BY group_name`
    );
    const [byCourse] = await this.pool.query(
      `SELECT course, COUNT(*) AS cnt FROM ${this.table} GROUP BY course ORDER BY course`
    );
    return {
      total: totalRow[0].total,
      averageGrade: Number(avgRow[0].avg_grade || 0).toFixed(2),
      minGrade: avgRow[0].min_grade,
      maxGrade: avgRow[0].max_grade,
      byGroup,
      byCourse,
    };
  }
}

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
  });

  const dao = new StudentDAO(pool);

  await pool.query('DROP TABLE IF EXISTS students');
  await pool.query(`
    CREATE TABLE students (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      group_name VARCHAR(20) NOT NULL,
      course INT NOT NULL,
      grade DECIMAL(3,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log(`=== StudentDAO (группа ${GROUP}) ===`);

  const groups = ['401', '402', '403'];
  const names = ['Иван', 'Мария', 'Петр', 'Анна', 'Олег', 'Елена', 'Дмитрий', 'Ольга'];
  for (let i = 0; i < 100; i++) {
    await dao.create({
      name: `${names[i % names.length]} ${i}`,
      group_name: groups[i % 3],
      course: 1 + (i % 4),
      grade: Math.round((2.5 + Math.random() * 2.5) * 100) / 100,
    });
  }
  console.log('✔ Создано 100 студентов');

  console.log('');
  console.log('--- Создание с валидацией ---');
  try {
    await dao.create({ name: 'X', group_name: '401', course: 2, grade: 4.5 });
  } catch (e) {
    console.log(`✖ Ошибка: ${e.message}`);
  }
  try {
    await dao.create({ name: 'Иван', group_name: 'BAD', course: 2, grade: 4.5 });
  } catch (e) {
    console.log(`✖ Ошибка: ${e.message}`);
  }

  console.log('');
  console.log('--- Пагинация ---');
  const page1 = await dao.findAll({ limit: 5, offset: 0 });
  console.log(`findAll({ limit: 5, offset: 0 }):`);
  console.log(`Всего: ${page1.pagination.total}, Страница: ${page1.pagination.page}/${page1.pagination.pages}`);
  for (const s of page1.data) {
    console.log(`id=${s.id}, name=${s.name}, group=${s.group_name}, grade=${s.grade}`);
  }

  console.log('');
  console.log('--- Фильтры ---');
  const filtered = await dao.findAll({ group_name: '401', course: 2 });
  console.log(`findAll({ group_name: '401', course: 2 }):`);
  console.log(`Найдено: ${filtered.pagination.total} студентов`);

  const byGrade = await dao.findAll({ grade_min: 4.0, grade_max: 5.0, limit: 3 });
  console.log(`findAll({ grade_min: 4.0, grade_max: 5.0 }):`);
  console.log(`Найдено: ${byGrade.pagination.total} студентов`);

  console.log('');
  console.log('--- Поиск ---');
  const searchRes = await dao.search('Иван');
  console.log(`search('Иван'):`);
  console.log(`Найдено: ${searchRes.length} студентов`);
  for (const s of searchRes.slice(0, 3)) {
    console.log(`id=${s.id}, name=${s.name}`);
  }

  console.log('');
  console.log('--- Статистика ---');
  const stats = await dao.getStats();
  console.log(`Всего студентов: ${stats.total}`);
  console.log(`Средний балл: ${stats.averageGrade}`);
  console.log(`Минимальная оценка: ${stats.minGrade}`);
  console.log(`Максимальная оценка: ${stats.maxGrade}`);
  console.log('По группам:');
  for (const g of stats.byGroup) console.log(`  ${g.group_name}: ${g.cnt}`);
  console.log('По курсам:');
  for (const c of stats.byCourse) console.log(`  ${c.course} курс: ${c.cnt}`);

  await pool.end();
}

main().catch((e) => {
  console.error('✖ Фатальная ошибка:', e.message);
  process.exit(1);
});
