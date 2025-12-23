const { PrismaClient, Archetype, ActivityKind } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Idempotency check: If abilities exist, assume DB is seeded
    const existing = await prisma.ability.count();
    if (existing > 0) {
      console.log("seed: already seeded, skipping");
      process.exit(0);
    }

    // Cleanup
    try { await prisma.unlockedAbility.deleteMany(); } catch (e) {}
    try { await prisma.ability.deleteMany(); } catch (e) {}
    try { await prisma.matchTurn.deleteMany(); } catch (e) {}
    try { await prisma.match.deleteMany(); } catch (e) {}
    try { await prisma.progress.deleteMany(); } catch (e) {}
    try { await prisma.avatar.deleteMany(); } catch (e) {}
    try { await prisma.activity.deleteMany(); } catch (e) {}
    try { await prisma.lesson.deleteMany(); } catch (e) {}
    try { await prisma.unit.deleteMany(); } catch (e) {}
    try { await prisma.module.deleteMany(); } catch (e) {}
    try { await prisma.user.deleteMany({ where: { email: "student@test.com" } }); } catch (e) {}
    try { await prisma.user.deleteMany({ where: { email: "teacher@test.com" } }); } catch (e) {}
    try { await prisma.user.deleteMany({ where: { id: "student-123" } }); } catch (e) {}

    console.log("Cleaned up database.");

    // Seed Abilities
    const AI = Archetype ? Archetype.AI : "AI";
    const QUANTUM = Archetype ? Archetype.QUANTUM : "QUANTUM";
    const BIOTECH = Archetype ? Archetype.BIOTECH : "BIOTECH";
    const INFO = ActivityKind ? ActivityKind.INFO : "INFO";
    const INTERACT = ActivityKind ? ActivityKind.INTERACT : "INTERACT";

    const abilities = [
      { name: "Laser Strike", archetype: AI, reqLevel: 1, config: { type: "attack", value: 15 } },
      { name: "Overclock", archetype: AI, reqLevel: 2, config: { type: "heal", value: 10 } },
      { name: "Phase Shift", archetype: QUANTUM, reqLevel: 1, config: { type: "attack", value: 15 } },
      { name: "Entropy Bolt", archetype: QUANTUM, reqLevel: 2, config: { type: "attack", value: 20 } },
      { name: "Nano Heal", archetype: BIOTECH, reqLevel: 1, config: { type: "heal", value: 15 } },
      { name: "Regen Field", archetype: BIOTECH, reqLevel: 2, config: { type: "heal", value: 20 } },
    ];

    for (const ab of abilities) {
      await prisma.ability.create({ data: ab });
    }
    console.log("Seeded abilities.");

    // Seed Teacher
    const teacher = await prisma.user.create({
      data: {
        id: "teacher-123",
        name: "Teacher One",
        email: "teacher@test.com",
        password: "password",
        role: "teacher",
      }
    });

    // Seed Content (STEM-1)
    const module = await prisma.module.create({
      data: {
        slug: "stem-1-intro",
        title: "STEM-1: Introduction to Tech",
        description: "K-2 Intro to AI, Quantum, and Bio",
        level: "K-2",
        published: true,
      }
    });

    const unit = await prisma.unit.create({
      data: {
        moduleId: module.id,
        teacherId: teacher.id,
        title: "Unit 1: The Basics",
        order: 1
      }
    });

    const lesson = await prisma.lesson.create({
      data: {
        unitId: unit.id,
        title: "Lesson 1: What is a Robot?",
        order: 1
      }
    });

    await prisma.activity.create({
      data: {
        lessonId: lesson.id,
        title: "Robot Parts",
        kind: INFO,
        order: 1,
        content: "Robots have sensors and motors."
      }
    });

    await prisma.activity.create({
      data: {
        lessonId: lesson.id,
        title: "Build a Bot",
        kind: INTERACT,
        order: 2,
        content: "Drag the parts to build a robot."
      }
    });

    console.log("Seeded content.");

    // Seed Students
    const student = await prisma.user.create({
      data: {
        id: "student-123",
        name: "Test Student",
        email: "student@test.com",
        password: "password",
        role: "student",
        xp: 0,
        level: "Novice",
      }
    });

    console.log("Seeded student:", student.email);

  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
