const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const verifyToken = async (context, req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return { 
        isAuthorized: false, 
        error: 'Authorization header missing' 
      };
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return { 
        isAuthorized: false, 
        error: 'Token missing in Authorization header' 
      };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return { 
        isAuthorized: false, 
        error: 'User not found' 
      };
    }

    return {
      isAuthorized: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak
      }
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { 
        isAuthorized: false, 
        error: 'Token expired' 
      };
    }
    
    if (error.name === 'JsonWebTokenError') {
      return { 
        isAuthorized: false, 
        error: 'Invalid token' 
      };
    }
    
    context.log.error('Auth middleware error:', error);
    return { 
      isAuthorized: false, 
      error: 'Authentication error' 
    };
  }
};

const generateToken = (user) => {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
  verifyToken,
  generateToken
};
