const { PrismaClient, Archetype, ActivityKind } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // 1) IMPORTANT: Do not early-return based on existing data.
  // This seed must be able to append new curriculum/modules to an existing DB.

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
      try { await prisma.facultyPost.deleteMany(); } catch {}
      try { await prisma.pDReflection.deleteMany(); } catch {}
      try { await prisma.pDSession.deleteMany(); } catch {}
      try { await prisma.teacherPrepChecklist.deleteMany(); } catch {}
      try { await prisma.resource.deleteMany(); } catch {}
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

  // 3. Seed Abilities (idempotent)
  const existingAbilityCount = await prisma.ability.count().catch(() => 0);
  if (existingAbilityCount > 0) {
    console.log(`Skipping abilities (already exist: ${existingAbilityCount}).`);
  } else {
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
  }

  // 4. Seed Users (idempotent)
  console.log("Seeding users (idempotent)...");

  // Teacher (unique by email)
  let teacher = await prisma.user.findUnique({
    where: { email: "teacher@school.com" },
  });
  if (!teacher) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    teacher = await prisma.user.create({
      data: {
        name: "Ms. Frizzle",
        email: "teacher@school.com",
        password: hashedPassword,
        role: "teacher",
      },
    });
  } else if (!teacher.password.startsWith("$2")) {
    // Repair plaintext / non-bcrypt password
    const hashedPassword = await bcrypt.hash("password123", 10);
    teacher = await prisma.user.update({
      where: { id: teacher.id },
      data: { password: hashedPassword },
    });
    console.log("Repaired teacher password to bcrypt hash.");
  }
  console.log("Seeded teacher:", teacher.email);

  // Student (unique by id; fallback by email)
  let student = await prisma.user.findUnique({ where: { id: "student-123" } });
  if (!student) {
    student = await prisma.user.findUnique({
      where: { email: "student@test.com" },
    });
  }
  if (!student) {
    const hashedPassword = await bcrypt.hash("password", 10);
    student = await prisma.user.create({
      data: {
        id: "student-123",
        name: "Test Student",
        email: "student@test.com",
        password: hashedPassword,
        role: "student",
        xp: 0,
        level: "Novice",
      },
    });
  } else if (!student.password.startsWith("$2")) {
    // Repair plaintext / non-bcrypt password
    const hashedPassword = await bcrypt.hash("password", 10);
    student = await prisma.user.update({
      where: { id: student.id },
      data: { password: hashedPassword },
    });
    console.log("Repaired student password to bcrypt hash.");
  }
  console.log("Seeded student:", student.email);

  // 5. Seed Content
  console.log("Seeding modules...");

  const module = await prisma.module.upsert({
    where: { slug: "stem-1-intro" },
    update: {
      title: "Quantum Explorers",
      description: "Discover the tiny particles that power the future! Coming Soon.",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "stem-1-intro",
      title: "Quantum Explorers",
      description: "Discover the tiny particles that power the future! Coming Soon.",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", module.slug);

  // --- Cleanup removed modules ---
  // Delete "Boost’s Lost Steps" (k2-stem-sequencing) if it exists in DB
  try {
    const oldSeqModule = await prisma.module.findUnique({ where: { slug: "k2-stem-sequencing" } });
    if (oldSeqModule) {
      // Delete progress, activities, lessons, units, then module
      await prisma.progress.deleteMany({ where: { moduleSlug: "k2-stem-rhyme-ride" } });
      const oldUnits = await prisma.unit.findMany({ where: { moduleId: oldSeqModule.id } });
      for (const u of oldUnits) {
        const lessons = await prisma.lesson.findMany({ where: { unitId: u.id } });
        for (const l of lessons) {
          await prisma.activity.deleteMany({ where: { lessonId: l.id } });
        }
        await prisma.lesson.deleteMany({ where: { unitId: u.id } });
      }
      await prisma.unit.deleteMany({ where: { moduleId: oldSeqModule.id } });
      await prisma.module.delete({ where: { slug: "k2-stem-sequencing" } });
      console.log("Cleaned up removed module: k2-stem-sequencing");
    }
  } catch (e) {
    console.warn("Cleanup k2-stem-sequencing:", e.message);
  }

  const INFO = ActivityKind ? ActivityKind.INFO : "INFO";
  const INTERACT = ActivityKind ? ActivityKind.INTERACT : "INTERACT";

  // --- STEM-1 (K–2) Module 1: Rhyme & Ride ---
  const k2RhymeModule = await prisma.module.upsert({
    where: { slug: "k2-stem-rhyme-ride" },
    update: {
      title: "Module 1 — Rhyme & Ride",
      description: "Find the rhyming word! 🎵🚲",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-rhyme-ride",
      title: "Module 1 — Rhyme & Ride",
      description: "Find the rhyming word! 🎵🚲",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", k2RhymeModule.slug);

  let k2RhymeUnit = await prisma.unit.findFirst({
    where: { moduleId: k2RhymeModule.id, title: "Unit 1: Rhyme Power" },
  });
  if (!k2RhymeUnit) {
    k2RhymeUnit = await prisma.unit.create({
      data: {
        title: "Unit 1: Rhyme Power",
        order: 1,
        Module: { connect: { id: k2RhymeModule.id } },
        teacher: { connect: { id: teacher.id } },
      },
    });
  }
  console.log("Created unit:", k2RhymeUnit.title);

  let k2RhymeLesson = await prisma.lesson.findFirst({
    where: { unitId: k2RhymeUnit.id, title: "Rhyme & Ride" },
  });
  if (!k2RhymeLesson) {
    k2RhymeLesson = await prisma.lesson.create({
      data: {
        title: "Rhyme & Ride",
        order: 1,
        Unit: { connect: { id: k2RhymeUnit.id } },
      },
    });
  }
  console.log("Created lesson:", k2RhymeLesson.title);

  const rhymeStoryContent = JSON.stringify({
    type: "story_quiz",
    slides: [
      {
        id: "s1",
        text: "Hi! I am Rhymo! 🚲",
        icon: "🚲",
        imageKey: "type_story",
      },
      {
        id: "s2",
        text: "Cat and hat sound the same!",
        icon: "🎵",
        imageKey: "type_story",
      },
      {
        id: "s3",
        text: "They rhyme! -at, -at! 🐱🎩",
        icon: "🐱",
        imageKey: "type_quiz",
      },
      {
        id: "s4",
        text: "Tap the rhyme! Let's go! 🏁",
        icon: "🏁",
        imageKey: "type_game",
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: "What rhymes with cat?",
        choices: ["Hat 🎩", "Dog 🐶", "Cup ☕"],
        answerIndex: 0,
        hint: "Cat… hat! They end the same! 🎩",
      },
      {
        id: "q2",
        prompt: "What rhymes with sun?",
        choices: ["Run 🏃", "Moon 🌙", "Star ⭐"],
        answerIndex: 0,
        hint: "Sun… run! They end the same! 🏃",
      },
      {
        id: "q3",
        prompt: "Rhymes sound the same at the…",
        choices: ["End 🔚", "Start 🔤", "Middle 🔵"],
        answerIndex: 0,
        hint: "Cat and hat end the same! 🔚",
      },
    ],
    review: {
      keyIdea: "Words that rhyme sound the same at the end!",
      vocab: ["rhyme", "end"],
    },
  });
  const rhymeStoryAct = await prisma.activity.findFirst({
    where: { lessonId: k2RhymeLesson.id, kind: INFO, order: 1 },
  });
  if (rhymeStoryAct) {
    await prisma.activity.update({
      where: { id: rhymeStoryAct.id },
      data: { title: "Story: Meet Rhymo", content: rhymeStoryContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Story: Meet Rhymo",
        kind: INFO,
        order: 1,
        content: rhymeStoryContent,
        Lesson: { connect: { id: k2RhymeLesson.id } },
      },
    });
  }

  const rhymeGameContent = JSON.stringify({
    gameKey: "rhyme_ride_unity",
    settings: {
      lives: 5,
      roundTimeS: 15,
      speed: 1.8,
      speedRamp: 0.08,
      maxSpeed: 3.5,
      kidModeWrongNoLife: true,
    },
    rounds: [
      { promptWord: "cat", correctWord: "hat", distractors: ["dog", "sun"] },
      { promptWord: "sun", correctWord: "run", distractors: ["cup", "big"] },
      { promptWord: "bed", correctWord: "red", distractors: ["top", "sit"] },
      { promptWord: "bug", correctWord: "hug", distractors: ["pen", "lip"] },
      { promptWord: "man", correctWord: "can", distractors: ["pig", "log"] },
      { promptWord: "hop", correctWord: "mop", distractors: ["bed", "fun"] },
      { promptWord: "fox", correctWord: "box", distractors: ["cat", "pen"] },
    ],
  });
  const rhymeGameAct = await prisma.activity.findFirst({
    where: { lessonId: k2RhymeLesson.id, kind: INTERACT, order: 2 },
  });
  if (rhymeGameAct) {
    await prisma.activity.update({
      where: { id: rhymeGameAct.id },
      data: { title: "Game: Rhyme & Ride", content: rhymeGameContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Game: Rhyme & Ride",
        kind: INTERACT,
        order: 2,
        content: rhymeGameContent,
        Lesson: { connect: { id: k2RhymeLesson.id } },
      },
    });
  }
  console.log("Seeded module: k2-stem-rhyme-ride");

  // --- STEM-1 (K–2) Module 2: Bounce & Buds ---
  const k2BounceModule = await prisma.module.upsert({
    where: { slug: "k2-stem-bounce-buds" },
    update: {
      title: "Module 2 — Bounce & Buds",
      description: "Bounce through the right gate to answer clues!",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-bounce-buds",
      title: "Module 2 — Bounce & Buds",
      description: "Bounce through the right gate to answer clues!",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", k2BounceModule.slug);

  let k2BounceUnit = await prisma.unit.findFirst({
    where: { moduleId: k2BounceModule.id, title: "Unit 1: Reading Bounce" },
  });
  if (!k2BounceUnit) {
    k2BounceUnit = await prisma.unit.create({
      data: {
        title: "Unit 1: Reading Bounce",
        order: 1,
        Module: { connect: { id: k2BounceModule.id } },
        teacher: { connect: { id: teacher.id } },
      },
    });
  }
  console.log("Created unit:", k2BounceUnit.title);

  let k2BounceLesson = await prisma.lesson.findFirst({
    where: { unitId: k2BounceUnit.id, title: "Bounce & Buds" },
  });
  if (!k2BounceLesson) {
    k2BounceLesson = await prisma.lesson.create({
      data: {
        title: "Bounce & Buds",
        order: 1,
        Unit: { connect: { id: k2BounceUnit.id } },
      },
    });
  }
  console.log("Created lesson:", k2BounceLesson.title);

  const bounceStoryContent = JSON.stringify({
    type: "story_quiz",
    slides: [
      { id: "s1", text: "Hi! I'm Buddy. I'm a Bio Explorer! 🌿🔬", icon: "🌿", imageKey: "type_story" },
      { id: "s2", text: "Living things are made of tiny parts called cells. 🧫", icon: "🧫", imageKey: "type_story" },
      { id: "s3", text: "Tiny helpers called microbes live in soil and help plants. 🦠", icon: "🦠", imageKey: "type_quiz" },
      { id: "s4", text: "We read clues and test ideas—like steps in code! ✅", icon: "💻", imageKey: "type_game" },
    ],
    questions: [
      {
        id: "q1",
        prompt: "Tiny parts of living things are called…",
        choices: ["Cells 🧫", "Rocks 🪨", "Cars 🚗"],
        answerIndex: 0,
        hint: "Cells are tiny building blocks. 🧫",
      },
      {
        id: "q2",
        prompt: "Microbes are…",
        choices: ["Tiny living helpers 🦠", "Big elephants 🐘", "Toys 🧸"],
        answerIndex: 0,
        hint: "Microbes are tiny and alive. 🦠",
      },
      {
        id: "q3",
        prompt: "Roots help a plant…",
        choices: ["Drink water 💧", "Fly ✈️", "Sing 🎵"],
        answerIndex: 0,
        hint: "Roots take in water from the ground. 💧",
      },
    ],
    review: {
      keyIdea: "Cells and microbes are tiny parts of life. We read clues and test ideas like scientists!",
      vocab: ["cell", "microbe", "root"],
    },
  });
  const bounceStoryAct = await prisma.activity.findFirst({
    where: { lessonId: k2BounceLesson.id, kind: INFO, order: 1 },
  });
  if (bounceStoryAct) {
    await prisma.activity.update({
      where: { id: bounceStoryAct.id },
      data: { title: "Story: Meet Buddy", content: bounceStoryContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Story: Meet Buddy",
        kind: INFO,
        order: 1,
        content: bounceStoryContent,
        Lesson: { connect: { id: k2BounceLesson.id } },
      },
    });
  }

  const bounceGameContent = JSON.stringify({
    gameKey: "bounce_buds_unity",
    settings: { lives: 3, roundTimeS: 12, ballSpeed: 7, paddleSpeed: 12, obstacleCount: 4 },
    rounds: [
      { clueText: "A baby plant is a ____.", correctLabel: "seed", distractors: ["leaf", "rock"], hint: "Seeds can grow!" },
      { clueText: "This part drinks water.", correctLabel: "root", distractors: ["leaf", "sun"], hint: "Roots are under the ground." },
      { clueText: "Leaves help plants use ____.", correctLabel: "sunlight", distractors: ["pizza", "shoes"], hint: "Sunlight helps plants grow." },
      { clueText: "Tiny living helpers in soil are ____.", correctLabel: "microbes", distractors: ["cars", "clouds"], hint: "Microbes are tiny and alive." },
      { clueText: "Tiny building blocks are called ____.", correctLabel: "cells", distractors: ["chairs", "snacks"], hint: "Cells are very small." },
      { clueText: "A plant needs water and ____.", correctLabel: "sunlight", distractors: ["tv", "candy"], hint: "Plants need light." },
      { clueText: "A flower can help make ____.", correctLabel: "seeds", distractors: ["socks", "stones"], hint: "Flowers help plants make seeds." },
    ],
  });

  // Use upsert pattern with specific ID for SpacewarArena perk detection
  const bounceGameAct = await prisma.activity.findFirst({
    where: { lessonId: k2BounceLesson.id, kind: INTERACT, order: 2 },
  });
  if (bounceGameAct) {
    await prisma.activity.update({
      where: { id: bounceGameAct.id },
      data: { id: "bounce-buds", title: "Game: Bounce & Buds", content: bounceGameContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        id: "bounce-buds",
        title: "Game: Bounce & Buds",
        kind: INTERACT,
        order: 2,
        content: bounceGameContent,
        Lesson: { connect: { id: k2BounceLesson.id } },
      },
    });
  }
  console.log("Seeded module: k2-stem-bounce-buds");

  // --- STEM-1 (K–2) Module 3: Gotcha Gears ---
  const k2GotchaModule = await prisma.module.upsert({
    where: { slug: "k2-stem-gotcha-gears" },
    update: {
      title: "Module 3 — Gotcha Gears",
      description: "Catch the right gear to solve AI thinking puzzles! ⚙️🤖",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-gotcha-gears",
      title: "Module 3 — Gotcha Gears",
      description: "Catch the right gear to solve AI thinking puzzles! ⚙️🤖",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", k2GotchaModule.slug);

  let k2GotchaUnit = await prisma.unit.findFirst({
    where: { moduleId: k2GotchaModule.id, title: "Unit 1: Strategy Steps" },
  });
  if (!k2GotchaUnit) {
    k2GotchaUnit = await prisma.unit.create({
      data: {
        title: "Unit 1: Strategy Steps",
        order: 1,
        Module: { connect: { id: k2GotchaModule.id } },
        teacher: { connect: { id: teacher.id } },
      },
    });
  }
  console.log("Created unit:", k2GotchaUnit.title);

  let k2GotchaLesson = await prisma.lesson.findFirst({
    where: { unitId: k2GotchaUnit.id, title: "Gotcha Gears" },
  });
  if (!k2GotchaLesson) {
    k2GotchaLesson = await prisma.lesson.create({
      data: {
        title: "Gotcha Gears",
        order: 1,
        Unit: { connect: { id: k2GotchaUnit.id } },
      },
    });
  }
  console.log("Created lesson:", k2GotchaLesson.title);

  const gotchaStoryContent = JSON.stringify({
    type: "story_quiz",
    slides: [
      { id: "s1", text: "Hi! I'm Gearbot. I help robots think! ⚙️🤖", icon: "⚙️", imageKey: "type_story" },
      { id: "s2", text: "Robots need a plan to solve problems. 📝", icon: "📝", imageKey: "type_story" },
      { id: "s3", text: "When robots make mistakes, we debug—that means fix! 🛠️", icon: "🛠️", imageKey: "type_quiz" },
      { id: "s4", text: "Practice helps robots learn, just like you! 🌟", icon: "🌟", imageKey: "type_game" },
    ],
    questions: [
      { id: "q1", prompt: "What does debug mean?", choices: ["Fix a mistake 🛠️", "Take a nap 💤", "Eat lunch 🍕"], answerIndex: 0, hint: "Debug means to fix what went wrong! 🛠️" },
      { id: "q2", prompt: "What helps robots learn?", choices: ["Practice 🌟", "Skipping ⏭️", "Hiding 🙈"], answerIndex: 0, hint: "Practice makes progress! 🌟" },
      { id: "q3", prompt: "A plan with steps is called a…", choices: ["Rule 📜", "Nap 💤", "Snack 🍪"], answerIndex: 0, hint: "Rules tell us what to do step by step! 📜" },
    ],
    review: { keyIdea: "Robots use plans and rules. Debug means fix mistakes. Practice helps us learn!", vocab: ["debug", "plan", "practice", "rule"] },
  });
  const gotchaStoryAct = await prisma.activity.findFirst({
    where: { lessonId: k2GotchaLesson.id, kind: INFO, order: 1 },
  });
  if (gotchaStoryAct) {
    await prisma.activity.update({
      where: { id: gotchaStoryAct.id },
      data: { title: "Story: Meet Gearbot", content: gotchaStoryContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Story: Meet Gearbot",
        kind: INFO,
        order: 1,
        content: gotchaStoryContent,
        Lesson: { connect: { id: k2GotchaLesson.id } },
      },
    });
  }

  const gotchaGameContent = JSON.stringify({
    gameKey: "gotcha_gears_unity",
    settings: {
      lives: 3,
      roundTimeS: 12,
      speed: 2.8,
      speedRamp: 0.25,
      maxSpeed: 9.0,
      planningTimeS: 1.6,
      kidModeWrongNoLife: true,
      kidModeWhiffNoLife: true,
      catchWindowX: 0.95,
    },
    rounds: [
      { clueText: "The robot keeps making mistakes. What should it do?", correctLabel: "debug", distractors: ["guess", "ignore"], hint: "Debug means fix the mistake." },
      { clueText: "We want the robot to learn. What helps most?", correctLabel: "practice", distractors: ["skip", "sleep"], hint: "Practice means try again." },
      { clueText: "We need to sort things. What do we pick first?", correctLabel: "rule", distractors: ["random", "noise"], hint: "A rule tells how to group things." },
      { clueText: "The robot needs steps to follow. What is that?", correctLabel: "plan", distractors: ["rush", "mess"], hint: "A plan is steps in order." },
      { clueText: "We look at clues to find an answer. That is called…", correctLabel: "pattern", distractors: ["luck", "magic"], hint: "A pattern repeats or matches." },
      { clueText: "The robot tries something new. What is it doing?", correctLabel: "testing", distractors: ["sleeping", "hiding"], hint: "Testing means trying to see if it works." },
      { clueText: "We teach the robot by giving it…", correctLabel: "data", distractors: ["candy", "toys"], hint: "Data is information the robot uses to learn." },
    ],
  });

  // Use specific ID "gotcha-gears" for STEM1 set/perk detection
  const gotchaGameAct = await prisma.activity.findFirst({
    where: { lessonId: k2GotchaLesson.id, kind: INTERACT, order: 2 },
  });
  if (gotchaGameAct) {
    await prisma.activity.update({
      where: { id: gotchaGameAct.id },
      data: { id: "gotcha-gears", title: "Game: Gotcha Gears", content: gotchaGameContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        id: "gotcha-gears",
        title: "Game: Gotcha Gears",
        kind: INTERACT,
        order: 2,
        content: gotchaGameContent,
        Lesson: { connect: { id: k2GotchaLesson.id } },
      },
    });
  }
  console.log("Seeded module: k2-stem-gotcha-gears");

  // --- Cleanup old "Robot Parts" / "Build a Bot" activities from Quantum Explorers ---
  try {
    const oldUnit = await prisma.unit.findFirst({ where: { moduleId: module.id, title: "Unit 1: The Basics" } });
    if (oldUnit) {
      const oldLesson = await prisma.lesson.findFirst({ where: { unitId: oldUnit.id, title: "Lesson 1: What is a Robot?" } });
      if (oldLesson) {
        await prisma.activity.deleteMany({ where: { lessonId: oldLesson.id } });
        await prisma.lesson.delete({ where: { id: oldLesson.id } });
      }
      await prisma.unit.delete({ where: { id: oldUnit.id } });
      console.log("Cleaned up Robot Parts / Build a Bot activities");
    }
  } catch (e) {
    console.warn("Cleanup Robot Parts:", e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Seed Resources (worksheets, handouts, guides)
  // ═══════════════════════════════════════════════════════════════════════════
  const existingResources = await prisma.resource.count().catch(() => 0);
  if (existingResources > 0) {
    console.log(`Skipping resources (already exist: ${existingResources}).`);
  } else {
    console.log("Seeding resources...");

    const resources = [
      // ── k2-stem-rhyme-ride (Module 1) ─────────────────────────────────
      {
        title: "Rhyme & Ride Pre-Activity Worksheet",
        description: "Warm-up phonics activity before Rhyme & Ride module",
        type: "WORKSHEET",
        moduleSlug: "k2-stem-rhyme-ride",
        category: "PRE_ACTIVITY",
        printable: true,
        contentHtml: `
<h2>Before We Begin: Rhyme &amp; Ride</h2>
<h3>Rhyming Word Match</h3>
<p>Draw a line to connect the words that rhyme:</p>
<table>
  <tr><td><strong>cat</strong></td><td>run</td></tr>
  <tr><td><strong>sun</strong></td><td>tree</td></tr>
  <tr><td><strong>bee</strong></td><td>hat</td></tr>
</table>

<h3>Think of Rhymes!</h3>
<p>Write or draw a word that rhymes with each word:</p>
<p><strong>dog</strong> rhymes with _______________</p>
<p><strong>cake</strong> rhymes with _______________</p>
<p><strong>star</strong> rhymes with _______________</p>

<h3>Predict!</h3>
<p>Why do you think songs use rhyming words? Write or draw your idea:</p>
<div class="worksheet-area"></div>`,
      },
      {
        title: "Rhyme & Ride Post-Activity Reflection",
        description: "Reflection sheet after completing Rhyme & Ride module",
        type: "WORKSHEET",
        moduleSlug: "k2-stem-rhyme-ride",
        category: "POST_ACTIVITY",
        printable: true,
        contentHtml: `
<h2>After the Adventure: Rhyme &amp; Ride</h2>
<h3>My Favorite Rhyme</h3>
<p>What was your favorite rhyming pair from the game? Draw or write it:</p>
<div class="worksheet-area"></div>

<h3>Make Your Own Rhyme!</h3>
<p>Finish this silly sentence with a rhyming word:</p>
<p>The <strong>cat</strong> sat on a _______________</p>
<p>I saw a <strong>bug</strong> on a _______________</p>

<h3>How Rhyming Helps</h3>
<p>How does knowing rhyming words help you read? Draw or write your answer:</p>
<div class="worksheet-area"></div>`,
      },

      // ── k2-stem-bounce-buds ────────────────────────────────
      {
        title: "Bounce & Buds Pre-Activity Worksheet",
        description: "Warm-up activity about cells and tiny living things",
        type: "WORKSHEET",
        moduleSlug: "k2-stem-bounce-buds",
        category: "PRE_ACTIVITY",
        printable: true,
        contentHtml: `
<h2>Before We Begin: Bounce &amp; Buds</h2>
<h3>Vocabulary</h3>
<p>Draw a line from each word to its meaning:</p>
<table>
  <tr><td><strong>Cell</strong></td><td>A tiny living thing you can't see</td></tr>
  <tr><td><strong>Microbe</strong></td><td>The smallest part of living things</td></tr>
  <tr><td><strong>Microscope</strong></td><td>A tool to see tiny things</td></tr>
</table>

<h3>Big and Small</h3>
<p>Draw the smallest living thing you can think of. What is it?</p>
<div class="worksheet-area"></div>

<h3>Predict!</h3>
<p>Are all tiny germs bad for us? Circle your guess:</p>
<p style="font-size: 18px; text-align: center;"><strong>YES</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>NO</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>I'M NOT SURE</strong></p>`,
      },
      {
        title: "Bounce & Buds Post-Activity Reflection",
        description: "Reflection sheet after completing the cells and biology module",
        type: "WORKSHEET",
        moduleSlug: "k2-stem-bounce-buds",
        category: "POST_ACTIVITY",
        printable: true,
        contentHtml: `
<h2>After the Adventure: Bounce &amp; Buds</h2>
<h3>What I Learned About Cells</h3>
<p>Draw a cell and label it. What are cells?</p>
<div class="worksheet-area"></div>

<h3>Helpful vs. Harmful</h3>
<p>Draw or write one microbe that helps us and one that can make us sick:</p>
<table>
  <tr><th style="width:50%; text-align:center;">Helpful</th><th style="text-align:center;">Harmful</th></tr>
  <tr><td style="height:100px;"></td><td></td></tr>
</table>

<h3>Healthy Habits</h3>
<p>What is one thing you can do to keep your body healthy? Draw or write:</p>
<div class="worksheet-area"></div>`,
      },

      // ── k2-stem-gotcha-gears ───────────────────────────────
      {
        title: "Gotcha Gears Pre-Activity Worksheet",
        description: "Warm-up activity about robots, AI, and planning",
        type: "WORKSHEET",
        moduleSlug: "k2-stem-gotcha-gears",
        category: "PRE_ACTIVITY",
        printable: true,
        contentHtml: `
<h2>Before We Begin: Gotcha Gears</h2>
<h3>Vocabulary</h3>
<p>Draw a line from each word to its meaning:</p>
<table>
  <tr><td><strong>Robot</strong></td><td>Thinking about what to do before you do it</td></tr>
  <tr><td><strong>Plan</strong></td><td>A machine that follows instructions</td></tr>
  <tr><td><strong>Debug</strong></td><td>Finding and fixing a mistake</td></tr>
</table>

<h3>Design a Robot!</h3>
<p>If you could have a robot helper, what would it do? Draw your robot:</p>
<div class="worksheet-area"></div>

<h3>Think About It</h3>
<p>Can robots think on their own like people? Circle your guess:</p>
<p style="font-size: 18px; text-align: center;"><strong>YES</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>NO</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>I'M NOT SURE</strong></p>`,
      },
      {
        title: "Gotcha Gears Post-Activity Reflection",
        description: "Reflection sheet after completing the AI and robotics module",
        type: "WORKSHEET",
        moduleSlug: "k2-stem-gotcha-gears",
        category: "POST_ACTIVITY",
        printable: true,
        contentHtml: `
<h2>After the Adventure: Gotcha Gears</h2>
<h3>What I Learned About Robots</h3>
<p>Who tells robots what to do? Draw or write your answer:</p>
<div class="worksheet-area"></div>

<h3>My Strategy</h3>
<p>What strategy did you use in the Gotcha Gears game? Draw or write:</p>
<div class="worksheet-area"></div>

<h3>Robots in Real Life</h3>
<p>Where have you seen robots in real life (at home, school, or in your town)?</p>
<div class="line"></div>
<div class="line"></div>`,
      },

      // ── General Resources ───────────────────────────────────
      {
        title: "Getting Started with BrightBoost",
        description: "One-page guide for teachers new to the BrightBoost platform",
        type: "GUIDE",
        moduleSlug: null,
        category: "GENERAL",
        printable: true,
        contentHtml: `
<h2>Getting Started with BrightBoost</h2>
<h3>What is BrightBoost?</h3>
<p>BrightBoost is an interactive STEM learning platform designed for K-2 students. Students explore modules with stories, quizzes, and games that teach sequencing, phonics, biology, and AI/robotics concepts.</p>

<h3>Quick Setup (5 minutes)</h3>
<ol>
  <li><strong>Create your teacher account</strong> at the BrightBoost signup page</li>
  <li><strong>Create a class</strong> from your dashboard — you'll get a unique join code</li>
  <li><strong>Share the join code</strong> with students (or write it on the board)</li>
  <li><strong>Students sign up</strong> and enter the join code to join your class</li>
  <li><strong>Launch a weekly session</strong> by selecting a module and activity</li>
</ol>

<h3>What Students Experience</h3>
<p>Each module has two parts:</p>
<ol>
  <li><strong>Story + Quiz</strong>: An interactive story with questions to check understanding</li>
  <li><strong>Game</strong>: A fun, educational game that reinforces the lesson</li>
</ol>

<h3>Tips for Success</h3>
<ul>
  <li>Preview each module yourself before assigning it to students</li>
  <li>Use the Discussion Guide (in Teacher Prep) to start conversations before and after</li>
  <li>Give students about 20 minutes of platform time per session</li>
  <li>Check the class dashboard to see who completed their activities</li>
</ul>`,
      },
      {
        title: "How to Run a Weekly Session",
        description: "Step-by-step guide for running a BrightBoost session in your classroom",
        type: "GUIDE",
        moduleSlug: null,
        category: "GENERAL",
        printable: true,
        contentHtml: `
<h2>How to Run a Weekly BrightBoost Session</h2>
<h3>Before Class (5 min prep)</h3>
<ul>
  <li>Check the Teacher Prep page for the module you're assigning</li>
  <li>Review the discussion questions and pacing guide</li>
  <li>Make sure devices are charged and BrightBoost is accessible</li>
  <li>Print any worksheets you'd like to use (pre-activity or post-activity)</li>
</ul>

<h3>During Class (45 min)</h3>
<table>
  <tr><th>Time</th><th>Activity</th><th>Tips</th></tr>
  <tr><td>5 min</td><td>Warm-up discussion</td><td>Use "Before" questions from Discussion Guide</td></tr>
  <tr><td>5 min</td><td>Teacher intro/demo</td><td>Show the module on your screen briefly</td></tr>
  <tr><td>20 min</td><td>Students on BrightBoost</td><td>Circulate, help with login issues, observe</td></tr>
  <tr><td>10 min</td><td>Group debrief</td><td>Use "After" questions from Discussion Guide</td></tr>
  <tr><td>5 min</td><td>Exit ticket/reflection</td><td>Use the post-activity worksheet or verbal share</td></tr>
</table>

<h3>After Class</h3>
<ul>
  <li>Check your dashboard for completion rates and time spent</li>
  <li>Note any students who didn't finish — they can complete next time</li>
  <li>Jot down observations for your PD reflection journal</li>
</ul>`,
      },
      {
        title: "Talking to Parents About BrightBoost",
        description: "Template letter to send home to parents about the BrightBoost pilot",
        type: "HANDOUT",
        moduleSlug: null,
        category: "GENERAL",
        printable: true,
        contentHtml: `
<h2>Dear Families,</h2>
<p>Our class is participating in an exciting new program called <strong>BrightBoost</strong>! This is a fun, interactive learning platform where students explore STEM topics (Science, Technology, Engineering, and Math) through stories and games.</p>

<h3>What Will My Child Do?</h3>
<p>Each week, students will complete a short learning module on BrightBoost. Each module includes:</p>
<ul>
  <li>An interactive story about a STEM topic (like robots, cells, or rhyming patterns)</li>
  <li>Quiz questions to check understanding</li>
  <li>A fun educational game to practice what they learned</li>
</ul>

<h3>Is It Safe?</h3>
<p>Yes! BrightBoost is designed specifically for young learners. We only collect your child's name, email, and learning progress. We never sell data or show advertisements. For details, visit our Privacy Policy at the BrightBoost website.</p>

<h3>How Can I Help at Home?</h3>
<ul>
  <li>Ask your child what they learned on BrightBoost today!</li>
  <li>Encourage them to tell you about the stories and games</li>
  <li>Look for real-world connections to what they're learning (robots, rhymes, tiny living things)</li>
</ul>

<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Thank you for supporting your child's STEM learning journey!</p>
<p><em>Sincerely, Your Child's Teacher</em></p>`,
      },
      {
        title: "Student Login Help Card",
        description: "Printable cards with login instructions that teachers can cut and hand out",
        type: "HANDOUT",
        moduleSlug: null,
        category: "GENERAL",
        printable: true,
        contentHtml: `
<h2>Student Login Help Cards</h2>
<p><em>Print this page and cut along the dotted lines. Give one card to each student.</em></p>
<div style="border: 2px dashed #d1d5db; padding: 20px; margin: 16px 0; border-radius: 8px;">
  <h3 style="color: #3b82f6; margin-top: 0;">BrightBoost Login</h3>
  <p><strong>Website:</strong> (Your BrightBoost URL)</p>
  <p><strong>My Email:</strong> ___________________________</p>
  <p><strong>My Password:</strong> ___________________________</p>
  <p><strong>Class Join Code:</strong> ___________________________</p>
  <ol style="font-size: 12px;">
    <li>Go to the website and click "Login"</li>
    <li>Choose "I'm a Student"</li>
    <li>Type your email and password</li>
    <li>If you're new, click "Sign Up" first!</li>
  </ol>
</div>
<div style="border: 2px dashed #d1d5db; padding: 20px; margin: 16px 0; border-radius: 8px;">
  <h3 style="color: #3b82f6; margin-top: 0;">BrightBoost Login</h3>
  <p><strong>Website:</strong> (Your BrightBoost URL)</p>
  <p><strong>My Email:</strong> ___________________________</p>
  <p><strong>My Password:</strong> ___________________________</p>
  <p><strong>Class Join Code:</strong> ___________________________</p>
  <ol style="font-size: 12px;">
    <li>Go to the website and click "Login"</li>
    <li>Choose "I'm a Student"</li>
    <li>Type your email and password</li>
    <li>If you're new, click "Sign Up" first!</li>
  </ol>
</div>`,
      },
      {
        title: "Classroom Setup Checklist",
        description: "Device and environment checklist for BrightBoost sessions",
        type: "GUIDE",
        moduleSlug: null,
        category: "GENERAL",
        printable: true,
        contentHtml: `
<h2>Classroom Setup Checklist for BrightBoost</h2>
<h3>Devices</h3>
<ul>
  <li>☐ Enough devices for students (1 per student or 1 per pair)</li>
  <li>☐ All devices charged or plugged in</li>
  <li>☐ Wi-Fi/internet working</li>
  <li>☐ BrightBoost website loads on each device</li>
  <li>☐ Sound on (headphones recommended if available)</li>
</ul>

<h3>Student Accounts</h3>
<ul>
  <li>☐ All students have created accounts</li>
  <li>☐ All students have joined your class (check enrollment count on dashboard)</li>
  <li>☐ Login help cards distributed to any students who need them</li>
</ul>

<h3>Classroom Environment</h3>
<ul>
  <li>☐ Discussion questions posted or ready to display</li>
  <li>☐ Timer visible for students (20 min platform time)</li>
  <li>☐ Worksheets printed if using pre/post activities</li>
  <li>☐ Pencils/crayons available for worksheet activities</li>
</ul>

<h3>Teacher Prep</h3>
<ul>
  <li>☐ Previewed the module content yourself</li>
  <li>☐ Reviewed the Discussion Guide</li>
  <li>☐ Launched the Weekly Session on your dashboard</li>
  <li>☐ Your screen ready to show the module to the class (optional demo)</li>
</ul>`,
      },

      // ── Supplemental Resources (Links) ──────────────────────
      {
        title: "Code.org: K-2 Introduction to Sequences",
        description: "Free online sequencing activities from Code.org designed for K-2 students",
        type: "LINK",
        moduleSlug: "k2-stem-rhyme-ride",
        category: "SUPPLEMENTAL",
        printable: false,
        contentUrl: "https://code.org/educate/curriculum/csf",
      },
      {
        title: "PBS Kids: Rhyming Games",
        description: "Interactive rhyming games from PBS Kids that reinforce phonemic awareness",
        type: "LINK",
        moduleSlug: "k2-stem-rhyme-ride",
        category: "SUPPLEMENTAL",
        printable: false,
        contentUrl: "https://pbskids.org/games/rhyming",
      },
      {
        title: "BrainPOP Jr: Cells",
        description: "Animated video explaining cells for young learners",
        type: "LINK",
        moduleSlug: "k2-stem-bounce-buds",
        category: "SUPPLEMENTAL",
        printable: false,
        contentUrl: "https://jr.brainpop.com/science/",
      },
      {
        title: "PBS Kids: Robot Games",
        description: "Interactive robot and coding games from PBS Kids",
        type: "LINK",
        moduleSlug: "k2-stem-gotcha-gears",
        category: "SUPPLEMENTAL",
        printable: false,
        contentUrl: "https://pbskids.org/games/engineering",
      },
    ];

    for (const r of resources) {
      await prisma.resource.create({ data: r });
    }
    console.log(`Seeded ${resources.length} resources.`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Seed PD Session Templates
  // ═══════════════════════════════════════════════════════════════════════════
  const existingPDTemplates = await prisma.pDSession.count({ where: { isTemplate: true } }).catch(() => 0);
  if (existingPDTemplates > 0) {
    console.log(`Skipping PD templates (already exist: ${existingPDTemplates}).`);
  } else {
    console.log("Seeding PD session templates...");

    // Use the seed teacher as the template owner
    const seedTeacher = await prisma.user.findFirst({ where: { role: "teacher" } });
    const templateOwnerId = seedTeacher ? seedTeacher.id : "system";

    if (seedTeacher) {
      const pdTemplates = [
        {
          teacherId: templateOwnerId,
          date: new Date("2026-03-01"),
          durationMinutes: 90,
          topic: "Introduction to BrightBoost",
          facilitator: "BrightBoost Team",
          notes: "Platform overview, account setup, creating first class. Participants will create teacher accounts, set up their first class, and practice the student experience by completing one module.",
          actionItems: [
            "Create your BrightBoost teacher account",
            "Create at least one class and note your join code",
            "Complete one module as a student to preview the experience",
            "Share join code with 2-3 students before next session",
          ],
          relatedModuleSlugs: ["k2-stem-rhyme-ride"],
          isTemplate: true,
        },
        {
          teacherId: templateOwnerId,
          date: new Date("2026-03-15"),
          durationMinutes: 90,
          topic: "Running Your First Weekly Session",
          facilitator: "BrightBoost Team",
          notes: "Hands-on practice launching sessions, monitoring progress, using discussion guides. Participants will practice the full 45-minute classroom flow and share strategies for student engagement.",
          actionItems: [
            "Launch a weekly session for your class",
            "Use the Teacher Prep discussion guide with students",
            "Check your dashboard after students complete the activity",
            "Write a brief reflection on what worked and what to adjust",
          ],
          relatedModuleSlugs: ["k2-stem-rhyme-ride", "k2-stem-bounce-buds"],
          isTemplate: true,
        },
        {
          teacherId: templateOwnerId,
          date: new Date("2026-04-01"),
          durationMinutes: 90,
          topic: "Using Data to Inform Instruction",
          facilitator: "BrightBoost Team",
          notes: "Reading analytics, pulse survey results, adapting pacing. Participants will analyze their class data, compare pre/post confidence scores, and develop strategies for differentiating instruction based on student progress.",
          actionItems: [
            "Review your class completion rates and time-on-task data",
            "Have students complete the POST pulse survey",
            "Compare PRE and POST confidence scores",
            "Identify one student who needs extra support and plan an intervention",
          ],
          relatedModuleSlugs: ["k2-stem-bounce-buds", "k2-stem-gotcha-gears"],
          isTemplate: true,
        },
        {
          teacherId: templateOwnerId,
          date: new Date("2026-04-15"),
          durationMinutes: 120,
          topic: "Preparing for Showcase Night",
          facilitator: "BrightBoost Team",
          notes: "Exporting reports, student presentations, celebrating growth. Participants will prepare materials for the community showcase, including student progress summaries, sample student work, and talking points for parents and administrators.",
          actionItems: [
            "Export class progress data for your showcase display",
            "Select 2-3 student work samples to share",
            "Prepare a 3-minute summary of your experience for the showcase",
            "Practice your presentation with a colleague",
          ],
          relatedModuleSlugs: ["k2-stem-rhyme-ride", "k2-stem-bounce-buds", "k2-stem-gotcha-gears"],
          isTemplate: true,
        },
      ];

      for (const t of pdTemplates) {
        await prisma.pDSession.create({ data: t });
      }
      console.log(`Seeded ${pdTemplates.length} PD session templates.`);
    } else {
      console.log("Skipping PD templates (no teacher found for ownership).");
    }
  }

  // =============================================
  // DEMO ACCOUNTS — for Friday pitch demo
  // =============================================
  console.log("Seeding demo accounts...");

  const demoPassword = await bcrypt.hash("BrightBoost1", 10);

  // Demo Teacher
  let demoTeacher = await prisma.user.findUnique({
    where: { email: "demo_teacher@brightboost.com" },
  });
  if (!demoTeacher) {
    demoTeacher = await prisma.user.create({
      data: {
        name: "Ms. Johnson",
        email: "demo_teacher@brightboost.com",
        password: demoPassword,
        role: "teacher",
      },
    });
    console.log("Created demo teacher:", demoTeacher.email);
  } else {
    console.log("Demo teacher already exists:", demoTeacher.email);
  }

  // Demo Student (Maya — the original email/password student)
  let demoStudent = await prisma.user.findUnique({
    where: { email: "demo_student@brightboost.com" },
  });
  if (!demoStudent) {
    demoStudent = await prisma.user.create({
      data: {
        name: "Maya",
        email: "demo_student@brightboost.com",
        password: demoPassword,
        role: "student",
        loginIcon: "🌟",
        preferredLanguage: "en",
      },
    });
    console.log("Created demo student:", demoStudent.email);
  } else {
    // Update Maya with loginIcon if missing
    if (!demoStudent.loginIcon) {
      await prisma.user.update({
        where: { id: demoStudent.id },
        data: { loginIcon: "🌟", preferredLanguage: "en" },
      });
    }
    console.log("Demo student already exists:", demoStudent.email);
  }

  // Create demo class: "Ms. Johnson's Science Stars" (code: STARS1)
  let demoCourse = await prisma.course.findFirst({
    where: { teacherId: demoTeacher.id, name: "Ms. Johnson's Science Stars" },
  });
  if (!demoCourse) {
    demoCourse = await prisma.course.create({
      data: {
        name: "Ms. Johnson's Science Stars",
        joinCode: "STARS1",
        teacherId: demoTeacher.id,
        defaultLanguage: "en",
      },
    });
    console.log("Created demo class:", demoCourse.name, "code:", demoCourse.joinCode);
  } else {
    // Update joinCode if it was the old value
    if (demoCourse.joinCode !== "STARS1") {
      demoCourse = await prisma.course.update({
        where: { id: demoCourse.id },
        data: { joinCode: "STARS1" },
      });
      console.log("Updated demo class code to STARS1");
    }
  }

  // Enroll Maya in the class
  const existingEnrollment = await prisma.enrollment.findFirst({
    where: { studentId: demoStudent.id, courseId: demoCourse.id },
  });
  if (!existingEnrollment) {
    await prisma.enrollment.create({
      data: {
        studentId: demoStudent.id,
        courseId: demoCourse.id,
      },
    });
    console.log("Enrolled Maya in", demoCourse.name);
  }

  // Create avatar for Maya (Level 2, 350 XP)
  const existingAvatar = await prisma.avatar.findUnique({
    where: { studentId: demoStudent.id },
  });
  if (!existingAvatar) {
    await prisma.avatar.create({
      data: {
        studentId: demoStudent.id,
        stage: "GENERAL",
        level: 2,
        xp: 350,
        hp: 100,
        energy: 100,
      },
    });
    console.log("Created Maya's avatar (Level 2, 350 XP)");
  }

  // --------------------------------------------------
  // 20 Class-Code Students for the icon login grid
  // --------------------------------------------------
  const classStudents = [
    { name: "Aiden",    icon: "🐱", lang: "en" },
    { name: "Sofia",    icon: "🐶", lang: "es" },
    { name: "Jayden",   icon: "🦊", lang: "en" },
    { name: "Isabella", icon: "🐸", lang: "es" },
    { name: "Marcus",   icon: "🦁", lang: "en" },
    { name: "Camila",   icon: "🐰", lang: "es" },
    { name: "Liam",     icon: "🐼", lang: "en" },
    { name: "Valentina",icon: "🦄", lang: "es" },
    { name: "Noah",     icon: "🐢", lang: "en" },
    { name: "Lucia",    icon: "🦋", lang: "es" },
    { name: "Ethan",    icon: "🐧", lang: "en" },
    { name: "Mateo",    icon: "🐨", lang: "es" },
    { name: "Olivia",   icon: "🦉", lang: "en" },
    { name: "Diego",    icon: "🐙", lang: "es" },
    { name: "Emma",     icon: "🦈", lang: "en" },
    { name: "Carlos",   icon: "🐝", lang: "es" },
    { name: "Ava",      icon: "🦜", lang: "en" },
    { name: "Zoe",      icon: "🐳", lang: "en" },
    { name: "Mason",    icon: "🦒", lang: "en" },
    { name: "Luna",     icon: "🐞", lang: "en" },
  ];

  // Fetch activities once for progress assignment (from Rhyme & Ride — Module 1)
  let allActivities = [];
  if (k2RhymeModule) {
    allActivities = await prisma.activity.findMany({
      where: {
        Lesson: {
          Unit: {
            moduleId: k2RhymeModule.id,
          },
        },
      },
      orderBy: { order: "asc" },
      take: 8,
      include: { Lesson: { include: { Unit: true } } },
    });
  }

  const now = new Date();
  let createdStudents = 0;

  for (let idx = 0; idx < classStudents.length; idx++) {
    const s = classStudents[idx];
    const email = `student${idx + 1}@class.brightboost.local`;

    let student = await prisma.user.findUnique({ where: { email } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          name: s.name,
          email,
          password: demoPassword,
          role: "student",
          loginIcon: s.icon,
          preferredLanguage: s.lang,
        },
      });
      createdStudents++;
    } else {
      // Ensure icon is set
      if (!student.loginIcon) {
        await prisma.user.update({
          where: { id: student.id },
          data: { loginIcon: s.icon, preferredLanguage: s.lang },
        });
      }
    }

    // Enroll in demo class
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId: student.id, courseId: demoCourse.id },
    });
    if (!enrolled) {
      await prisma.enrollment.create({
        data: { studentId: student.id, courseId: demoCourse.id },
      });
    }

    // Create avatar with varied levels
    const existAvatar = await prisma.avatar.findUnique({
      where: { studentId: student.id },
    });
    if (!existAvatar) {
      // Vary XP: first few students are higher level
      const xpValues = [500, 420, 380, 350, 310, 280, 250, 220, 200, 180,
                        160, 140, 120, 100, 80, 60, 40, 20, 10, 5];
      const xp = xpValues[idx] || 50;
      const level = xp >= 300 ? 3 : xp >= 150 ? 2 : 1;
      await prisma.avatar.create({
        data: {
          studentId: student.id,
          stage: "GENERAL",
          level,
          xp,
          hp: 100,
          energy: 100,
        },
      });
    }

    // Assign varied progress (some students have many, some few, some none)
    // Pattern: first 5 → 5-7 activities, next 5 → 3-4, next 5 → 1-2, last 5 → 0
    let actCount = 0;
    if (idx < 5) actCount = 5 + (idx % 3);       // 5, 6, 7, 5, 6
    else if (idx < 10) actCount = 3 + (idx % 2);  // 3, 4, 3, 4, 3
    else if (idx < 15) actCount = 1 + (idx % 2);  // 1, 2, 1, 2, 1
    // last 5 → 0 activities

    const activitiesToAssign = allActivities.slice(0, actCount);
    for (let ai = 0; ai < activitiesToAssign.length; ai++) {
      const act = activitiesToAssign[ai];
      const progressDate = new Date(now);
      progressDate.setDate(progressDate.getDate() - (actCount - ai));
      try {
        await prisma.progress.upsert({
          where: {
            studentId_activityId: {
              studentId: student.id,
              activityId: act.id,
            },
          },
          update: {},
          create: {
            studentId: student.id,
            moduleSlug: "k2-stem-rhyme-ride",
            lessonId: act.Lesson?.id || null,
            activityId: act.id,
            status: "COMPLETED",
            timeSpentS: 120 + ai * 45 + Math.floor(Math.random() * 60),
            updatedAt: progressDate,
          },
        });
      } catch (e) {
        // skip duplicates silently
      }
    }

    // Pulse responses — first 15 get PRE, first 10 also get POST
    if (idx < 15) {
      try {
        const existPre = await prisma.pulseResponse.findFirst({
          where: { studentId: student.id, courseId: demoCourse.id, kind: "PRE" },
        });
        if (!existPre) {
          // PRE scores: average around 2.5 (range 1-4)
          const preScore = [2, 3, 2, 3, 1, 3, 2, 4, 2, 3, 2, 1, 3, 2, 3][idx];
          await prisma.pulseResponse.create({
            data: {
              studentId: student.id,
              courseId: demoCourse.id,
              kind: "PRE",
              score: preScore,
              answers: { enjoyment: preScore, continue: preScore + 1 > 5 ? 5 : preScore + 1 },
            },
          });
        }
      } catch (e) { /* skip */ }
    }

    if (idx < 10) {
      try {
        const existPost = await prisma.pulseResponse.findFirst({
          where: { studentId: student.id, courseId: demoCourse.id, kind: "POST" },
        });
        if (!existPost) {
          // POST scores: average around 4.0 (range 3-5)
          const postScore = [4, 5, 4, 3, 5, 4, 4, 5, 3, 4][idx];
          await prisma.pulseResponse.create({
            data: {
              studentId: student.id,
              courseId: demoCourse.id,
              kind: "POST",
              score: postScore,
              answers: { enjoyment: postScore, continue: 5 },
            },
          });
        }
      } catch (e) { /* skip */ }
    }
  }

  console.log(`Created ${createdStudents} class-code students (20 total with icons)`);

  // Also create Maya's progress (the original demo student)
  if (allActivities.length > 0) {
    for (let i = 0; i < Math.min(3, allActivities.length); i++) {
      const act = allActivities[i];
      const progressDate = new Date(now);
      progressDate.setDate(progressDate.getDate() - (2 - i));
      try {
        await prisma.progress.upsert({
          where: {
            studentId_activityId: {
              studentId: demoStudent.id,
              activityId: act.id,
            },
          },
          update: {},
          create: {
            studentId: demoStudent.id,
            moduleSlug: "k2-stem-rhyme-ride",
            lessonId: act.Lesson?.id || null,
            activityId: act.id,
            status: "COMPLETED",
            timeSpentS: 180 + i * 60,
            updatedAt: progressDate,
          },
        });
      } catch (e) { /* skip */ }
    }
    console.log("Created Maya's progress records");
  }

  // PRE pulse for Maya
  try {
    const existingPulse = await prisma.pulseResponse.findFirst({
      where: { studentId: demoStudent.id, courseId: demoCourse.id, kind: "PRE" },
    });
    if (!existingPulse) {
      await prisma.pulseResponse.create({
        data: {
          studentId: demoStudent.id,
          courseId: demoCourse.id,
          kind: "PRE",
          score: 4,
          answers: { enjoyment: 5, continue: 4, note: "I love the games!" },
        },
      });
    }
  } catch (e) { /* skip */ }

  // POST pulse for Maya
  try {
    const existingPost = await prisma.pulseResponse.findFirst({
      where: { studentId: demoStudent.id, courseId: demoCourse.id, kind: "POST" },
    });
    if (!existingPost) {
      await prisma.pulseResponse.create({
        data: {
          studentId: demoStudent.id,
          courseId: demoCourse.id,
          kind: "POST",
          score: 5,
          answers: { enjoyment: 5, continue: 5, note: "This is the best!" },
        },
      });
    }
  } catch (e) { /* skip */ }

  console.log("Demo accounts seeded successfully!");
  console.log("  Teacher: demo_teacher@brightboost.com / BrightBoost1");
  console.log("  Student: demo_student@brightboost.com / BrightBoost1");
  console.log("  Class code: STARS1");
  console.log("  20 class-code students with icons (student1-20@class.brightboost.local)");
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
