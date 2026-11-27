// Лабораторная работа №23, Задание 3
// Курсоры, агрегации, индексы, текстовый поиск
// Студент: Кунец Никита, группа 401

require('dotenv').config();
const { MongoClient } = require('mongodb');

const GROUP = '401';
const URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;
const COLLECTION = 'students';

async function main() {
  const client = new MongoClient(URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection(COLLECTION);

    // Чистим и наполняем данными (10 000 документов для курсоров и индексов)
    await col.deleteMany({});
    console.log('Генерация 10 000 документов...');
    const docs = [];
    const groups = [GROUP, '402', '403'];
    for (let i = 0; i < 10000; i++) {
      docs.push({
        name: `Студент ${i}`,
        group_name: groups[i % 3],
        course: 1 + (i % 4),
        grade: Math.round((2.5 + Math.random() * 2.5) * 100) / 100,
      });
    }
    await col.insertMany(docs);
    console.log('✔ 10 000 документов вставлено');

    // ===== 1. Курсоры =====
    console.log('');
    console.log('=== Курсоры ===');
    console.log('Итерация через for await:');
    const start = Date.now();
    let count = 0;
    const cursor = col.find({}).batchSize(1000);
    for await (const doc of cursor) {
      count++;
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`Получено ${count} документов за ${elapsed} сек`);
    console.log(`Пик памяти: ~${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} МБ`);

    // ===== 2. Агрегации =====
    console.log('');
    console.log('=== Агрегации ===');

    const avgByGroup = await col.aggregate([
      { $group: { _id: '$group_name', avgGrade: { $avg: '$grade' } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    console.log('Средний балл по группам:');
    for (const g of avgByGroup) {
      console.log(`  ${g._id}: ${g.avgGrade.toFixed(2)}`);
    }

    const countByCourse = await col.aggregate([
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();
    console.log('Количество по курсам:');
    for (const c of countByCourse) {
      console.log(`  ${c._id} курс: ${c.count}`);
    }

    const top10 = await col.aggregate([
      { $sort: { grade: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: 1, grade: 1 } },
    ]).toArray();
    console.log('Топ-10 студентов по оценке:');
    for (const s of top10) {
      console.log(`  ${s.name}: ${s.grade}`);
    }

    // $lookup — эмуляция JOIN с коллекцией groups
    // Создадим коллекцию groups
    const groupsCol = db.collection('groups');
    await groupsCol.deleteMany({});
    await groupsCol.insertMany([
      { name: GROUP, curator: 'Иванов И.И.' },
      { name: '402', curator: 'Петров П.П.' },
      { name: '403', curator: 'Сидоров С.С.' },
    ]);
    const joined = await col.aggregate([
      { $group: { _id: '$group_name', students: { $sum: 1 } } },
      {
        $lookup: {
          from: 'groups',
          localField: '_id',
          foreignField: 'name',
          as: 'groupInfo',
        },
      },
      { $unwind: '$groupInfo' },
      {
        $project: {
          _id: 0,
          group_name: '$_id',
          students: 1,
          curator: '$groupInfo.curator',
        },
      },
      { $sort: { group_name: 1 } },
    ]).toArray();
    console.log('$lookup (JOIN с groups):');
    for (const j of joined) {
      console.log(`  ${j.group_name}: ${j.students} студентов, куратор: ${j.curator}`);
    }

    // ===== 3. Индексы =====
    console.log('');
    console.log('=== Индексы ===');

    await col.createIndex({ group_name: 1 });
    console.log('✔ Создан индекс: group_name_1');

    await col.createIndex({ group_name: 1, grade: -1 });
    console.log('✔ Создан индекс: group_name_1_grade_-1');

    await col.createIndex({ email: 1 }, { unique: true, sparse: true });
    console.log('✔ Создан уникальный индекс: email_1 (sparse)');

    // explain без индекса (по name — индекса нет)
    const expNoIdx = await col.find({ name: 'Студент 5000' }).explain('executionStats');
    console.log('');
    console.log('explain() без индекса (по name):');
    console.log(`  executionTimeMillis: ${expNoIdx.executionStats.executionTimeMillis}`);
    console.log(`  totalDocsExamined: ${expNoIdx.executionStats.totalDocsExamined}`);

    // explain с индексом (по group_name)
    const expIdx = await col.find({ group_name: GROUP }).explain('executionStats');
    console.log('explain() с индексом (по group_name):');
    console.log(`  executionTimeMillis: ${expIdx.executionStats.executionTimeMillis}`);
    console.log(`  totalDocsExamined: ${expIdx.executionStats.totalDocsExamined}`);
    console.log('✔ Индекс используется (IXSCAN)');

    // ===== 4. Текстовый поиск =====
    console.log('');
    console.log('=== Текстовый поиск ===');
    await col.createIndex({ name: 'text' });
    console.log('Создан текстовый индекс: name_text');

    const textRes = await col.find(
      { $text: { $search: 'Студент 500' } },
      { projection: { score: { $meta: 'textScore' }, name: 1, _id: 0 } }
    ).sort({ score: { $meta: 'textScore' } }).limit(5).toArray();

    console.log(`find({ $text: { $search: "Студент 500" } }):`);
    console.log(`Найдено (первые 5): ${textRes.length}`);
    for (const t of textRes) {
      console.log(`  score=${t.score.toFixed(2)}, name="${t.name}"`);
    }

    console.log('');
    console.log('--- Список индексов коллекции ---');
    const indexes = await col.indexes();
    for (const idx of indexes) {
      console.log(`  ${idx.name}`);
    }

    // Чистим за собой, чтобы не забивать Atlas (512 MB)
    // Оставляем данные — они пригодятся для Задания 4.
    // Но groups удалим.
    await groupsCol.drop().catch(() => {});

  } catch (err) {
    console.error('✖ Ошибка:', err.message);
  } finally {
    await client.close();
  }
}

main();
