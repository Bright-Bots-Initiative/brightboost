const { PrismaClient, Archetype, ActivityKind } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  // 1. Idempotency Guard
  // Check if data already exists to avoid duplication or errors in production
  try {
    const abilityCount = await prisma.ability.count();
    if (abilityCount > 0) {
      console.log("SEED SKIPPED: data already exists (Abilities found).");
      return;
    }
  } catch (e) {
    // If table doesn't exist or connection fails, we might want to proceed or fail.
    // But usually count() works if DB is reachable.
    console.warn(
      "Could not check ability count, proceeding with caution:",
      e.message,
    );
  }

  // 2. Cleanup (Production Safe)
  const isProduction = process.env.NODE_ENV === "production";
  const forceReset = process.env.SEED_RESET === "true";
  const forceNoReset = process.env.SEED_RESET === "false";

  // Wipe only if NOT production, unless forced.
  const shouldWipe = forceReset || (!isProduction && !forceNoReset);

  if (shouldWipe) {
    console.log("Cleaning up database...");
    // Delete in reverse order of dependencies
    try {
      await prisma.matchTurn.deleteMany();
      await prisma.match.deleteMany();
      await prisma.unlockedAbility.deleteMany();
      await prisma.ability.deleteMany();
      await prisma.progress.deleteMany();
      await prisma.avatar.deleteMany();
      await prisma.activity.deleteMany();
      await prisma.lesson.deleteMany();
      await prisma.unit.deleteMany();
      // userBadge and badge might be present in some schemas
      try {
        await prisma.userBadge.deleteMany();
      } catch {}
      try {
        await prisma.badge.deleteMany();
      } catch {}

      await prisma.module.deleteMany();
      await prisma.user.deleteMany();
    } catch (e) {
      console.warn(
        "Cleanup warning (some tables might be empty or missing):",
        e.message,
      );
    }
    console.log("Database cleaned.");
  } else {
    console.log("Skipping cleanup (Production or SEED_RESET=false).");
  }

  // 3. Seed Abilities
  console.log("Seeding abilities...");
  const AI = Archetype ? Archetype.AI : "AI";
  const QUANTUM = Archetype ? Archetype.QUANTUM : "QUANTUM";
  const BIOTECH = Archetype ? Archetype.BIOTECH : "BIOTECH";

  const abilities = [
    {
      name: "Laser Strike",
      archetype: AI,
      reqLevel: 1,
      config: { type: "attack", value: 15 },
    },
    {
      name: "Overclock",
      archetype: AI,
      reqLevel: 2,
      config: { type: "heal", value: 10 },
    },
    {
      name: "Phase Shift",
      archetype: QUANTUM,
      reqLevel: 1,
      config: { type: "attack", value: 15 },
    },
    {
      name: "Entropy Bolt",
      archetype: QUANTUM,
      reqLevel: 2,
      config: { type: "attack", value: 20 },
    },
    {
      name: "Nano Heal",
      archetype: BIOTECH,
      reqLevel: 1,
      config: { type: "heal", value: 15 },
    },
    {
      name: "Regen Field",
      archetype: BIOTECH,
      reqLevel: 2,
      config: { type: "heal", value: 20 },
    },
  ];

  for (const ab of abilities) {
    await prisma.ability.create({ data: ab });
  }
  console.log(`Seeded ${abilities.length} abilities.`);

  // 4. Seed Users
  console.log("Seeding users...");

  // Teacher
  const teacher = await prisma.user.create({
    data: {
      name: "Ms. Frizzle",
      email: "teacher@school.com",
      password: "password123",
      role: "teacher",
    },
  });
  console.log("Seeded teacher:", teacher.email);

  // Student
  const student = await prisma.user.create({
    data: {
      id: "student-123",
      name: "Test Student",
      email: "student@test.com",
      password: "password",
      role: "student",
      xp: 0,
      level: "Novice",
    },
  });
  console.log("Seeded student:", student.email);

  // 5. Seed Content
  console.log("Seeding modules...");

  const module = await prisma.module.create({
    data: {
      slug: "stem-1-intro",
      title: "STEM-1: Introduction to Tech",
      description: "K-2 Intro to AI, Quantum, and Bio",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", module.slug);

  // --- STEM-1 (K–2) Game #1: Boost’s Lost Steps ---
  const k2SeqModule = await prisma.module.create({
    data: {
      slug: "k2-stem-sequencing",
      title: "Boost’s Lost Steps",
      description:
        "Put steps in order and fix mistakes (sequencing + debugging).",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", k2SeqModule.slug);

  const k2SeqUnit = await prisma.unit.create({
    data: {
      title: "Unit 1: Step Power",
      order: 1,
      Module: { connect: { id: k2SeqModule.id } },
      teacher: { connect: { id: teacher.id } },
    },
  });
  console.log("Created unit:", k2SeqUnit.title);

  const k2SeqLesson = await prisma.lesson.create({
    data: {
      title: "Lost Steps",
      order: 1,
      Unit: { connect: { id: k2SeqUnit.id } },
    },
  });
  console.log("Created lesson:", k2SeqLesson.title);

  const INFO = ActivityKind ? ActivityKind.INFO : "INFO";
  const INTERACT = ActivityKind ? ActivityKind.INTERACT : "INTERACT";

  await prisma.activity.create({
    data: {
      title: "Story: Lost Steps",
      kind: INFO,
      order: 1,
      content: JSON.stringify({
        type: "story_quiz",
        slides: [
          { id: "s1", text: "Boost is baking Galaxy Cookies for the class." },
          { id: "s2", text: "But the recipe steps got mixed up!" },
          {
            id: "s3",
            text: "Boost tries: Frost → Bake… splat! The frosting melts.",
          },
          { id: "s4", text: "A helper drone says: 'Put the steps in order.'" },
          { id: "s5", text: "Boost smiles: 'We debugged it! Now it works.'" },
        ],
        questions: [
          {
            id: "q1",
            prompt: "Why did the frosting melt?",
            choices: [
              "Because it was baked too late",
              "Because it went in before baking",
              "Because it was too cold",
            ],
            answerIndex: 1,
          },
          {
            id: "q2",
            prompt: "What does 'debug' mean?",
            choices: ["Make a bigger mess", "Fix a mistake", "Add sprinkles"],
            answerIndex: 1,
          },
          {
            id: "q3",
            prompt: "What step should happen before baking?",
            choices: ["Pour/mix the batter", "Eat the cookies", "Frost first"],
            answerIndex: 0,
          },
          {
            id: "q4",
            prompt: "How did Boost feel after fixing it?",
            choices: ["Proud", "Angry", "Sleepy"],
            answerIndex: 0,
          },
        ],
        review: {
          keyIdea: "An algorithm is steps in order. Debug means fix mistakes.",
          vocab: ["step", "order", "debug"],
        },
      }),
      Lesson: { connect: { id: k2SeqLesson.id } },
    },
  });

  await prisma.activity.create({
    data: {
      title: "Game: Fix the Recipe",
      kind: INTERACT,
      order: 2,
      content: JSON.stringify({
        type: "minigame",
        gameKey: "sequence_drag_drop",
        levels: [
          {
            id: "k",
            cards: ["Pour", "Bake", "Eat", "Frost"],
            answer: ["Pour", "Bake", "Frost", "Eat"],
          },
          {
            id: "g1",
            cards: ["Wash", "Soap", "Rinse", "Dry", "Turn water on"],
            answer: ["Turn water on", "Wash", "Soap", "Rinse", "Dry"],
          },
          {
            id: "g2",
            cards: ["Plan", "Code", "Test", "Fix", "Share"],
            answer: ["Plan", "Code", "Test", "Fix", "Share"],
          },
        ],
      }),
      Lesson: { connect: { id: k2SeqLesson.id } },
    },
  });
  console.log("Seeded module: k2-stem-sequencing");

  console.log("Seeding units...");
  const unit = await prisma.unit.create({
    data: {
      title: "Unit 1: The Basics",
      order: 1,
      Module: {
        connect: { id: module.id },
      },
      teacher: {
        connect: { id: teacher.id },
      },
    },
  });
  console.log("Created unit:", unit.title);

  console.log("Seeding lessons...");
  const lesson = await prisma.lesson.create({
    data: {
      title: "Lesson 1: What is a Robot?",
      order: 1,
      Unit: {
        connect: { id: unit.id },
      },
    },
  });
  console.log("Created lesson:", lesson.title);

  console.log("Seeding activities...");

  await prisma.activity.create({
    data: {
      title: "Robot Parts",
      kind: INFO,
      order: 1,
      content: "Robots have sensors and motors.",
      Lesson: {
        connect: { id: lesson.id },
      },
    },
  });

  await prisma.activity.create({
    data: {
      title: "Build a Bot",
      kind: INTERACT,
      order: 2,
      content: "Drag the parts to build a robot.",
      Lesson: {
        connect: { id: lesson.id },
      },
    },
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
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
