// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');

// Import Prisma client
const prisma = require('./prisma/client');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Initialize Express app
const app = express();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Function to initialize database with default data if empty
const initializeDatabase = async () => {
  try {
    // Check if users table is empty
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('Initializing database with default data...');
      
      // Create default lessons if none exist
      const lessonCount = await prisma.lesson.count();
      if (lessonCount === 0) {
        await prisma.lesson.createMany({
          data: [
            { 
              title: 'Introduction to Algebra', 
              content: 'Learn the basics of algebraic expressions.',
              category: 'Math',
              date: new Date().toISOString(),
              status: 'Published'
            },
            { 
              title: 'Geometry Fundamentals', 
              content: 'Explore shapes, angles, and their properties.',
              category: 'Math',
              date: new Date().toISOString(),
              status: 'Published'
            }
          ]
        });
        console.log('Created default lessons');
      }
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

// Initialize database with default data
initializeDatabase()
  .catch(err => console.error('Failed to initialize database:', err));

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://black-sand-053455d1e.6.azurestaticapps.net'
    : 'http://localhost:5173',
  credentials: true
}));
app.use(bodyParser.json());

// API Routes

// Signup endpoint
app.post('/auth/signup', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validation
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user with Prisma
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        xp: 0,
        level: 1,
        stars: 0,
        streak: 0
      }
    });

    // Generate token for auto-login
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, xp: newUser.xp, level: newUser.level },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success with token
    res.status(201).json({
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
        badges: [] // Badges will be handled separately in the future
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user with Prisma
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, xp: user.xp, level: user.level },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp,
        level: user.level,
        streak: user.streak || 0,
        badges: [] // Will be fetched separately in the future
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Protected routes

// Teacher dashboard data
app.get('/api/teacher/dashboard', authMiddleware, async (req, res) => {
  // Check if user is a teacher
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    // Get all lessons and activities with Prisma
    const lessons = await prisma.lesson.findMany();
    
    // Get activities with student information
    const activities = await prisma.activity.findMany({
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            xp: true,
            level: true
          }
        },
        lesson: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });
    
    // Format activities to match the expected response format
    const populatedActivities = activities.map(activity => ({
      id: activity.id,
      studentId: activity.studentId,
      lessonId: activity.lessonId,
      completed: activity.completed,
      grade: activity.grade,
      studentName: activity.student ? activity.student.name : 'Unknown Student',
      lessonTitle: activity.lesson ? activity.lesson.title : 'Unknown Lesson'
    }));

    res.json({
      message: 'Teacher dashboard data',
      lessons,
      studentActivities: populatedActivities
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ message: 'Error fetching teacher dashboard data' });
  }
});

// Student dashboard data
app.get('/api/student/dashboard', authMiddleware, async (req, res) => {
  // Check if user is a student
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    const studentId = req.user.id;
    
    // Get student information
    const studentUser = await prisma.user.findUnique({
      where: { id: studentId }
    });
    
    if (!studentUser) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    // Get all lessons
    const lessons = await prisma.lesson.findMany();
    
    // Get student's activities
    const studentActivities = await prisma.activity.findMany({
      where: { studentId }
    });
    
    // Format lessons with completion status
    const enrolledLessons = lessons.map(lesson => {
      const activity = studentActivities.find(sa => sa.lessonId === lesson.id);
      return {
        ...lesson,
        completed: activity ? activity.completed : false,
        grade: activity ? activity.grade : null
      };
    });

    res.json({
      message: 'Student dashboard data',
      studentName: studentUser.name,
      enrolledLessons,
      activities: studentActivities
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ message: 'Error fetching student dashboard data' });
  }
});

// User profile endpoint
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    // Get user with Prisma, excluding password
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        xp: true,
        level: true,
        stars: true,
        streak: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Error fetching profile data' });
  }
});

// CRUD operations for lessons
// Create a new lesson
app.post('/api/lessons', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const { title, content, category, date } = req.body;
    
    // Basic validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Create lesson with Prisma
    const newLesson = await prisma.lesson.create({
      data: {
        title,
        content,
        category: category || 'Uncategorized',
        date: date || new Date().toISOString(),
        status: 'Draft',
        teacherId: req.user.id
      }
    });
    
    res.status(201).json(newLesson);
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ message: 'Error creating lesson' });
  }
});

// Update an existing lesson
app.put('/api/lessons/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const { id } = req.params;
    const { title, content, category, date, status } = req.body;
    
    // Check if lesson exists
    const existingLesson = await prisma.lesson.findUnique({
      where: { id }
    });
    
    if (!existingLesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Update lesson with Prisma
    const updatedLesson = await prisma.lesson.update({
      where: { id },
      data: {
        title: title || existingLesson.title,
        content: content || existingLesson.content,
        category: category || existingLesson.category,
        date: date || existingLesson.date,
        status: status || existingLesson.status,
      }
    });
    
    res.json(updatedLesson);
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ message: 'Error updating lesson' });
  }
});

