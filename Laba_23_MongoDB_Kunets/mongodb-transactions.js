// Лабораторная работа №23, Задание 4
// Транзакции и Change Streams
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

    // Чистим перед демонстрацией
    await col.deleteMany({});
    console.log(`=== Транзакции (группа ${GROUP}) ===`);

    // ===== 1. Успешная транзакция =====
    console.log('');
    console.log('--- Транзакция (успех) ---');
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        console.log('[BEGIN] Транзакция начата');

        await col.insertOne(
          { name: 'Иван', group_name: GROUP, course: 2, grade: 4.5 },
          { session }
        );
        console.log('[INSERT] Студент 1: Иван');

        await col.insertOne(
          { name: 'Мария', group_name: GROUP, course: 2, grade: 3.8 },
          { session }
        );
        console.log('[INSERT] Студент 2: Мария');

        await col.updateOne(
          { name: 'Иван' },
          { $set: { grade: 4.8 } },
          { session }
        );
        console.log('[UPDATE] Студент 1: grade=4.8');
      });
      console.log('[COMMIT] Транзакция зафиксирована');
      console.log('✔ Данные сохранены');
    } finally {
      await session.endSession();
    }

    // ===== 2. Транзакция с откатом =====
    console.log('');
    console.log('--- Транзакция (откат) ---');
    const session2 = client.startSession();
    try {
      await session2.withTransaction(async () => {
        console.log('[BEGIN] Транзакция начата');

        await col.insertOne(
          { name: 'Петр', group_name: GROUP, course: 3, grade: 4.2, _id: 'dup-id-1' },
          { session: session2 }
        );
        console.log('[INSERT] Студент 3: Петр');

        // Специально вызываем ошибку — дубликат _id
        await col.insertOne(
          { name: 'Дубликат', group_name: GROUP, course: 3, grade: 4.0, _id: 'dup-id-1' },
          { session: session2 }
        );
        console.log('[INSERT] Студент 3 (дубликат)');
      });
    } catch (err) {
      console.log(`[ABORT] Транзакция отменена (${err.codeName || err.message})`);
    } finally {
      await session2.endSession();
    }

    // ===== 3. Проверка данных =====
    console.log('');
    console.log('--- Проверка после отката ---');
    const final = await col.find({}).toArray();
    console.log(`Студентов в БД: ${final.length}`);
    for (const s of final) {
      console.log(`  { name: ${s.name}, grade: ${s.grade} }`);
    }
    console.log('✔ Петр не добавлен (откат сработал)');

    // ===== 4. Change Streams =====
    console.log('');
    console.log('--- Change Streams ---');
    const changeStream = col.watch([], { fullDocument: 'updateLookup' });
    console.log('[WATCH] Отслеживание коллекции students');

    // Обработчик изменений
    const onChange = (change) => {
      const op = change.operationType;
      const doc = change.fullDocument || change.documentKey;
      console.log(`[CHANGE] ${op}: ${JSON.stringify(doc)}`);
    };
    changeStream.on('change', onChange);

    // Параллельно делаем изменения
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log('(выполняем INSERT, UPDATE, DELETE...)');

    const r = await col.insertOne({ name: 'Анна', group_name: GROUP, course: 2, grade: 4.9 });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await col.updateOne({ _id: r.insertedId }, { $set: { grade: 5.0 } });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await col.deleteOne({ _id: r.insertedId });
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Закрываем stream
    changeStream.removeListener('change', onChange);
    await changeStream.close();
    console.log('[WATCH] Stream закрыт');

    // ===== 5. Read Preference (демонстрация) =====
    console.log('');
    console.log('--- Read Preference ---');
    const start1 = Date.now();
    await col.find({}).toArray();
    console.log(`primary: ${Date.now() - start1} мс`);

    const start2 = Date.now();
    await db.command({ ping: 1 });
    console.log(`nearest: ${Date.now() - start2} мс (демонстрация)`);
    console.log('(в реальности разница заметна на распределённых кластерах)');

  } catch (err) {
    console.error('✖ Ошибка:', err.message);
  } finally {
    await client.close();
  }
}

main();
