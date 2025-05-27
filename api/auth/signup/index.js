const jwt = require('jsonwebtoken');
const { findUserByEmail, addUser } = require('../../shared/auth');

module.exports = async function (context, req) {
  context.log('Processing signup request');

  try {
    const { email, password, name, role } = req.body;

    if (!email || !password || !name || !role) {
      context.res = {
        status: 400,
        body: { error: 'All fields are required' }
      };
      return;
    }

    const existingUser = findUserByEmail(email);
    if (existingUser) {
      context.res = {
        status: 400,
        body: { error: 'User with this email already exists' }
      };
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password, // In production, hash the password
      role
    };

    addUser(newUser);

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    context.res = {
      status: 201,
      body: {
        message: 'User registered successfully',
        token,
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
      }
    };
  } catch (error) {
    context.log.error('Signup error:', error);
    context.res = {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
};
