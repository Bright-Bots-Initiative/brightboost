// middleware/auth.cjs
const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for Express routes
 * 
 * This middleware:
 * 1. Extracts the JWT token from the Authorization header
 * 2. Verifies the token using the JWT_SECRET
 * 3. Adds the decoded user data to the request object
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get JWT secret from environment or use default for tests
    const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    console.log('Decoded token:', decoded);
    
    // Add user data to request
    req.user = decoded;
    
    // Continue to next middleware/route handler
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
