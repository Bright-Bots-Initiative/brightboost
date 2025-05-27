// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path');
const bcrypt = require('bcryptjs');

// Import centralized Prisma client
const prisma = require('./prisma/client.cjs');

// Import middleware
const authMiddleware = require('./middleware/auth.cjs');

// Initialize Express app
const app = express();

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const PORT = process.env.PORT || 3000;

// Function to initialize database with default data if empty
const initializeDatabase = async () => {
  // Skip initialization in test environment to avoid conflicts with test setup
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping database initialization in test environment');
    return;
  }
  
  try {
    // Check if users table is empty
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('Initializing database with default data...');
      
      // Create a default teacher if none exists
      let defaultTeacher = await prisma.user.findFirst({
        where: { role: 'teacher' }
      });
      
      if (!defaultTeacher) {
        try {
          defaultTeacher = await prisma.user.create({
            data: {
              name: 'Default Teacher',
              email: 'teacher@example.com',
              password: await bcrypt.hash('password123', 10),
              role: 'teacher',
              xp: 0,
              level: 1,
              streak: 0
            }
          });
          console.log('Created default teacher:', defaultTeacher.id);
        } catch (err) {
          // If unique constraint error (email already exists), find the existing teacher
          if (err.code === 'P2002') {
            defaultTeacher = await prisma.user.findUnique({
              where: { email: 'teacher@example.com' }
            });
            if (!defaultTeacher) {
              // Generate a unique email if the default one is taken but user not found
              defaultTeacher = await prisma.user.create({
                data: {
                  name: 'Default Teacher',
                  email: `teacher-${Date.now()}@example.com`,
                  password: await bcrypt.hash('password123', 10),
                  role: 'teacher',
                  xp: 0,
                  level: 1,
                  streak: 0
                }
              });
              console.log('Created teacher with unique email:', defaultTeacher.id);
            }
          } else {
            console.error('Error creating default teacher:', err);
            throw err; // Re-throw if it's not a unique constraint error
          }
        }
      }
      
      // Create default lessons if none exist
      const lessonCount = await prisma.lesson.count();
      if (lessonCount === 0 && defaultTeacher) {
        try {
          // Create lessons one by one to avoid foreign key issues
          const lesson1 = await prisma.lesson.create({
            data: { 
              title: 'Introduction to Algebra', 
              content: 'Learn the basics of algebraic expressions.',
              category: 'Math',
              date: new Date().toISOString(),
              status: 'Published',
              teacherId: defaultTeacher.id
            }
          });
          
          const lesson2 = await prisma.lesson.create({
            data: { 
              title: 'Geometry Fundamentals', 
              content: 'Explore shapes, angles, and their properties.',
              category: 'Math',
              date: new Date().toISOString(),
              status: 'Published',
              teacherId: defaultTeacher.id
            }
          });
          
          console.log('Created default lessons:', lesson1.id, lesson2.id);
        } catch (lessonErr) {
          console.error('Error creating default lessons:', lessonErr);
        }
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
      console.log('User already exists with email:', email);
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('Creating new user with email:', email, 'role:', role);

    // Create new user with Prisma using transaction for atomicity
    const newUser = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
          xp: 0,
          level: 1,
          streak: 0
        }
      });
      
      // Verify user was created within the same transaction
      const verifiedUser = await tx.user.findUnique({
        where: { id: user.id }
      });
      
      if (!verifiedUser) {
        throw new Error(`Failed to verify user creation within transaction: ${user.id}`);
      }
      
      console.log('User verified in database within transaction:', verifiedUser.id);
      
      return user;
    });

    console.log('User created successfully:', newUser.id);
    
    // Generate JWT token for auto-login
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, xp: newUser.xp, level: newUser.level, streak: newUser.streak },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Generated token for user:', newUser.id);

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
    res.status(500).json({ message: 'Error creating user', error: error.message });
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

    console.log('Login attempt for email:', email);

    // Find user with Prisma
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.log('User not found with email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Password mismatch for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('User authenticated successfully:', user.id);

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, xp: user.xp, level: user.level, streak: user.streak || 0 },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Generated token for user:', user.id);

    // Return user data and token
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        xp: user.xp || 0,
        level: user.level || 1,
        streak: user.streak || 0,
        badges: [] // Will be fetched separately in the future
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
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
    console.log('Teacher dashboard request from:', req.user.id);
    
    // Get only lessons created by this teacher
    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId: req.user.id
      }
    });
    
    console.log('Teacher dashboard - found lessons:', lessons);
    
    // Get activities with student information
    const activities = await prisma.activity.findMany({
      where: {
        lesson: {
          teacherId: req.user.id
        }
      },
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

// Duplicate teacher dashboard endpoint removed

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

// This duplicate endpoint has been removed

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
  try {
    // Log the user role for debugging
    console.log('User role:', req.user.role);
    console.log('User ID:', req.user.id);
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied - not a teacher' });
    }
    
    const { title, content, category, date } = req.body;
    
    // Basic validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Verify teacher exists
    const teacher = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    if (!teacher) {
      console.error('Teacher not found:', req.user.id);
      return res.status(404).json({ error: 'Teacher not found' });
    }
    
    console.log('Teacher verified:', teacher.id);
    
    try {
      // Create lesson with Prisma using transaction for atomicity
      const newLesson = await prisma.$transaction(async (tx) => {
        // Create the lesson with auto-generated ID
        const lesson = await tx.lesson.create({
          data: {
            title,
            content,
            category: category || 'Uncategorized',
            date: date || new Date().toISOString(),
            status: 'Draft',
            teacherId: teacher.id
          }
        });
        
        // Verify the lesson was created within the transaction
        const verifiedLesson = await tx.lesson.findUnique({
          where: { id: lesson.id }
        });
        
        if (!verifiedLesson) {
          throw new Error(`Failed to verify lesson creation within transaction: ${lesson.id}`);
        }
        
        console.log('Created lesson successfully:', lesson.id);
        
        return lesson;
      });
      
      return res.status(201).json(newLesson);
    } catch (lessonError) {
      console.error('Error creating lesson:', lessonError);
      return res.status(500).json({ message: 'Error creating lesson', error: lessonError.message });
    }
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ message: 'Error creating lesson', error: error.message });
  }
});