// Delete a lesson
app.delete('/api/lessons/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const { id } = req.params;
    
    // Check if lesson exists
    const existingLesson = await prisma.lesson.findUnique({
      where: { id }
    });
    
    if (!existingLesson) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    // Delete related activities first
    await prisma.activity.deleteMany({
      where: { lessonId: id }
    });
    
    // Delete the lesson
    await prisma.lesson.delete({
      where: { id }
    });
    
    res.status(204).send(); // No content
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ message: 'Error deleting lesson' });
  }
});

// Student mark activity as complete
app.post('/api/student/activities/:activityId/complete', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    const { activityId } = req.params;
    const studentId = req.user.id; // Ensure student can only mark their own activities

    // Find activity with Prisma
    const activity = await prisma.activity.findFirst({
      where: {
        id: activityId,
        studentId: studentId
      }
    });

    if (!activity) {
      return res.status(404).json({ message: 'Activity not found or not assigned to this student' });
    }

    // Update the activity with Prisma
    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: { 
        completed: true,
        completedAt: new Date()
      }
    });

    res.json(updatedActivity);
  } catch (error) {
    console.error('Mark activity complete error:', error);
    res.status(500).json({ message: 'Error marking activity as complete' });
  }
});

// Gamification endpoints

// Get user gamification data
app.get('/api/gamification/profile', authMiddleware, async (req, res) => {
  try {
    // Get user with Prisma
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        xp: true,
        level: true,
        stars: true,
        streak: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return gamification profile
    const gamificationProfile = {
      id: user.id,
      name: user.name,
      xp: user.xp,
      level: user.level,
      streak: user.streak || 0,
      stars: user.stars || 0,
      badges: [] // Will be implemented with a separate badges table in the future
    };

    res.json(gamificationProfile);
  } catch (error) {
    console.error('Gamification profile error:', error);
    res.status(500).json({ message: 'Error fetching gamification data' });
  }
});

// Award XP to user
app.post('/api/gamification/award-xp', authMiddleware, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid XP amount is required' });
    }

    // Get user with Prisma
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate new XP and level
    const oldXp = user.xp || 0;
    const newXp = oldXp + parseInt(amount, 10);
    const oldLevel = user.level;
    
    // Calculate new level based on XP thresholds
    let newLevel = 1; // Explorer
    
    // Level progression based on XP
    if (newXp >= 1000) newLevel = 5;      // Master
    else if (newXp >= 500) newLevel = 4;  // Expert
    else if (newXp >= 200) newLevel = 3;  // Advanced
    else if (newXp >= 50) newLevel = 2;   // Beginner
    
    const leveledUp = oldLevel !== newLevel;

    // Update user with Prisma
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        xp: newXp,
        level: newLevel
      }
    });

    res.json({
      success: true,
      xp: newXp,
      xpGained: parseInt(amount, 10),
      level: newLevel,
      leveledUp,
      reason: reason || 'Activity completed'
    });
  } catch (error) {
    console.error('Award XP error:', error);
    res.status(500).json({ message: 'Error awarding XP' });
  }
});

// Award badge to user - This will be implemented with a separate badges table in the future
app.post('/api/gamification/award-badge', authMiddleware, async (req, res) => {
  try {
    const { badgeId, badgeName } = req.body;
    
    if (!badgeId || !badgeName) {
      return res.status(400).json({ error: 'Badge ID and name are required' });
    }

    // Get user with Prisma
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, we'll just return a success response
    // In the future, this will be implemented with a proper badges table
    // and a many-to-many relationship with users
    
    const newBadge = {
      id: badgeId,
      name: badgeName,
      awardedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      badge: newBadge,
      badges: [newBadge] // Placeholder for future implementation
    });
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({ message: 'Error awarding badge' });
  }
});

// Update streak
app.post('/api/gamification/update-streak', authMiddleware, async (req, res) => {
  try {
    // Get user with Prisma
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate new streak and XP
    const oldStreak = user.streak || 0;
    const newStreak = oldStreak + 1;
    
    // Award XP for streak milestones
    let streakXp = 0;
    let milestone = false;
    
    if (newStreak % 30 === 0) {
      streakXp = 100; // Monthly milestone
      milestone = true;
    } else if (newStreak % 7 === 0) {
      streakXp = 50;  // Weekly milestone
      milestone = true;
    } else if (newStreak % 5 === 0) {
      streakXp = 25;  // 5-day milestone
      milestone = true;
    } else {
      streakXp = 5;   // Daily streak
    }
    
    // Calculate new total XP
    const newXp = (user.xp || 0) + streakXp;
    
    // Update user with Prisma
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        streak: newStreak,
        xp: newXp
      }
    });

    res.json({
      success: true,
      streak: newStreak,
      streakXp,
      milestone,
      xp: newXp
    });
  } catch (error) {
    console.error('Update streak error:', error);
    res.status(500).json({ message: 'Error updating streak' });
  }
});


// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
