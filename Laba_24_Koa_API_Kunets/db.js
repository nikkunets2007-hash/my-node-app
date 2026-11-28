// Лабораторная работа №24, Задание 1
// Подключение к MongoDB
// Студент: Кунец Никита, группа 401

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require('dotenv').config();
const { MongoClient } = require('mongodb');

const URI = process.env.MONGO_URI;
const DB_NAME = process.env.DB_NAME;

let client = null;
let db = null;

async function connectDB() {
  if (db) return db;
  if (!URI) throw new Error('MONGO_URI не задан в .env');
  console.log('[DEBUG] Подключение к:', URI.replace(/:[^:@]+@/, ':***@'));
  client = new MongoClient(URI, { serverSelectionTimeoutMS: 15000 });
  await client.connect();
  console.log('[DEBUG] client.connect() завершён');
  db = client.db(DB_NAME);
  console.log('[INFO] MongoDB подключена');
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[INFO] MongoDB отключена');
  }
}

module.exports = { connectDB, closeDB };
