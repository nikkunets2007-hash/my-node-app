// Бизнес-логика
const User = require('../models/user');

class UserService {
  static async create(ctx, data) {
    console.log(`[SERVICE] Создание пользователя: ${data.email}`);

    // Проверка уникальности email
    const existing = await User.findByEmail(ctx, data.email);
    if (existing) {
      console.log(`[SERVICE] Email уже существует`);
      const err = new Error('Email already exists');
      err.status = 409;
      throw err;
    }

    const user = await User.create(ctx, data);
    console.log(`[SERVICE] Email отправлен: ${user.email}`);
    return user;
  }

  static async findAll(ctx) {
    return await User.findAll(ctx);
  }

  static async findById(ctx, id) {
    return await User.findById(ctx, id);
  }

  static async update(ctx, id, data) {
    return await User.update(ctx, id, data);
  }

  static async delete(ctx, id) {
    return await User.delete(ctx, id);
  }
}

module.exports = UserService;
