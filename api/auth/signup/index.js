const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

module.exports = async function (context, req) {
  context.log('Processing signup request');
  
  if (req.method !== 'POST') {
    context.res = { status: 405, body: { error: 'Method not allowed' } };
    return;
  }
  
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password || !role) {
    context.res = { status: 400, body: { error: 'All fields are required' } };
    return;
  }
  
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      context.res = { status: 400, body: { error: 'User with this email already exists' } };
      return;
    }
    
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role
      }
    });
    
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
        user: { 
          id: newUser.id, 
          name: newUser.name, 
          email: newUser.email, 
          role: newUser.role 
        }
      }
    };
  } catch (error) {
    context.log.error('Error creating user:', error);
    context.res = {
      status: 500,
      body: { error: 'Failed to create user' }
    };
  }
};
