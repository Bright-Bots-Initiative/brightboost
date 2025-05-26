// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcryptjs');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Initialize Express app
const app = express();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Initialize lowdb
const adapter = new JSONFile('db.json');
const db = new Low(adapter);

// Function to initialize database if it's empty
const initializeDatabase = async () => {
  await db.read();
  db.data = db.data || { users: [], lessons: [], studentActivities: [] };
  // Add default lessons if none exist
  if (!db.data.lessons || db.data.lessons.length === 0) {
    db.data.lessons = [
      { id: '1', title: 'Introduction to Algebra', content: 'Learn the basics of algebraic expressions.' },
      { id: '2', title: 'Geometry Fundamentals', content: 'Explore shapes, angles, and their properties.' }
    ];
  }
  // Add default student activities if none exist
  if (!db.data.studentActivities || db.data.studentActivities.length === 0) {
    db.data.studentActivities = [
      { id: '1', studentId: '2', lessonId: '1', completed: true, grade: 90 },
      { id: '2', studentId: '2', lessonId: '2', completed: false, grade: null }
    ];
  }
  await db.write();
};

// Function to ensure existing users have gamification fields
const ensureGamificationFields = async () => {
  await db.read();
  if (db.data.users && db.data.users.length > 0) {
    let needsUpdate = false;
    db.data.users.forEach(user => {
      if (typeof user.xp === 'undefined') {
        user.xp = 0;
        needsUpdate = true;
      }
      if (typeof user.level === 'undefined') {
        user.level = 'Explorer';
        needsUpdate = true;
      }
      if (typeof user.streak === 'undefined') {
        user.streak = 0;
        needsUpdate = true;
      }
      if (typeof user.badges === 'undefined') {
        user.badges = [];
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      await db.write();
      console.log('Updated existing users with gamification fields');
    }
  }
};

initializeDatabase()
  .then(() => ensureGamificationFields())
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

    await db.read();
    // Check if user already exists
    const existingUser = db.data.users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword,
      role,
      xp: 0,                 // Experience points for gamification
      level: 'Explorer',     // Starting level as a string (can be changed to numeric if preferred)
      streak: 0,             // Consecutive days of activity
      badges: []             // Array of earned badge IDs
    };

    // Add to database
    db.data.users.push(newUser);
    await db.write();

    // Generate token for auto-login
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, xp: newUser.xp, level: newUser.level },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success with token
    res.status(201).json({
      message: 'User registered successfully',
      token, // Send token for auto-login
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, xp: newUser.xp, level: newUser.level, streak: newUser.streak, badges: newUser.badges }
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

    await db.read();
    // Find user
    const user = db.data.users.find(user => user.email === email);
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
      user: { id: user.id, name: user.name, email: user.email, role: user.role, xp: user.xp, level: user.level, streak: user.streak, badges: user.badges }
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
    await db.read();
    // Return teacher dashboard data
    // For now, returning all lessons and student activities.
    // Adapt as needed for more specific data.
    const { lessons, studentActivities, users } = db.data;
    const populatedActivities = studentActivities.map(activity => {
        const student = users.find(u => u.id === activity.studentId);
        const lesson = lessons.find(l => l.id === activity.lessonId);
        return {
            ...activity,
            studentName: student ? student.name : 'Unknown Student',
            lessonTitle: lesson ? lesson.title : 'Unknown Lesson'
        };
    });

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
    await db.read();
    const studentId = req.user.id;
    const { lessons, studentActivities, users } = db.data;

    const studentUser = users.find(user => user.id === studentId);
    const studentSpecificActivities = studentActivities.filter(activity => activity.studentId === studentId);

    const enrolledLessons = lessons.map(lesson => {
      const activity = studentSpecificActivities.find(sa => sa.lessonId === lesson.id);
      return {
        ...lesson,
        completed: activity ? activity.completed : false,
        grade: activity ? activity.grade : null
      };
    });

    res.json({
      message: 'Student dashboard data',
      studentName: studentUser ? studentUser.name : 'Student',
      enrolledLessons,
      activities: studentSpecificActivities // or filter/map as needed
    });
  } catch (error) {
    console.error('Student dashboard error:', error);
    res.status(500).json({ message: 'Error fetching student dashboard data' });
  }
});

