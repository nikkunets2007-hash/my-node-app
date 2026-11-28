// Модель User: инкапсулирует работу с MongoDB
const { ObjectId } = require('mongodb');

class User {
  static collection(ctx) {
    return ctx.db.collection('users');
  }

  // Пагинация, фильтрация, сортировка
  static async findAll(ctx, options = {}) {
    const { page = 1, limit = 10, sort = 'name', group_name, course, age_min, age_max } = options;
    const skip = (page - 1) * limit;
    
    // Фильтры
    const filter = {};
    if (group_name) filter.group_name = group_name;
    if (course) filter.course = Number(course);
    if (age_min || age_max) {
      filter.age = {};
      if (age_min) filter.age.$gte = Number(age_min);
      if (age_max) filter.age.$lte = Number(age_max);
    }

    // Сортировка (поддержка - для убывания)
    let sortObj = { name: 1 };
    if (sort) {
      const order = sort.startsWith('-') ? -1 : 1;
      const field = sort.replace('-', '');
      sortObj = { [field]: order };
    }

    const total = await this.collection(ctx).countDocuments(filter);
    const data = await this.collection(ctx)
      .find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .toArray();

    return {
      data,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  static async findById(ctx, id) {
    if (!ObjectId.isValid(id)) return null;
    return await this.collection(ctx).findOne({ _id: new ObjectId(id) });
  }

  static async findByEmail(ctx, email) {
    return await this.collection(ctx).findOne({ email });
  }

  static async create(ctx, data) {
    data.created_at = new Date();
    const result = await this.collection(ctx).insertOne(data);
    return { _id: result.insertedId, ...data };
  }

  static async update(ctx, id, data) {
    if (!ObjectId.isValid(id)) return false;
    data.updated_at = new Date();
    const result = await this.collection(ctx).updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return result.matchedCount > 0;
  }

  static async delete(ctx, id) {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection(ctx).deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }

  // Поиск по имени и email
  static async search(ctx, query) {
    return await this.collection(ctx).find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    }).limit(50).toArray();
  }

  // Статистика (агрегация)
  static async getStats(ctx) {
    const total = await this.collection(ctx).countDocuments();
    const avgAge = await this.collection(ctx).aggregate([
      { $group: { _id: null, avg: { $avg: '$age' } } },
    ]).toArray();
    
    const byGroup = await this.collection(ctx).aggregate([
      { $group: { _id: '$group_name', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();

    const byCourse = await this.collection(ctx).aggregate([
      { $match: { course: { $exists: true } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray();

    return {
      total,
      averageAge: avgAge[0]?.avg || 0,
      byGroup: Object.fromEntries(byGroup.map(g => [g._id, g.count])),
      byCourse: Object.fromEntries(byCourse.map(c => [c._id, c.count])),
    };
  }
}

module.exports = User;
