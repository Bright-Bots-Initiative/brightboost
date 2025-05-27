const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('./prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

const findUserByCredentials = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  
  if (!user) {
    return null;
  }
  
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return null;
  }
  
  return user;
};

const findUserByEmail = async (email) => {
  return await prisma.user.findUnique({
    where: { email }
  });
};

const addUser = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const user = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
      xp: userData.xp || 0,
      level: userData.level || 1,
      streak: userData.streak || 0
    }
  });
  
  return user;
};

module.exports = {
  verifyToken,
  findUserByCredentials,
  findUserByEmail,
  addUser,
  JWT_SECRET
};
