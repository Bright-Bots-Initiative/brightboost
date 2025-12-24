const { PrismaClient, Archetype, ActivityKind } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log("SEED STARTED");

  // 1. Check if data exists
  // We check Ability as a proxy for "is db seeded" since it's the first thing we insert
  const abilityCount = await prisma.ability.count();
  console.log("Ability count before seed:", abilityCount);

  if (abilityCount > 0) {
    console.log("SEED SKIPPED: data already exists");
    process.exit(0);
  }

  // 2. Seed Abilities
  console.log("Seeding abilities...");

  // Use safe enum access
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
  console.log(`Seeded ${abilities.length} abilities.`);

  // 3. Seed Users (Teacher & Student)
  console.log("Seeding users...");

  // Teacher (Required for Unit.teacherId)
  // We use a generic teacher email. The fields school and subject are optional in schema, so we omit them to be safe.
  const teacher = await prisma.user.create({
    data: {
      name: "Ms. Frizzle",
      email: "teacher@school.com",
      password: "password123", // In real app, hash this!
      role: "teacher",
    }
  });
  console.log("Seeded teacher:", teacher.email);

  // Student
  const student = await prisma.user.create({
    data: {
      id: "student-123", // Explicit ID for testing
      name: "Test Student",
      email: "student@test.com",
      password: "password",
      role: "student",
      xp: 0,
      level: "Novice",
    }
  });
  console.log("Seeded student:", student.email);

  // 4. Seed Content (Module -> Unit -> Lesson -> Activity)
  console.log("Seeding modules...");

  const module = await prisma.module.create({
    data: {
      slug: "stem-1-intro",
      title: "STEM-1: Introduction to Tech",
      description: "K-2 Intro to AI, Quantum, and Bio",
      level: "K-2",
      published: true,
    }
  });
  console.log("Created module:", module.slug);

  console.log("Seeding units...");
  const unit = await prisma.unit.create({
    data: {
      moduleId: module.id,
      title: "Unit 1: The Basics",
      order: 1,
      teacherId: teacher.id // Required by schema
    }
  });
  console.log("Created unit:", unit.title);

  console.log("Seeding lessons...");
  const lesson = await prisma.lesson.create({
    data: {
      unitId: unit.id,
      title: "Lesson 1: What is a Robot?",
      order: 1
    }
  });
  console.log("Created lesson:", lesson.title);

  console.log("Seeding activities...");
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
  console.log("Seeded activities.");
}

main()
  .then(() => {
    console.log("SEED COMPLETED SUCCESSFULLY");
    process.exit(0);
  })
  .catch((e) => {
    console.error("SEED FAILED", e);
    process.exit(1);
  });
