const { verifyToken, users } = require('../shared/auth');

module.exports = async function (context, req) {
  context.log('Processing profile request');

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      context.res = {
        status: 401,
        body: { error: 'Authorization header is required' }
      };
      return;
    }

    const decoded = verifyToken(authHeader);
    
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      context.res = {
        status: 404,
        body: { error: 'User not found' }
      };
      return;
    }
    
    context.res = {
      status: 200,
      body: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    context.log.error('Profile error:', error);
    context.res = {
      status: 401,
      body: { error: 'Invalid token' }
    };
  }
};