// User profile endpoint
app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Exclude password from the returned user object
    const { password, ...profile } = user;
    res.json(profile);
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
    const { title, content, category, date } = req.body; // Add other relevant fields
    if (!title || !content) { // Basic validation
      return res.status(400).json({ error: 'Title and content are required' });
    }
    await db.read();
    const newLesson = {
      id: Date.now().toString(), // Simple ID generation
      title,
      content,
      category: category || 'Uncategorized',
      date: date || new Date().toISOString(),
      status: 'Draft' // Default status
    };
    db.data.lessons.push(newLesson);
    await db.write();
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
    await db.read();
    const lessonIndex = db.data.lessons.findIndex(lesson => lesson.id === id);
    if (lessonIndex === -1) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    const updatedLesson = {
      ...db.data.lessons[lessonIndex],
      title: title || db.data.lessons[lessonIndex].title,
      content: content || db.data.lessons[lessonIndex].content,
      category: category || db.data.lessons[lessonIndex].category,
      date: date || db.data.lessons[lessonIndex].date,
      status: status || db.data.lessons[lessonIndex].status,
    };
    db.data.lessons[lessonIndex] = updatedLesson;
    await db.write();
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
    await db.read();
    const initialLength = db.data.lessons.length;
    db.data.lessons = db.data.lessons.filter(lesson => lesson.id !== id);
    if (db.data.lessons.length === initialLength) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    // Also remove related student activities
    db.data.studentActivities = db.data.studentActivities.filter(activity => activity.lessonId !== id);
    await db.write();
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

    await db.read();
    const activityIndex = db.data.studentActivities.findIndex(
      activity => activity.id === activityId && activity.studentId === studentId
    );

    if (activityIndex === -1) {
      return res.status(404).json({ message: 'Activity not found or not assigned to this student' });
    }

    // Update the activity
    db.data.studentActivities[activityIndex].completed = true;

    await db.write();
    res.json(db.data.studentActivities[activityIndex]);
  } catch (error) {
    console.error('Mark activity complete error:', error);
    res.status(500).json({ message: 'Error marking activity as complete' });
  }
});

// Gamification endpoints

// Get user gamification data
app.get('/api/gamification/profile', authMiddleware, async (req, res) => {
  try {
    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return only gamification-related data
    const gamificationProfile = {
      id: user.id,
      name: user.name,
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      badges: user.badges
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

    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user XP
    const user = db.data.users[userIndex];
    const oldXp = user.xp || 0;
    const newXp = oldXp + parseInt(amount, 10);
    user.xp = newXp;

    // Update level based on XP thresholds
    const oldLevel = user.level;
    let newLevel = 'Explorer';

    // Level progression based on XP
    if (newXp >= 1000) newLevel = 'Master';
    else if (newXp >= 500) newLevel = 'Expert';
    else if (newXp >= 200) newLevel = 'Advanced';
    else if (newXp >= 50) newLevel = 'Beginner';

    user.level = newLevel;
    const leveledUp = oldLevel !== newLevel;

    await db.write();

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

// Award badge to user
app.post('/api/gamification/award-badge', authMiddleware, async (req, res) => {
  try {
    const { badgeId, badgeName } = req.body;
    
    if (!badgeId || !badgeName) {
      return res.status(400).json({ error: 'Badge ID and name are required' });
    }

    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has this badge
    const user = db.data.users[userIndex];
    user.badges = user.badges || [];
    
    if (user.badges.some(badge => badge.id === badgeId)) {
      return res.json({
        success: false,
        message: 'Badge already awarded',
        badges: user.badges
      });
    }

    // Add badge to user
    const newBadge = {
      id: badgeId,
      name: badgeName,
      awardedAt: new Date().toISOString()
    };
    
    user.badges.push(newBadge);
    await db.write();

    res.json({
      success: true,
      message: 'Badge awarded successfully',
      badge: newBadge,
      badges: user.badges
    });
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({ message: 'Error awarding badge' });
  }
});

// Update streak
app.post('/api/gamification/update-streak', authMiddleware, async (req, res) => {
  try {
    await db.read();
    const userIndex = db.data.users.findIndex(u => u.id === req.user.id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user and update streak
    const user = db.data.users[userIndex];
    const oldStreak = user.streak || 0;
    
    // Increment streak (in a real app, we'd check if the user has been active within the last 24 hours)
    const newStreak = oldStreak + 1;
    user.streak = newStreak;
    
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
    
    // Add streak XP to user
    user.xp = (user.xp || 0) + streakXp;
    
    await db.write();

    res.json({
      success: true,
      streak: newStreak,
      streakXp,
      milestone,
      xp: user.xp
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