// Update an existing lesson
app.put('/api/lessons/:id', authMiddleware, async (req, res) => {
  try {
    console.log('Update lesson request from user:', req.user.id, 'role:', req.user.role);
    
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied - not a teacher' });
    }
    
    const { id } = req.params;
    const { title, content, category, date, status } = req.body;
    
    console.log('Updating lesson with ID:', id);
    
    // Check if lesson exists
    const existingLesson = await prisma.lesson.findUnique({
      where: { id }
    });
    
    if (!existingLesson) {
      console.log('Lesson not found with ID:', id);
      return res.status(404).json({ message: 'Lesson not found' });
    }
    
    console.log('Found lesson to update:', existingLesson.id);
    
    // Verify teacher owns this lesson
    if (existingLesson.teacherId !== req.user.id) {
      console.log('Teacher does not own this lesson. Lesson teacherId:', existingLesson.teacherId, 'User ID:', req.user.id);
      return res.status(403).json({ error: 'Access denied - not the owner of this lesson' });
    }
    
    try {
      // Update lesson with Prisma
      const updatedLesson = await prisma.lesson.update({
        where: { id },
        data: {
          title: title !== undefined ? title : existingLesson.title,
          content: content !== undefined ? content : existingLesson.content,
          category: category !== undefined ? category : existingLesson.category,
          date: date !== undefined ? date : existingLesson.date,
          status: status !== undefined ? status : existingLesson.status,
        }
      });
      
      console.log('Lesson updated successfully:', updatedLesson.id);
      
      return res.json(updatedLesson);
    } catch (updateError) {
      console.error('Error updating lesson:', updateError);
      return res.status(500).json({ message: 'Error updating lesson', error: updateError.message });
    }
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ message: 'Error updating lesson', error: error.message });
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
        streak: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user badges
    const badges = await prisma.badge.findMany({
      where: {
        users: {
          some: {
            id: user.id
          }
        }
      }
    });

    // Return gamification profile
    const gamificationProfile = {
      id: user.id,
      name: user.name,
      xp: user.xp,
      level: user.level,
      streak: user.streak || 0,
      badges: badges
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
    const oldLevel = user.level || 1;
    
    // Calculate new level based on XP thresholds
    let newLevel = 1; // Explorer
    
    // Level progression based on XP
    if (newXp >= 1000) newLevel = 5;      // Master
    else if (newXp >= 500) newLevel = 4;  // Expert
    else if (newXp >= 200) newLevel = 3;  // Advanced
    else if (newXp >= 50) newLevel = 2;   // Beginner
    
    const leveledUp = oldLevel !== newLevel;

    // Update user with Prisma using transaction for atomicity
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Verify user exists within transaction
      const userInTx = await tx.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!userInTx) {
        console.error('User not found within transaction for XP award:', req.user.id);
        throw new Error(`User not found within transaction: ${req.user.id}`);
      }
      
      // Update user XP and level
      const updated = await tx.user.update({
        where: { id: req.user.id },
        data: {
          xp: newXp,
          level: newLevel
        }
      });
      
      // Verify update was successful
      const verifiedUser = await tx.user.findUnique({
        where: { id: req.user.id }
      });
      
      if (!verifiedUser) {
        console.error('Failed to verify XP update within transaction:', req.user.id);
        throw new Error(`Failed to verify XP update: ${req.user.id}`);
      }
      
      return updated;
    });

    res.json({
      success: true,
      xp: updatedUser.xp,
      xpGained: parseInt(amount, 10),
      level: updatedUser.level,
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
    
    console.log('Awarding badge to user:', req.user.id, 'badge:', badgeId, badgeName);
    
    if (!badgeId || !badgeName) {
      return res.status(400).json({ error: 'Badge ID and name are required' });
    }

    // Get user with Prisma
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      console.error('User not found for badge award:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      // Find or create badge using a transaction to ensure atomicity
      const badge = await prisma.$transaction(async (tx) => {
        // Try to find the badge first
        let existingBadge = await tx.badge.findUnique({
          where: { id: badgeId }
        });
        
        // If badge doesn't exist, create it
        if (!existingBadge) {
          console.log('Badge not found, creating new badge:', badgeName);
          try {
            existingBadge = await tx.badge.create({
              data: {
                id: badgeId, // Use the provided ID if it exists
                name: badgeName
              }
            });
            console.log('Created badge with ID:', existingBadge.id);
          } catch (createError) {
            console.error('Error creating badge:', createError);
            // If there's a unique constraint error, try to find the badge again
            if (createError.code === 'P2002') {
              existingBadge = await tx.badge.findFirst({
                where: { name: badgeName }
              });
              
              if (!existingBadge) {
                throw new Error('Failed to create or find badge');
              }
            } else {
              throw createError;
            }
          }
        }
        
        return existingBadge;
      });
      
      if (!badge) {
        return res.status(500).json({ message: 'Failed to create or find badge' });
      }
      
      // Connect badge to user in a transaction
      console.log('Connecting badge', badge.id, 'to user', user.id);
      await prisma.$transaction(async (tx) => {
        // Check if the user already has this badge
        const existingUserBadge = await tx.user.findFirst({
          where: {
            id: user.id,
            badges: {
              some: {
                id: badge.id
              }
            }
          }
        });
        
        if (!existingUserBadge) {
          // Connect badge to user if not already connected
          await tx.user.update({
            where: { id: user.id },
            data: {
              badges: {
                connect: { id: badge.id }
              }
            }
          });
        } else {
          console.log('User already has this badge');
        }
      });
      
      return res.json({
        success: true,
        message: 'Badge awarded successfully',
        badge: {
          id: badge.id,
          name: badge.name
        }
      });
    } catch (badgeError) {
      console.error('Error awarding badge:', badgeError);
      return res.status(500).json({ message: 'Error awarding badge', details: badgeError.message });
    }
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({ message: 'Error awarding badge' });
  }
});

