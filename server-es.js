// server-es.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Mock database
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

// Login endpoint
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Find user
  const user = users.find(user => user.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Return user data (in a real app, you'd generate a JWT token here)
  res.json({
    message: 'Login successful',
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Signup endpoint
app.post('/auth/signup', (req, res) => {
  const { name, email, password, role } = req.body;
  
  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Check if user already exists
  if (users.find(user => user.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create new user
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password,
    role
  };
  
  users.push(newUser);
  
  res.status(201).json({
    message: 'User created successfully',
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
  });
});

// Serve static files
app.use(express.static(join(__dirname, 'dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`) ;
});
