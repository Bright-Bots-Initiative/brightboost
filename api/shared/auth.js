const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

function authMiddleware(context, req, role = null) {
  const user = verifyToken(req);
  
  if (!user) {
    context.res = {
      status: 401,
      body: { error: 'Authentication required' }
    };
    return false;
  }
  
  if (role && user.role !== role) {
    context.res = {
      status: 403,
      body: { error: 'Access denied' }
    };
    return false;
  }
  
  req.user = user;
  return true;
}

module.exports = {
  verifyToken,
  authMiddleware
};