// Update streak
app.post('/api/gamification/update-streak', authMiddleware, async (req, res) => {
  try {
    console.log('Updating streak for user:', req.user.id);
    
    // Get user with Prisma
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      console.error('User not found for streak update:', req.user.id);
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate new streak and XP
    const oldStreak = user.streak || 0;
    const newStreak = oldStreak + 1;
    
    console.log('Updating streak from', oldStreak, 'to', newStreak);
    
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
    
    try {
      // Update user with Prisma using transaction for atomicity
      const updatedUser = await prisma.$transaction(async (tx) => {
        // Verify user exists within transaction
        const userInTx = await tx.user.findUnique({
          where: { id: req.user.id }
        });
        
        if (!userInTx) {
          console.error('User not found within transaction:', req.user.id);
          throw new Error(`User not found within transaction: ${req.user.id}`);
        }
        
        // Update user streak and XP
        const updated = await tx.user.update({
          where: { id: req.user.id },
          data: {
            streak: {
              set: newStreak
            },
            xp: {
              set: newXp
            }
          }
        });
        
        // Verify update was successful
        const verifiedUser = await tx.user.findUnique({
          where: { id: req.user.id }
        });
        
        if (!verifiedUser || verifiedUser.streak !== newStreak) {
          console.error('Failed to verify streak update within transaction:', req.user.id);
          throw new Error(`Failed to verify streak update: ${req.user.id}`);
        }
        
        return updated;
      });
      
      console.log('User streak updated successfully:', updatedUser.streak);
      
      return res.json({
        success: true,
        streak: updatedUser.streak,
        streakXp,
        milestone,
        xp: updatedUser.xp
      });
    } catch (updateError) {
      console.error('Error updating user streak:', updateError);
      return res.status(500).json({ message: 'Error updating streak', details: updateError.message });
    }
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
} else {
  console.log('Running in test mode - server not started');
}

module.exports = app;
