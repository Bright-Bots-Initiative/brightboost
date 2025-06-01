const prisma = require('../../prisma/client.cjs');

module.exports = async function (context, req) {
  try {
    const users = await prisma.user.findMany();
    context.res = {
      headers: { "Content-Type": "application/json" },
      body: { users }
    };
  } catch (error) {
    context.log.error("Error in dbtest function:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: 'Database test failed.' }
    };
  }
};
