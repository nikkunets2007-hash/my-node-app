// Middleware: внедрение БД в ctx.db
const { connectDB } = require('../db');

module.exports = async (ctx, next) => {
  ctx.db = await connectDB();
  await next();
};
