const jwt = require('jsonwebtoken');
const { findUserByEmail, addUser, JWT_SECRET } = require('../../shared/auth');

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

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      context.res = {
        status: 400,
        body: { error: 'User with this email already exists' }
      };
      return;
    }

    const userData = {
      name,
      email,
      password,
      role,
      xp: 0,
      level: 1,
      streak: 0
    };

    const newUser = await addUser(userData);

    const token = jwt.sign(
      { 
        id: newUser.id, 
        email: newUser.email, 
        role: newUser.role,
        xp: newUser.xp,
        level: newUser.level,
        streak: newUser.streak
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    context.res = {
      status: 201,
      body: {
        message: 'User registered successfully',
        token,
        user: { 
          id: newUser.id, 
          name: newUser.name, 
          email: newUser.email, 
          role: newUser.role,
          xp: newUser.xp,
          level: newUser.level,
          streak: newUser.streak || 0,
          badges: [] // Will be fetched separately in the future
        }
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
