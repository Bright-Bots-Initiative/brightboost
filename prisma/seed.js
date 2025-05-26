const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  await prisma.activity.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data');

  const teacherPassword = await bcrypt.hash('password123', 10);
  const studentPassword = await bcrypt.hash('password123', 10);

  const teacher = await prisma.user.create({
    data: {
      name: 'Test Teacher',
      email: 'teacher@example.com',
      password: teacherPassword,
      role: 'teacher',
      xp: 100,
      level: 2,
      stars: 5,
      streak: 3
    }
  });

  const student = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'student@example.com',
      password: studentPassword,
      role: 'student',
      xp: 50,
      level: 1,
      stars: 2,
      streak: 1
    }
  });

  console.log('Created demo users');

  const lessons = await Promise.all([
    prisma.lesson.create({
      data: {
        title: 'Introduction to Robotics',
        content: 'Learn the basics of robotics and how robots work.',
        category: 'STEM',
        status: 'published',
        date: new Date('2023-01-15')
      }
    }),
    prisma.lesson.create({
      data: {
        title: 'Programming Fundamentals',
        content: 'Introduction to programming concepts and logic.',
        category: 'Coding',
        status: 'published',
        date: new Date('2023-01-20')
      }
    }),
    prisma.lesson.create({
      data: {
        title: 'Advanced Mathematics',
        content: 'Explore advanced mathematical concepts.',
        category: 'Math',
        status: 'draft',
        date: new Date('2023-02-01')
      }
    })
  ]);

  console.log('Created demo lessons');

  await Promise.all([
    prisma.activity.create({
      data: {
        userId: student.id,
        lessonId: lessons[0].id,
        completed: true,
        grade: 85,
        completedAt: new Date('2023-01-18')
      }
    }),
    prisma.activity.create({
      data: {
        userId: student.id,
        lessonId: lessons[1].id,
        completed: false,
        grade: null,
        completedAt: null
      }
    })
  ]);

  console.log('Created student activities');

  const badges = await Promise.all([
    prisma.badge.create({
      data: {
        name: 'First Lesson Completed',
        description: 'Completed your first lesson',
        users: {
          connect: { id: student.id }
        }
      }
    }),
    prisma.badge.create({
      data: {
        name: 'Perfect Score',
        description: 'Achieved a perfect score on a lesson',
        users: {
          connect: { id: teacher.id }
        }
      }
    })
  ]);

  console.log('Created badges');

  console.log('Seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
