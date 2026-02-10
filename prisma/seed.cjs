const { PrismaClient, Archetype, ActivityKind } = require("@prisma/client");

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
    teacher = await prisma.user.create({
      data: {
        name: "Ms. Frizzle",
        email: "teacher@school.com",
        password: "password123",
        role: "teacher",
      },
    });
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
    student = await prisma.user.create({
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
  }
  console.log("Seeded student:", student.email);

  // 5. Seed Content
  console.log("Seeding modules...");

  const module = await prisma.module.upsert({
    where: { slug: "stem-1-intro" },
    update: {
      title: "STEM-1: Introduction to Tech",
      description: "K-2 Intro to AI, Quantum, and Bio",
      level: "K-2",
      published: false,
    },
    create: {
      slug: "stem-1-intro",
      title: "STEM-1: Introduction to Tech",
      description: "K-2 Intro to AI, Quantum, and Bio",
      level: "K-2",
      published: false,
    },
  });
  console.log("Created module:", module.slug);

  // --- STEM-1 (K–2) Game #1: Boost’s Lost Steps ---
  const k2SeqModule = await prisma.module.upsert({
    where: { slug: "k2-stem-sequencing" },
    update: {
      title: "Boost’s Lost Steps",
      description: "Put steps in order to help Boost bake! 🥣🔥🧁",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-sequencing",
      title: "Boost’s Lost Steps",
      description: "Put steps in order to help Boost bake! 🥣🔥🧁",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", k2SeqModule.slug);

  let k2SeqUnit = await prisma.unit.findFirst({
    where: { moduleId: k2SeqModule.id, title: "Unit 1: Step Power" },
  });
  if (!k2SeqUnit) {
    k2SeqUnit = await prisma.unit.create({
      data: {
        title: "Unit 1: Step Power",
        order: 1,
        Module: { connect: { id: k2SeqModule.id } },
        teacher: { connect: { id: teacher.id } },
      },
    });
  }
  console.log("Created unit:", k2SeqUnit.title);

  let k2SeqLesson = await prisma.lesson.findFirst({
    where: { unitId: k2SeqUnit.id, title: "Lost Steps" },
  });
  if (!k2SeqLesson) {
    k2SeqLesson = await prisma.lesson.create({
      data: {
        title: "Lost Steps",
        order: 1,
        Unit: { connect: { id: k2SeqUnit.id } },
      },
    });
  }
  console.log("Created lesson:", k2SeqLesson.title);

  const INFO = ActivityKind ? ActivityKind.INFO : "INFO";
  const INTERACT = ActivityKind ? ActivityKind.INTERACT : "INTERACT";

  const storyContent = JSON.stringify({
    type: "story_quiz",
    slides: [
      {
        id: "s1",
        text: "Hi! I am Boost.",
        icon: "🤖",
        imageKey: "type_story",
      },
      {
        id: "s2",
        text: "I want to bake a cake!",
        icon: "🎂",
        imageKey: "mission_cake",
      },
      {
        id: "s3",
        text: "Oops… the steps are mixed up!",
        icon: "😵‍💫",
        imageKey: "module_sequencing",
      },
      {
        id: "s4",
        text: "A plan with steps is called an algorithm.",
        icon: "📝",
        imageKey: "type_quiz",
      },
      {
        id: "s5",
        text: "Let’s put the steps in the right order!",
        icon: "✅",
        imageKey: "type_game",
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: "What is Boost making?",
        choices: ["A shoe 👞", "A cake 🎂", "A car 🚗"],
        answerIndex: 1,
        hint: "Look at the picture with the candles! 🎂",
      },
      {
        id: "q2",
        prompt: "A plan with steps is called…",
        choices: ["An algorithm 📜", "Magic ✨", "A nap 💤"],
        answerIndex: 0,
        hint: "It's a big word that starts with A... 📜",
      },
      {
        id: "q3",
        prompt: "What does debug mean?",
        choices: ["Fix a mistake 🛠️", "Make a mess 🙃", "Eat snacks 🍪"],
        answerIndex: 0,
        hint: "When something is broken, we have to ___ it. 🛠️",
      },
    ],
    review: {
      keyIdea: "An algorithm is steps in order. Debug means fix mistakes.",
      vocab: ["step", "order", "debug"],
    },
  });
  const storyAct = await prisma.activity.findFirst({
    where: { lessonId: k2SeqLesson.id, kind: INFO, order: 1 },
  });
  if (storyAct) {
    await prisma.activity.update({
      where: { id: storyAct.id },
      data: { title: "Story: Boost Bakes", content: storyContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Story: Boost Bakes",
        kind: INFO,
        order: 1,
        content: storyContent,
        Lesson: { connect: { id: k2SeqLesson.id } },
      },
    });
  }

  const gameContent = JSON.stringify({
    type: "minigame",
    gameKey: "sequence_drag_drop",
    levels: [
      {
        id: "k",
        cards: [
          { id: "pour", text: "Pour", imageKey: "step_pour" },
          { id: "bake", text: "Bake", imageKey: "step_bake" },
          { id: "frost", text: "Frost", imageKey: "step_frost" },
          { id: "eat", text: "Eat", imageKey: "step_eat" },
        ],
        answer: ["Pour", "Bake", "Frost", "Eat"],
      },
      {
        id: "g1",
        cards: [
          { id: "water", text: "Turn water on", imageKey: "step_water_on" },
          { id: "wash", text: "Wash", imageKey: "step_wash" },
          { id: "soap", text: "Soap", imageKey: "step_soap" },
          { id: "rinse", text: "Rinse", imageKey: "step_rinse" },
          { id: "dry", text: "Dry", imageKey: "step_dry" },
        ],
        answer: ["Turn water on", "Soap", "Wash", "Rinse", "Dry"],
      },
      {
        id: "g2",
        cards: [
          { text: "Plan", icon: "📝" },
          { text: "Code", icon: "💻" },
          { text: "Test", icon: "🧪" },
          { text: "Fix", icon: "🛠️" },
          { text: "Share", icon: "📤" },
        ],
        answer: ["Plan", "Code", "Test", "Fix", "Share"],
      },
    ],
  });
  const gameAct = await prisma.activity.findFirst({
    where: { lessonId: k2SeqLesson.id, kind: INTERACT, order: 2 },
  });
  if (gameAct) {
    await prisma.activity.update({
      where: { id: gameAct.id },
      data: { title: "Game: Fix the Order", content: gameContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Game: Fix the Order",
        kind: INTERACT,
        order: 2,
        content: gameContent,
        Lesson: { connect: { id: k2SeqLesson.id } },
      },
    });
  }
  console.log("Seeded module: k2-stem-sequencing");

  // --- STEM-1 (K–2) Game #2: Rhyme & Ride ---
  const k2RhymeModule = await prisma.module.upsert({
    where: { slug: "k2-stem-rhyme-ride" },
    update: {
      title: "STEM-1: Module 2 — Rhyme & Ride",
      description: "Shoot the rhyme fast! 🎵🚲",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-rhyme-ride",
      title: "STEM-1: Module 2 — Rhyme & Ride",
      description: "Shoot the rhyme fast! 🎵🚲",
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
      { id: "s1", text: "Hey there! I'm Rhymo the Rider!", icon: "🚲", imageKey: "type_story" },
      { id: "s2", text: "Words that sound alike at the end are called rhymes.", icon: "🎵", imageKey: "type_story" },
      { id: "s3", text: "Cat and hat rhyme because they both end in -at!", icon: "🐱", imageKey: "type_quiz" },
      { id: "s4", text: "Can you find the word that rhymes? Let's ride and find out!", icon: "🏁", imageKey: "type_game" },
    ],
    questions: [
      { id: "q1", prompt: "Which word rhymes with cat?", choices: ["Hat 🎩", "Dog 🐶", "Cup ☕"], answerIndex: 0, hint: "It sounds like cat but goes on your head! 🎩" },
      { id: "q2", prompt: "Which word rhymes with sun?", choices: ["Moon 🌙", "Run 🏃", "Star ⭐"], answerIndex: 1, hint: "You do this with your legs really fast! 🏃" },
      { id: "q3", prompt: "Words that rhyme sound the same at the…", choices: ["Beginning 🔤", "End 🔚", "Middle 🔵"], answerIndex: 1, hint: "Cat and hat both END with -at! 🔚" },
    ],
    review: { keyIdea: "Rhyming words sound the same at the end, like cat/hat and sun/run.", vocab: ["rhyme", "sound", "end"] },
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
    settings: { lives: 3, roundTimeS: 7, speed: 3.0, speedRamp: 0.18, maxSpeed: 6.0 },
    rounds: [
      { promptWord: "cat", correctWord: "hat", distractors: ["dog", "sun"] },
      { promptWord: "sun", correctWord: "run", distractors: ["moon", "star"] },
      { promptWord: "bed", correctWord: "red", distractors: ["blue", "top"] },
      { promptWord: "bug", correctWord: "hug", distractors: ["pin", "cup"] },
      { promptWord: "map", correctWord: "cap", distractors: ["tree", "car"] },
      { promptWord: "top", correctWord: "mop", distractors: ["bed", "sun"] },
      { promptWord: "boat", correctWord: "coat", distractors: ["cat", "bug"] },
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

  // --- STEM-1 (K–2) Game #3: Bounce & Buds ---
  const k2BounceModule = await prisma.module.upsert({
    where: { slug: "k2-stem-bounce-buds" },
    update: {
      title: "STEM-1: Module 3 — Bounce & Buds",
      description: "Bounce through the right gate to answer clues!",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-bounce-buds",
      title: "STEM-1: Module 3 — Bounce & Buds",
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
      { id: "q1", prompt: "Tiny parts of living things are called…", choices: ["Cells 🧫", "Rocks 🪨", "Cars 🚗"], answerIndex: 0, hint: "Cells are tiny building blocks. 🧫" },
      { id: "q2", prompt: "Microbes are…", choices: ["Tiny living helpers 🦠", "Big elephants 🐘", "Toys 🧸"], answerIndex: 0, hint: "Microbes are tiny and alive. 🦠" },
      { id: "q3", prompt: "Roots help a plant…", choices: ["Drink water 💧", "Fly ✈️", "Sing 🎵"], answerIndex: 0, hint: "Roots take in water from the ground. 💧" },
    ],
    review: { keyIdea: "Cells and microbes are tiny parts of life. We read clues and test ideas like scientists!", vocab: ["cell", "microbe", "root"] },
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
  // Use specific ID for SpacewarArena perk detection
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

  // --- STEM-1 (K–2) Game #4: Gotcha Gears ---
  const k2GotchaModule = await prisma.module.upsert({
    where: { slug: "k2-stem-gotcha-gears" },
    update: {
      title: "STEM-1: Module 4 — Gotcha Gears",
      description: "Catch the right gear to solve AI thinking puzzles! ⚙️🤖",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-gotcha-gears",
      title: "STEM-1: Module 4 — Gotcha Gears",
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

  console.log("Seeding units...");
  let unit = await prisma.unit.findFirst({
    where: { moduleId: module.id, title: "Unit 1: The Basics" },
  });
  if (!unit) {
    unit = await prisma.unit.create({
      data: {
        title: "Unit 1: The Basics",
        order: 1,
        Module: { connect: { id: module.id } },
        teacher: { connect: { id: teacher.id } },
      },
    });
  }
  console.log("Created unit:", unit.title);

  console.log("Seeding lessons...");
  let lesson = await prisma.lesson.findFirst({
    where: { unitId: unit.id, title: "Lesson 1: What is a Robot?" },
  });
  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: {
        title: "Lesson 1: What is a Robot?",
        order: 1,
        Unit: { connect: { id: unit.id } },
      },
    });
  }
  console.log("Created lesson:", lesson.title);

  console.log("Seeding activities...");

  const robotParts = await prisma.activity.findFirst({
    where: { lessonId: lesson.id, title: "Robot Parts" },
  });
  if (!robotParts) {
    await prisma.activity.create({
      data: {
        title: "Robot Parts",
        kind: INFO,
        order: 1,
        content: "Robots have sensors and motors.",
        Lesson: { connect: { id: lesson.id } },
      },
    });
  }

  const buildBot = await prisma.activity.findFirst({
    where: { lessonId: lesson.id, title: "Build a Bot" },
  });
  if (!buildBot) {
    await prisma.activity.create({
      data: {
        title: "Build a Bot",
        kind: INTERACT,
        order: 2,
        content: "Drag the parts to build a robot.",
        Lesson: { connect: { id: lesson.id } },
      },
    });
  }
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
