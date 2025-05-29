const jwt = require('jsonwebtoken');
const prisma = require('../../prisma/client');

// Verify JWT token from Authorization header
const verifyToken = async (context, req) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return { 
        isAuthorized: false, 
        error: 'Authorization header missing' 
      };
    }

    // Extract token from Bearer format
    const token = authHeader.split(' ')[1];
    if (!token) {
      return { 
        isAuthorized: false, 
        error: 'Token missing in Authorization header' 
      };
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database to ensure they still exist
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return { 
        isAuthorized: false, 
        error: 'User not found' 
      };
    }

    // Return user data without sensitive information
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

// Generate JWT token for user
const generateToken = (user) => {
  // Create payload with user data (no sensitive info)
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  
  // Sign token with secret and set expiration
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
  verifyToken,
  generateToken
};
