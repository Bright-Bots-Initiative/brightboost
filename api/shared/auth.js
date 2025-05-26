const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const users = [
  {
    id: '1',
    name: 'Test Teacher',
    email: 'teacher@example.com',
    password: 'password123',
    role: 'teacher'
  },
  {
    id: '2',
    name: 'Test Student',
    email: 'student@example.com',
    password: 'password123',
    role: 'student'
  }
];

const verifyToken = (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }
    
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const findUserByCredentials = (email, password) => {
  return users.find(user => user.email === email && user.password === password);
};

const findUserByEmail = (email) => {
  return users.find(user => user.email === email);
};

const addUser = (user) => {
  users.push(user);
  return user;
};

module.exports = {
  verifyToken,
  findUserByCredentials,
  findUserByEmail,
  addUser,
  users
};
