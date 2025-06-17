// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');

// Import middleware
const authMiddleware = require('./middleware/auth').default;

// Initialize Express app
const app = express();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://brightboost-web.azurewebsites.net'
    : ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'],
  credentials: true
}));
app.use(bodyParser.json());

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

// API Routes

// Signup endpoint
app.post('/auth/signup', (req, res) => {
  const { email, password, name, role } = req.body;

  // Validation
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if user already exists
  const existingUser = users.find(user => user.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password, // In production, hash the password
    role
  };

  // Add to mock database
  users.push(newUser);

  // Return success
  res.status(201).json({
    message: 'User registered successfully',
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
  });
});

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

  // Generate token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Return user data and token
  res.json({
    message: 'Login successful',
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// Protected routes

// Teacher dashboard data
app.get('/api/teacher/dashboard', authMiddleware, (req, res) => {
  // Check if user is a teacher
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Return teacher dashboard data
  res.json({ 
    message: 'Teacher dashboard data',
    students: [
      { id: '1', name: 'Student 1', grade: 'A' },
      { id: '2', name: 'Student 2', grade: 'B' },
      { id: '3', name: 'Student 3', grade: 'C' }
    ],
    classes: [
      { id: '1', name: 'Math 101', students: 25 },
      { id: '2', name: 'Science 202', students: 18 }
    ]
  });
});

// Student dashboard data
app.get('/api/student/dashboard', authMiddleware, (req, res) => {
  // Check if user is a student
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Return student dashboard data
  res.json({ 
    message: 'Student dashboard data',
    courses: [
      { id: '1', name: 'Math 101', grade: 'B+', teacher: 'Dr. Smith' },
      { id: '2', name: 'Science 202', grade: 'A-', teacher: 'Prof. Johnson' }
    ],
    assignments: [
      { id: '1', title: 'Math Homework', dueDate: '2025-04-05', status: 'pending' },
      { id: '2', title: 'Science Project', dueDate: '2025-04-15', status: 'completed' }
    ]
  });
});

// User profile endpoint
app.get('/api/profile', authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
