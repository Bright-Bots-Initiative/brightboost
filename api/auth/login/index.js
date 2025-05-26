const jwt = require('jsonwebtoken');
const { findUserByCredentials } = require('../../shared/auth');

module.exports = async function (context, req) {
  context.log('Processing login request');

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      context.res = {
        status: 400,
        body: { error: 'Email and password are required' }
      };
      return;
    }

    const user = findUserByCredentials(email, password);
    if (!user) {
      context.res = {
        status: 401,
        body: { error: 'Invalid credentials' }
      };
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    context.res = {
      status: 200,
      body: {
        message: 'Login successful',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role }
      }
    };
  } catch (error) {
    context.log.error('Login error:', error);
    context.res = {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
};
