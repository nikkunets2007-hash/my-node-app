// Лабораторная работа №23, Задание 2
// CRUD-операции в MongoDB
// Студент: Кунец Никита, группа 401

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

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

    // Чистим коллекцию перед демонстрацией
    await col.deleteMany({});

    console.log(`=== Коллекция ${COLLECTION} (группа ${GROUP}) ===`);

    // ===== ИНДЕКС =====
    await col.createIndex({ group_name: 1 });
    console.log('✔ Индекс по group_name создан');

    // ===== INSERT =====
    console.log('');
    console.log('--- INSERT ---');

    const r1 = await col.insertOne({
      name: 'Иван Иванов',
      group_name: GROUP,
      course: 2,
      grade: 4.5,
      created_at: new Date(),
    });
    console.log(`✔ Вставлен: insertedId=${r1.insertedId}`);

    const r2 = await col.insertMany([
      { name: 'Мария Петрова', group_name: GROUP, course: 2, grade: 3.8, created_at: new Date() },
      { name: 'Петр Сидоров', group_name: GROUP, course: 3, grade: 4.2, created_at: new Date() },
      { name: 'Анна Смирнова', group_name: '402', course: 2, grade: 4.9, created_at: new Date() },
    ]);
    console.log(`✔ Вставлено 3 документа: insertedIds=${JSON.stringify(r2.insertedIds)}`);

    // ===== SELECT =====
    console.log('');
    console.log('--- SELECT ---');

    const all = await col.find({}).toArray();
    console.log(`Все документы (${all.length}):`);
    for (const d of all) {
      console.log(`  { _id: ${d._id}, name: ${d.name}, group: ${d.group_name}, grade: ${d.grade} }`);
    }

    const filtered = await col.find({ group_name: GROUP }).toArray();
    console.log(`\nС фильтром по группе (${filtered.length}):`);
    for (const d of filtered) {
      console.log(`  { name: ${d.name}, group: ${d.group_name}, grade: ${d.grade} }`);
    }

    const sorted = await col.find({}).sort({ grade: -1 }).toArray();
    console.log('\nС сортировкой по grade (DESC):');
    for (const d of sorted) {
      console.log(`  { name: ${d.name}, grade: ${d.grade} }`);
    }

    const paged = await col.find({}).sort({ _id: 1 }).skip(1).limit(2).toArray();
    console.log('\nПагинация (skip 1, limit 2):');
    for (const d of paged) {
      console.log(`  { name: ${d.name} }`);
    }

    const projected = await col.find({}, { projection: { name: 1, grade: 1, _id: 0 } }).toArray();
    console.log('\nС проекцией (только name, grade):');
    for (const d of projected) {
      console.log(`  { name: ${d.name}, grade: ${d.grade} }`);
    }

    // ===== UPDATE =====
    console.log('');
    console.log('--- UPDATE ---');

    const u1 = await col.updateOne({ name: 'Иван Иванов' }, { $set: { grade: 4.8 } });
    console.log(`✔ updateOne: matchedCount=${u1.matchedCount}, modifiedCount=${u1.modifiedCount}`);

    const u2 = await col.updateMany({ group_name: GROUP }, { $inc: { course: 1 } });
    console.log(`✔ updateMany (group=${GROUP}, $inc: course+1): matchedCount=${u2.matchedCount}, modifiedCount=${u2.modifiedCount}`);

    // ===== DELETE =====
    console.log('');
    console.log('--- DELETE ---');

    const d1 = await col.deleteOne({ name: 'Анна Смирнова' });
    console.log(`✔ deleteOne: deletedCount=${d1.deletedCount}`);

    // Удалим всех с оценкой < 4.0
    const d2 = await col.deleteMany({ grade: { $lt: 4.0 } });
    console.log(`✔ deleteMany (grade < 4.0): deletedCount=${d2.deletedCount}`);

    // ===== ФИНАЛ =====
    console.log('');
    console.log('--- Финальное состояние ---');
    const final = await col.find({}).toArray();
    for (const d of final) {
      console.log(`  { name: ${d.name}, group: ${d.group_name}, course: ${d.course}, grade: ${d.grade} }`);
    }
  } catch (err) {
    console.error('✖ Ошибка:', err.message);
  } finally {
    await client.close();
  }
}

main();
