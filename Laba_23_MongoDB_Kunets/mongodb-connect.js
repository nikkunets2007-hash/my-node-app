// Лабораторная работа №23, Задание 1
// Подключение к MongoDB и простой запрос
// Студент: Кунец Никита, группа 401

require('dotenv').config();
const { MongoClient } = require('mongodb');

const GROUP = '401';
const URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

async function main() {
  console.log('=== Подключение к MongoDB ===');
  const client = new MongoClient(URI);

  client.on('serverHeartbeatSucceeded', () => {
    console.log(`[HEARTBEAT] Успешно: ${new Date().toISOString()}`);
  });
  client.on('serverHeartbeatFailed', (event) => {
    console.log(`[HEARTBEAT] Ошибка: ${event.failure.message}`);
  });

  try {
    await client.connect();
    console.log('✔ Подключение установлено');

    const db = client.db(DB_NAME);
    const admin = client.db().admin();

    await db.command({ ping: 1 });

    const buildInfo = await admin.command({ buildInfo: 1 });
    console.log(`Версия MongoDB: ${buildInfo.version}`);
    console.log(`База данных: ${DB_NAME}`);
    console.log(`Группа: ${GROUP}`);

    console.log('');
    console.log('=== Информация о сервере ===');
    const dbs = await admin.listDatabases();
    console.log('Список БД:');
    for (const d of dbs.databases) console.log(`- ${d.name}`);

    const collections = await db.listCollections().toArray();
    console.log(`Коллекции в ${DB_NAME}:`);
    if (collections.length === 0) {
      console.log('(пусто — БД создана лениво)');
    } else {
      for (const c of collections) console.log(`- ${c.name}`);
    }

    console.log('');
    console.log('=== Heartbeat ===');
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('✔ Соединение стабильно');
  } catch (err) {
    console.error('✖ Ошибка подключения:', err.message);
  } finally {
    await client.close();
    console.log('✖ Соединение закрыто');
  }
}

main();
