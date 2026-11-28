// Контроллер: валидация + вызов сервиса
const Joi = require('joi');
const User = require('../models/user');
const UserService = require('../services/userService');

const userSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  group_name: Joi.string().pattern(/^(\d{3}|[А-Яа-яA-Za-z]{2,}-\d{2}-\d{2})$/).required(),
  age: Joi.number().integer().min(16).max(100).required(),
  course: Joi.number().integer().min(1).max(4).optional(),
});

// Валидация query-параметров (Задание 3)
const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('name', '-name', 'age', '-age', 'created_at', '-created_at').default('name'),
  group_name: Joi.string().pattern(/^(\d{3}|[А-Яа-яA-Za-z]{2,}-\d{2}-\d{2})$/).optional(),
  course: Joi.number().integer().min(1).max(4).optional(),
  age_min: Joi.number().integer().min(16).optional(),
  age_max: Joi.number().integer().max(100).optional(),
});

exports.list = async (ctx) => {
  const { error, value } = querySchema.validate(ctx.query);
  if (error) {
    ctx.status = 400;
    ctx.body = {
      error: 'Validation failed',
      details: error.details.map((d) => ({ field: d.path[0], message: d.message })),
    };
    return;
  }
  const result = await User.findAll(ctx, value);
  ctx.body = result;
};

exports.getById = async (ctx) => {
  const user = await UserService.findById(ctx, ctx.params.id);
  if (!user) ctx.throw(404, 'User not found');
  ctx.body = { data: user };
};

exports.create = async (ctx) => {
  const { error, value } = userSchema.validate(ctx.request.body);
  if (error) {
    ctx.status = 400;
    ctx.body = {
      error: 'Validation failed',
      details: error.details.map((d) => ({ field: d.path[0], message: d.message })),
    };
    return;
  }
  const user = await UserService.create(ctx, value);
  ctx.status = 201;
  ctx.body = { data: user };
};

exports.update = async (ctx) => {
  const { error, value } = userSchema.validate(ctx.request.body, { presence: 'optional' });
  if (error) {
    ctx.status = 400;
    ctx.body = {
      error: 'Validation failed',
      details: error.details.map((d) => ({ field: d.path[0], message: d.message })),
    };
    return;
  }
  const ok = await UserService.update(ctx, ctx.params.id, value);
  if (!ok) ctx.throw(404, 'User not found');
  ctx.body = { data: { updated: true, id: ctx.params.id } };
};

exports.delete = async (ctx) => {
  const ok = await UserService.delete(ctx, ctx.params.id);
  if (!ok) ctx.throw(404, 'User not found');
  ctx.body = { data: { deleted: true, id: ctx.params.id } };
};

exports.search = async (ctx) => {
  const q = ctx.query.q;
  if (!q) ctx.throw(400, 'Query parameter "q" is required');
  const data = await User.search(ctx, q);
  ctx.body = { found: data.length, data };
};

exports.stats = async (ctx) => {
  const stats = await User.getStats(ctx);
  ctx.body = stats;
};

exports.exportCsv = async (ctx) => {
  const users = await User.findAll(ctx, { limit: 1000 });
  const header = 'id,name,email,group_name,age,course\n';
  const rows = users.data.map(u => 
    `${u._id},${u.name},${u.email},${u.group_name},${u.age},${u.course || ''}`
  ).join('\n');
  ctx.set('Content-Type', 'text/csv; charset=utf-8');
  ctx.set('Content-Disposition', 'attachment; filename="users.csv"');
  ctx.body = header + rows;
};
