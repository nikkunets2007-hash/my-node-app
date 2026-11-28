// Модель Auth: пользователи + хэширование паролей
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

class AuthModel {
  static collection(ctx) {
    return ctx.db.collection('users');
  }

  static async register(ctx, data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || 'user',
      created_at: new Date(),
    };
    const result = await this.collection(ctx).insertOne(user);
    return { _id: result.insertedId, ...user };
  }

  static async findByEmail(ctx, email) {
    return await this.collection(ctx).findOne({ email });
  }

  static async findById(ctx, id) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection(ctx).findOne({ _id: new ObjectId(id) });
  }
}

module.exports = AuthModel;
