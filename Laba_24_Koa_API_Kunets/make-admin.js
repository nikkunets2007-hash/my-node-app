require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const result = await db.collection('users').updateOne(
    { email: 'ivan_auth@example.com' },
    { $set: { role: 'admin' } }
  );
  console.log('Обновлено пользователей:', result.modifiedCount);
  await client.close();
})();
