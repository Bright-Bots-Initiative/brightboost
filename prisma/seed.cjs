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
  const teacherPasswordHash = await bcrypt.hash("password123", 10);
  let teacher = await prisma.user.findUnique({
    where: { email: "teacher@school.com" },
  });
  if (!teacher) {
    teacher = await prisma.user.create({
      data: {
        name: "Ms. Frizzle",
        email: "teacher@school.com",
        password: teacherPasswordHash,
        role: "teacher",
      },
    });
    console.log("Created teacher with bcrypt-hashed password.");
  } else if (!teacher.password.startsWith("$2")) {
    // Repair: existing teacher has plaintext password, upgrade to bcrypt
    teacher = await prisma.user.update({
      where: { id: teacher.id },
      data: { password: teacherPasswordHash },
    });
    console.log("Repaired teacher password to bcrypt hash.");
  }
  console.log("Seeded teacher:", teacher.email);

  // Student (unique by id; fallback by email)
  const studentPasswordHash = await bcrypt.hash("password", 10);
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
        password: studentPasswordHash,
        role: "student",
        xp: 0,
        level: "Novice",
      },
    });
    console.log("Created student with bcrypt-hashed password.");
  } else if (!student.password.startsWith("$2")) {
    // Repair: existing student has plaintext password, upgrade to bcrypt
    student = await prisma.user.update({
      where: { id: student.id },
      data: { password: studentPasswordHash },
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
      description: "Discover the tiny particles that power the future! Unlocks with specialization.",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "stem-1-intro",
      title: "Quantum Explorers",
      description: "Discover the tiny particles that power the future! Unlocks with specialization.",
      level: "K-2",
      published: true,
    },
  });
  console.log("Created module:", module.slug);

  // --- STEM-1 (K–2) Game #1: Boost’s Lost Steps ---
  const k2SeqModule = await prisma.module.upsert({
    where: { slug: "k2-stem-sequencing" },
    update: {
      title: "STEM-1: Module 1 — Boost’s Lost Steps",
      description: "Help Boost find the way! Plan a path step by step. 🤖🗺️⭐",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-sequencing",
      title: "STEM-1: Module 1 — Boost’s Lost Steps",
      description: "Help Boost find the way! Plan a path step by step. 🤖🗺️⭐",
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
      { id: "bpp-s1", text: { en: "Boost is a little helper robot in the Bright Lab. Today, Boost has one job: carry a tiny battery to the charging station.", es: "Boost es un pequeño robot ayudante en el Laboratorio Brillante. Hoy, Boost tiene un trabajo: llevar una pequeña batería a la estación de carga." }, icon: "🤖" },
      { id: "bpp-s2", text: { en: "Boost cannot just rush forward. Boost has to look, think, and put the steps in the right order.", es: "Boost no puede apresurarse. Boost tiene que mirar, pensar y poner los pasos en el orden correcto." }, icon: "🧠" },
      { id: "bpp-s3", text: { en: "When we help Boost turn and move the right way, we are practicing sequencing. Sequencing means putting steps in order.", es: "Cuando ayudamos a Boost a girar y moverse correctamente, estamos practicando la secuenciación. Secuenciar significa poner los pasos en orden." }, icon: "📋" },
    ],
    questions: [
      { id: "bpp-q1", prompt: { en: "What is Boost trying to do?", es: "¿Qué intenta hacer Boost?" }, choices: [{ en: "Reach the charging station", es: "Llegar a la estación de carga" }, { en: "Go to sleep", es: "Irse a dormir" }, { en: "Paint the wall", es: "Pintar la pared" }], answerIndex: 0, hint: { en: "Read the first slide again — what is Boost's job today?", es: "Lee la primera diapositiva de nuevo — ¿cuál es el trabajo de Boost hoy?" } },
      { id: "bpp-q2", prompt: { en: "What should Boost do first?", es: "¿Qué debe hacer Boost primero?" }, choices: [{ en: "Make a plan", es: "Hacer un plan" }, { en: "Guess fast", es: "Adivinar rápido" }, { en: "Spin in circles", es: "Girar en círculos" }], answerIndex: 0, hint: { en: "Boost has to look and think before moving.", es: "Boost tiene que mirar y pensar antes de moverse." } },
      { id: "bpp-q3", prompt: { en: "What does sequencing mean?", es: "¿Qué significa secuenciar?" }, choices: [{ en: "Putting steps in order", es: "Poner los pasos en orden" }, { en: "Jumping over walls", es: "Saltar sobre paredes" }, { en: "Moving as fast as possible", es: "Moverse lo más rápido posible" }], answerIndex: 0, hint: { en: "The last slide explains what sequencing means.", es: "La última diapositiva explica qué significa secuenciar." } },
    ],
  });
  const storyAct = await prisma.activity.findFirst({
    where: { lessonId: k2SeqLesson.id, kind: INFO, order: 1 },
  });
  if (storyAct) {
    await prisma.activity.update({
      where: { id: storyAct.id },
      data: { title: "Story: Meet Boost the Careful Planner", content: storyContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Story: Meet Boost the Careful Planner",
        kind: INFO,
        order: 1,
        content: storyContent,
        Lesson: { connect: { id: k2SeqLesson.id } },
      },
    });
  }

  // gameKey: boost_path_planner (old alias: sequence_drag_drop still works via registry)
  const gameContent = JSON.stringify({ gameKey: "boost_path_planner" });
  const gameAct = await prisma.activity.findFirst({
    where: { lessonId: k2SeqLesson.id, kind: INTERACT, order: 2 },
  });
  if (gameAct) {
    await prisma.activity.update({
      where: { id: gameAct.id },
      data: { id: "lost-steps", title: "Game: Boost's Lost Steps", content: gameContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        id: "lost-steps",
        title: "Game: Boost's Lost Steps",
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
      description: "Ride through three worlds and catch the rhymes! 🎵🚲",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-rhyme-ride",
      title: "STEM-1: Module 2 — Rhyme & Ride",
      description: "Ride through three worlds and catch the rhymes! 🎵🚲",
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
      { id: "s1", text: { i18nKey: "content.rhymo.s1" }, icon: "🚲", imageKey: "type_story" },
      { id: "s2", text: { i18nKey: "content.rhymo.s2" }, icon: "🎵", imageKey: "type_story" },
      { id: "s3", text: { i18nKey: "content.rhymo.s3" }, icon: "🐱", imageKey: "type_quiz" },
      { id: "s4", text: { i18nKey: "content.rhymo.s4" }, icon: "🏁", imageKey: "type_game" },
    ],
    questions: [
      { id: "q1", prompt: { i18nKey: "content.rhymo.q1.prompt" }, choices: [{ i18nKey: "content.rhymo.q1.c1" }, { i18nKey: "content.rhymo.q1.c2" }, { i18nKey: "content.rhymo.q1.c3" }], answerIndex: 0, hint: { i18nKey: "content.rhymo.q1.hint" } },
      { id: "q2", prompt: { i18nKey: "content.rhymo.q2.prompt" }, choices: [{ i18nKey: "content.rhymo.q2.c1" }, { i18nKey: "content.rhymo.q2.c2" }, { i18nKey: "content.rhymo.q2.c3" }], answerIndex: 1, hint: { i18nKey: "content.rhymo.q2.hint" } },
      { id: "q3", prompt: { i18nKey: "content.rhymo.q3.prompt" }, choices: [{ i18nKey: "content.rhymo.q3.c1" }, { i18nKey: "content.rhymo.q3.c2" }, { i18nKey: "content.rhymo.q3.c3" }], answerIndex: 1, hint: { i18nKey: "content.rhymo.q3.hint" } },
    ],
    review: { keyIdea: { i18nKey: "content.rhymo.reviewKeyIdea" }, vocab: ["rhyme", "sound", "end"] },
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

  // gameKey: rhymo_rhyme_rocket (old alias: rhyme_ride_unity still works via registry)
  const rhymeGameContent = JSON.stringify({ gameKey: "rhymo_rhyme_rocket" });
  const rhymeGameAct = await prisma.activity.findFirst({
    where: { lessonId: k2RhymeLesson.id, kind: INTERACT, order: 2 },
  });
  if (rhymeGameAct) {
    await prisma.activity.update({
      where: { id: rhymeGameAct.id },
      data: { id: "rhyme-ride", title: "Game: Rhyme & Ride", content: rhymeGameContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        id: "rhyme-ride",
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
      description: "Bounce Buddy through the right gate to learn about plants! 🌿🧫",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-bounce-buds",
      title: "STEM-1: Module 3 — Bounce & Buds",
      description: "Bounce Buddy through the right gate to learn about plants! 🌿🧫",
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
      { id: "s1", text: { i18nKey: "content.buddy.s1" }, icon: "🌿", imageKey: "type_story" },
      { id: "s2", text: { i18nKey: "content.buddy.s2" }, icon: "🧫", imageKey: "type_story" },
      { id: "s3", text: { i18nKey: "content.buddy.s3" }, icon: "🦠", imageKey: "type_quiz" },
      { id: "s4", text: { i18nKey: "content.buddy.s4" }, icon: "💻", imageKey: "type_game" },
    ],
    questions: [
      { id: "q1", prompt: { i18nKey: "content.buddy.q1.prompt" }, choices: [{ i18nKey: "content.buddy.q1.c1" }, { i18nKey: "content.buddy.q1.c2" }, { i18nKey: "content.buddy.q1.c3" }], answerIndex: 0, hint: { i18nKey: "content.buddy.q1.hint" } },
      { id: "q2", prompt: { i18nKey: "content.buddy.q2.prompt" }, choices: [{ i18nKey: "content.buddy.q2.c1" }, { i18nKey: "content.buddy.q2.c2" }, { i18nKey: "content.buddy.q2.c3" }], answerIndex: 0, hint: { i18nKey: "content.buddy.q2.hint" } },
      { id: "q3", prompt: { i18nKey: "content.buddy.q3.prompt" }, choices: [{ i18nKey: "content.buddy.q3.c1" }, { i18nKey: "content.buddy.q3.c2" }, { i18nKey: "content.buddy.q3.c3" }], answerIndex: 0, hint: { i18nKey: "content.buddy.q3.hint" } },
    ],
    review: { keyIdea: { i18nKey: "content.buddy.reviewKeyIdea" }, vocab: ["cell", "microbe", "root"] },
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

  // gameKey: buddy_garden_sort (old alias: bounce_buds_unity still works via registry)
  const bounceGameContent = JSON.stringify({ gameKey: "buddy_garden_sort" });
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
      { id: "s1", text: { i18nKey: "content.gearbot.s1" }, icon: "⚙️", imageKey: "type_story" },
      { id: "s2", text: { i18nKey: "content.gearbot.s2" }, icon: "📝", imageKey: "type_story" },
      { id: "s3", text: { i18nKey: "content.gearbot.s3" }, icon: "🛠️", imageKey: "type_quiz" },
      { id: "s4", text: { i18nKey: "content.gearbot.s4" }, icon: "🌟", imageKey: "type_game" },
    ],
    questions: [
      { id: "q1", prompt: { i18nKey: "content.gearbot.q1.prompt" }, choices: [{ i18nKey: "content.gearbot.q1.c1" }, { i18nKey: "content.gearbot.q1.c2" }, { i18nKey: "content.gearbot.q1.c3" }], answerIndex: 0, hint: { i18nKey: "content.gearbot.q1.hint" } },
      { id: "q2", prompt: { i18nKey: "content.gearbot.q2.prompt" }, choices: [{ i18nKey: "content.gearbot.q2.c1" }, { i18nKey: "content.gearbot.q2.c2" }, { i18nKey: "content.gearbot.q2.c3" }], answerIndex: 0, hint: { i18nKey: "content.gearbot.q2.hint" } },
      { id: "q3", prompt: { i18nKey: "content.gearbot.q3.prompt" }, choices: [{ i18nKey: "content.gearbot.q3.c1" }, { i18nKey: "content.gearbot.q3.c2" }, { i18nKey: "content.gearbot.q3.c3" }], answerIndex: 0, hint: { i18nKey: "content.gearbot.q3.hint" } },
    ],
    review: { keyIdea: { i18nKey: "content.gearbot.reviewKeyIdea" }, vocab: ["debug", "plan", "practice", "rule"] },
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
      { clueText: { i18nKey: "content.gotchaGame.r1.clue" }, correctLabel: { i18nKey: "content.gotchaGame.r1.correct" }, distractors: [{ i18nKey: "content.gotchaGame.r1.d1" }, { i18nKey: "content.gotchaGame.r1.d2" }], hint: { i18nKey: "content.gotchaGame.r1.hint" } },
      { clueText: { i18nKey: "content.gotchaGame.r2.clue" }, correctLabel: { i18nKey: "content.gotchaGame.r2.correct" }, distractors: [{ i18nKey: "content.gotchaGame.r2.d1" }, { i18nKey: "content.gotchaGame.r2.d2" }], hint: { i18nKey: "content.gotchaGame.r2.hint" } },
      { clueText: { i18nKey: "content.gotchaGame.r3.clue" }, correctLabel: { i18nKey: "content.gotchaGame.r3.correct" }, distractors: [{ i18nKey: "content.gotchaGame.r3.d1" }, { i18nKey: "content.gotchaGame.r3.d2" }], hint: { i18nKey: "content.gotchaGame.r3.hint" } },
      { clueText: { i18nKey: "content.gotchaGame.r4.clue" }, correctLabel: { i18nKey: "content.gotchaGame.r4.correct" }, distractors: [{ i18nKey: "content.gotchaGame.r4.d1" }, { i18nKey: "content.gotchaGame.r4.d2" }], hint: { i18nKey: "content.gotchaGame.r4.hint" } },
      { clueText: { i18nKey: "content.gotchaGame.r5.clue" }, correctLabel: { i18nKey: "content.gotchaGame.r5.correct" }, distractors: [{ i18nKey: "content.gotchaGame.r5.d1" }, { i18nKey: "content.gotchaGame.r5.d2" }], hint: { i18nKey: "content.gotchaGame.r5.hint" } },
      { clueText: { i18nKey: "content.gotchaGame.r6.clue" }, correctLabel: { i18nKey: "content.gotchaGame.r6.correct" }, distractors: [{ i18nKey: "content.gotchaGame.r6.d1" }, { i18nKey: "content.gotchaGame.r6.d2" }], hint: { i18nKey: "content.gotchaGame.r6.hint" } },
      { clueText: { i18nKey: "content.gotchaGame.r7.clue" }, correctLabel: { i18nKey: "content.gotchaGame.r7.correct" }, distractors: [{ i18nKey: "content.gotchaGame.r7.d1" }, { i18nKey: "content.gotchaGame.r7.d2" }], hint: { i18nKey: "content.gotchaGame.r7.hint" } },
    ],
  });

  // Use specific ID "gotcha-gears" for STEM1 set/perk detection
  const gotchaGameAct = await prisma.activity.findFirst({
    where: { lessonId: k2GotchaLesson.id, kind: INTERACT, order: 2 },
  });
  if (gotchaGameAct) {
    await prisma.activity.update({
      where: { id: gotchaGameAct.id },
      data: { id: "gotcha-gears", title: "Game: Gotcha Gears (Catch the Gear!)", content: gotchaGameContent },
    });
  } else {
    await prisma.activity.create({
      data: {
        id: "gotcha-gears",
        title: "Game: Gotcha Gears (Catch the Gear!)",
        kind: INTERACT,
        order: 2,
        content: gotchaGameContent,
        Lesson: { connect: { id: k2GotchaLesson.id } },
      },
    });
  }
  console.log("Seeded module: k2-stem-gotcha-gears");

  // ═══════════════════════════════════════════════════════════════════════════
  // Module 4 — Tank Trek (Set 2: AI / Logic / Robotics)
  // ═══════════════════════════════════════════════════════════════════════════
  const k2TankModule = await prisma.module.upsert({
    where: { slug: "k2-stem-tank-trek" },
    update: { title: "Module 4 — Tank Trek", description: "Guide a robot through mazes! 🤖🧩", level: "K-2", published: true },
    create: { slug: "k2-stem-tank-trek", title: "Module 4 — Tank Trek", description: "Guide a robot through mazes! 🤖🧩", level: "K-2", published: true },
  });
  console.log("Created module:", k2TankModule.slug);

  let k2TankUnit = await prisma.unit.findFirst({ where: { moduleId: k2TankModule.id, title: "Unit 1: Robot Navigation" } });
  if (!k2TankUnit) {
    k2TankUnit = await prisma.unit.create({ data: { title: "Unit 1: Robot Navigation", order: 1, Module: { connect: { id: k2TankModule.id } }, teacher: { connect: { id: teacher.id } } } });
  }

  let k2TankLesson = await prisma.lesson.findFirst({ where: { unitId: k2TankUnit.id, title: "Tank Trek" } });
  if (!k2TankLesson) {
    k2TankLesson = await prisma.lesson.create({ data: { title: "Tank Trek", order: 1, Unit: { connect: { id: k2TankUnit.id } } } });
  }

  const tankStoryContent = JSON.stringify({
    type: "story_quiz",
    slides: [
      { id: "tt-s1", text: { en: "Meet Bolt — a little robot who needs YOUR help to find the way!", es: "¡Conoce a Bolt, un pequeño robot que necesita TU ayuda para encontrar el camino!" }, icon: "🤖" },
      { id: "tt-s2", text: { en: "You'll give Bolt commands: Forward, Turn Left, Turn Right. Then Bolt follows your plan!", es: "Le darás comandos a Bolt: Adelante, Girar Izquierda, Girar Derecha. ¡Entonces Bolt seguirá tu plan!" }, icon: "🧭" },
      { id: "tt-s3", text: { en: "Plan carefully — fewer moves means more stars! Can you find the smartest path?", es: "Planifica con cuidado — ¡menos movimientos significan más estrellas! ¿Puedes encontrar el camino más inteligente?" }, icon: "⭐" },
    ],
    questions: [
      { id: "tt-q1", prompt: { en: "What does Bolt need to move?", es: "¿Qué necesita Bolt para moverse?" }, choices: [{ en: "Commands from you", es: "Comandos tuyos" }, { en: "Magic", es: "Magia" }, { en: "Nothing", es: "Nada" }], answerIndex: 0 },
    ],
  });

  let tankStoryAct = await prisma.activity.findFirst({ where: { lessonId: k2TankLesson.id, kind: INFO, order: 1 } });
  if (tankStoryAct) {
    await prisma.activity.update({ where: { id: tankStoryAct.id }, data: { title: "Story: Meet Bolt", content: tankStoryContent } });
  } else {
    await prisma.activity.create({ data: { title: "Story: Meet Bolt", kind: INFO, order: 1, content: tankStoryContent, Lesson: { connect: { id: k2TankLesson.id } } } });
  }

  const tankGameContent = JSON.stringify({ gameKey: "tank_trek", chapters: [] });
  let tankGameAct = await prisma.activity.findFirst({ where: { lessonId: k2TankLesson.id, kind: INTERACT, order: 2 } });
  if (tankGameAct) {
    await prisma.activity.update({ where: { id: tankGameAct.id }, data: { title: "Game: Tank Trek", content: tankGameContent } });
  } else {
    await prisma.activity.create({ data: { title: "Game: Tank Trek", kind: INTERACT, order: 2, content: tankGameContent, Lesson: { connect: { id: k2TankLesson.id } } } });
  }
  console.log("Seeded Tank Trek module + activities.");

  // ═══════════════════════════════════════════════════════════════════════════
  // Module 5 — Quantum Quest (Set 2: Math / Space / Quantum)
  // ═══════════════════════════════════════════════════════════════════════════
  const k2QuantumModule = await prisma.module.upsert({
    where: { slug: "k2-stem-quantum-quest" },
    update: { title: "Module 5 — Quantum Quest", description: "Space math adventure! 🚀✨", level: "K-2", published: true },
    create: { slug: "k2-stem-quantum-quest", title: "Module 5 — Quantum Quest", description: "Space math adventure! 🚀✨", level: "K-2", published: true },
  });
  console.log("Created module:", k2QuantumModule.slug);

  let k2QuantumUnit = await prisma.unit.findFirst({ where: { moduleId: k2QuantumModule.id, title: "Unit 1: Star Math" } });
  if (!k2QuantumUnit) {
    k2QuantumUnit = await prisma.unit.create({ data: { title: "Unit 1: Star Math", order: 1, Module: { connect: { id: k2QuantumModule.id } }, teacher: { connect: { id: teacher.id } } } });
  }

  let k2QuantumLesson = await prisma.lesson.findFirst({ where: { unitId: k2QuantumUnit.id, title: "Quantum Quest" } });
  if (!k2QuantumLesson) {
    k2QuantumLesson = await prisma.lesson.create({ data: { title: "Quantum Quest", order: 1, Unit: { connect: { id: k2QuantumUnit.id } } } });
  }

  const quantumStoryContent = JSON.stringify({
    type: "story_quiz",
    slides: [
      { id: "qq-s1", text: { en: "Welcome, Space Explorer! The stars need your math skills!", es: "¡Bienvenido, Explorador Espacial! ¡Las estrellas necesitan tus habilidades de matemáticas!" }, icon: "🚀" },
      { id: "qq-s2", text: { en: "Solve math problems and tap the correct answer floating in space!", es: "¡Resuelve problemas de matemáticas y toca la respuesta correcta flotando en el espacio!" }, icon: "🌟" },
      { id: "qq-s3", text: { en: "Get streaks for bonus points! But watch out for wrong answers — you only have 3 lives.", es: "¡Consigue rachas para puntos extra! Pero cuidado con las respuestas incorrectas — solo tienes 3 vidas." }, icon: "❤️" },
    ],
    questions: [
      { id: "qq-q1", prompt: { en: "2 + 1 = ?", es: "2 + 1 = ?" }, choices: [{ en: "3", es: "3" }, { en: "4", es: "4" }, { en: "2", es: "2" }], answerIndex: 0 },
    ],
  });

  let quantumStoryAct = await prisma.activity.findFirst({ where: { lessonId: k2QuantumLesson.id, kind: INFO, order: 1 } });
  if (quantumStoryAct) {
    await prisma.activity.update({ where: { id: quantumStoryAct.id }, data: { title: "Story: Space Explorer", content: quantumStoryContent } });
  } else {
    await prisma.activity.create({ data: { title: "Story: Space Explorer", kind: INFO, order: 1, content: quantumStoryContent, Lesson: { connect: { id: k2QuantumLesson.id } } } });
  }

  const quantumGameContent = JSON.stringify({ gameKey: "quantum_quest", sectors: [] });
  let quantumGameAct = await prisma.activity.findFirst({ where: { lessonId: k2QuantumLesson.id, kind: INTERACT, order: 2 } });
  if (quantumGameAct) {
    await prisma.activity.update({ where: { id: quantumGameAct.id }, data: { title: "Game: Quantum Quest", content: quantumGameContent } });
  } else {
    await prisma.activity.create({ data: { title: "Game: Quantum Quest", kind: INTERACT, order: 2, content: quantumGameContent, Lesson: { connect: { id: k2QuantumLesson.id } } } });
  }
  console.log("Seeded Quantum Quest module + activities.");

  // ═══════════════════════════════════════════════════════════════════════════
  // SET 2 — Exploration (5 K-2 STEM modules, locked until Set 1 complete)
  // ═══════════════════════════════════════════════════════════════════════════

  const set2Modules = [
    {
      slug: "k2-stem-maze-maps",
      title: "Set 2: Maze Maps & Smart Paths",
      description: "Plan the best path through the maze! 🗺️🤖",
      activityId: "maze-maps",
      gameKey: "maze_maps",
      strand: "AI",
      story: {
        title: "Story: Maze Explorer",
        slides: [
          { id: "mm-s1", text: { en: "Welcome to the Maze Lab! Your robot needs to find the way out.", es: "¡Bienvenido al Laberinto! Tu robot necesita encontrar la salida." }, icon: "🗺️" },
          { id: "mm-s2", text: { en: "Plan a path before you move. Think about which way is best!", es: "Planifica un camino antes de moverte. ¡Piensa cuál es el mejor camino!" }, icon: "🤔" },
          { id: "mm-s3", text: { en: "Watch out for dead ends! A smart path avoids them.", es: "¡Cuidado con los callejones sin salida! Un camino inteligente los evita." }, icon: "⭐" },
        ],
        questions: [
          { id: "mm-q1", prompt: { en: "What should you do before moving in a maze?", es: "¿Qué debes hacer antes de moverte en un laberinto?" }, choices: [{ en: "Plan a path", es: "Planificar un camino" }, { en: "Run fast", es: "Correr rápido" }, { en: "Close your eyes", es: "Cerrar los ojos" }], answerIndex: 0 },
        ],
      },
    },
    {
      slug: "k2-stem-move-measure",
      title: "Set 2: Move, Measure & Improve",
      description: "Move your body and measure how far you go! 🏃📏",
      activityId: "move-measure",
      gameKey: "move_measure",
      strand: "Biotech",
      story: {
        title: "Story: Body Lab",
        slides: [
          { id: "mmi-s1", text: { en: "Your body is amazing! Let's see what it can do.", es: "¡Tu cuerpo es increíble! Veamos qué puede hacer." }, icon: "🏃" },
          { id: "mmi-s2", text: { en: "We will measure how far, how fast, and how many times you can do something!", es: "¡Vamos a medir qué tan lejos, qué tan rápido y cuántas veces puedes hacer algo!" }, icon: "📏" },
          { id: "mmi-s3", text: { en: "Try again to improve your score. Practice makes you stronger!", es: "Intenta de nuevo para mejorar tu puntaje. ¡La práctica te hace más fuerte!" }, icon: "💪" },
        ],
        questions: [
          { id: "mmi-q1", prompt: { en: "How do you know you got better at something?", es: "¿Cómo sabes que mejoraste en algo?" }, choices: [{ en: "Measure and compare", es: "Medir y comparar" }, { en: "Guess", es: "Adivinar" }, { en: "Ask a fish", es: "Preguntar a un pez" }], answerIndex: 0 },
        ],
      },
    },
    {
      slug: "k2-stem-sky-shield",
      title: "Set 2: Sky Shield Patterns",
      description: "Find the pattern and protect the sky! 🛡️✨",
      activityId: "sky-shield",
      gameKey: "sky_shield",
      strand: "Quantum",
      story: {
        title: "Story: Pattern Patrol",
        slides: [
          { id: "ss-s1", text: { en: "The sky needs your help! Strange patterns are appearing.", es: "¡El cielo necesita tu ayuda! Están apareciendo patrones extraños." }, icon: "🌌" },
          { id: "ss-s2", text: { en: "Look at the rows and columns. Can you find the repeating pattern?", es: "Mira las filas y columnas. ¿Puedes encontrar el patrón que se repite?" }, icon: "🔍" },
          { id: "ss-s3", text: { en: "When you spot the pattern, you can protect the sky with your shield!", es: "¡Cuando encuentres el patrón, puedes proteger el cielo con tu escudo!" }, icon: "🛡️" },
        ],
        questions: [
          { id: "ss-q1", prompt: { en: "What is a pattern?", es: "¿Qué es un patrón?" }, choices: [{ en: "Something that repeats", es: "Algo que se repite" }, { en: "A random mess", es: "Un desorden" }, { en: "A color", es: "Un color" }], answerIndex: 0 },
        ],
      },
    },
    {
      slug: "k2-stem-fast-lane",
      title: "Set 2: Fast Lane Signals",
      description: "Read the signals and choose the safe lane! 🚦🏎️",
      activityId: "fast-lane",
      gameKey: "fast_lane",
      strand: "AI + Biotech",
      story: {
        title: "Story: Signal School",
        slides: [
          { id: "fl-s1", text: { en: "Welcome to Signal School! Signals help us stay safe.", es: "¡Bienvenido a la Escuela de Señales! Las señales nos ayudan a estar seguros." }, icon: "🚦" },
          { id: "fl-s2", text: { en: "Green means go, red means stop. But what about the tricky ones?", es: "Verde significa avanzar, rojo significa parar. ¿Pero qué pasa con las difíciles?" }, icon: "🤔" },
          { id: "fl-s3", text: { en: "React quickly but safely! Pick the right lane before time runs out.", es: "¡Reacciona rápido pero con cuidado! Escoge el carril correcto antes de que se acabe el tiempo." }, icon: "⏱️" },
        ],
        questions: [
          { id: "fl-q1", prompt: { en: "What does a green signal mean?", es: "¿Qué significa una señal verde?" }, choices: [{ en: "Go", es: "Avanzar" }, { en: "Stop", es: "Parar" }, { en: "Sleep", es: "Dormir" }], answerIndex: 0 },
        ],
      },
    },
    {
      slug: "k2-stem-qualify-tune-race",
      title: "Set 2: Qualify, Tune, Race",
      description: "Test, change one thing, and race to win! 🏁🔧",
      activityId: "qualify-tune-race",
      gameKey: "qualify_tune_race",
      strand: "Capstone",
      story: {
        title: "Story: Race Lab",
        slides: [
          { id: "qtr-s1", text: { en: "Welcome to the Race Lab! First, test how fast your car goes.", es: "¡Bienvenido al Laboratorio de Carreras! Primero, prueba qué tan rápido va tu carro." }, icon: "🏎️" },
          { id: "qtr-s2", text: { en: "Now change ONE thing — wheels, engine, or weight — and try again!", es: "Ahora cambia UNA cosa — ruedas, motor o peso — ¡e intenta de nuevo!" }, icon: "🔧" },
          { id: "qtr-s3", text: { en: "Did your change make it faster? That is how scientists work: test, change, improve!", es: "¿Tu cambio lo hizo más rápido? ¡Así trabajan los científicos: probar, cambiar, mejorar!" }, icon: "🧪" },
        ],
        questions: [
          { id: "qtr-q1", prompt: { en: "To make a fair test, how many things should you change at a time?", es: "Para hacer una prueba justa, ¿cuántas cosas debes cambiar a la vez?" }, choices: [{ en: "One", es: "Una" }, { en: "All of them", es: "Todas" }, { en: "None", es: "Ninguna" }], answerIndex: 0 },
        ],
      },
    },
  ];

  for (const s2 of set2Modules) {
    const mod = await prisma.module.upsert({
      where: { slug: s2.slug },
      update: { title: s2.title, description: s2.description, level: "K-2", published: true },
      create: { slug: s2.slug, title: s2.title, description: s2.description, level: "K-2", published: true },
    });

    let s2Unit = await prisma.unit.findFirst({ where: { moduleId: mod.id, title: "Unit 1" } });
    if (!s2Unit) {
      s2Unit = await prisma.unit.create({ data: { title: "Unit 1", order: 1, Module: { connect: { id: mod.id } }, teacher: { connect: { id: teacher.id } } } });
    }

    let s2Lesson = await prisma.lesson.findFirst({ where: { unitId: s2Unit.id, title: s2.title } });
    if (!s2Lesson) {
      s2Lesson = await prisma.lesson.create({ data: { title: s2.title, order: 1, Unit: { connect: { id: s2Unit.id } } } });
    }

    const storyContent = JSON.stringify({
      type: "story_quiz",
      slides: s2.story.slides,
      questions: s2.story.questions,
      review: { keyIdea: { en: s2.description }, vocab: [s2.strand.toLowerCase()] },
    });

    let storyAct = await prisma.activity.findFirst({ where: { lessonId: s2Lesson.id, kind: INFO, order: 1 } });
    if (storyAct) {
      await prisma.activity.update({ where: { id: storyAct.id }, data: { title: s2.story.title, content: storyContent } });
    } else {
      await prisma.activity.create({ data: { title: s2.story.title, kind: INFO, order: 1, content: storyContent, Lesson: { connect: { id: s2Lesson.id } } } });
    }

    const gameContent = JSON.stringify({ gameKey: s2.gameKey });
    let gameAct = await prisma.activity.findFirst({ where: { lessonId: s2Lesson.id, kind: INTERACT, order: 2 } });
    if (gameAct) {
      await prisma.activity.update({ where: { id: gameAct.id }, data: { id: s2.activityId, title: `Game: ${s2.title.replace("Set 2: ", "")}`, content: gameContent } });
    } else {
      await prisma.activity.create({ data: { id: s2.activityId, title: `Game: ${s2.title.replace("Set 2: ", "")}`, kind: INTERACT, order: 2, content: gameContent, Lesson: { connect: { id: s2Lesson.id } } } });
    }

    console.log("Seeded Set 2 module:", s2.slug);
  }

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
  if (buildBot) {
    await prisma.activity.update({
      where: { id: buildBot.id },
      data: { id: "build-a-bot", title: "Build a Bot", content: "Drag the parts to build a robot." },
    });
  } else {
    await prisma.activity.create({
      data: {
        id: "build-a-bot",
        title: "Build a Bot",
        kind: INTERACT,
        order: 2,
        content: "Drag the parts to build a robot.",
        Lesson: { connect: { id: lesson.id } },
      },
    });
  }
  console.log("Seeded activities.");

  // ═══════════════════════════════════════════════════════════════════════════
  // Module Families & Variants (grade-banded content system)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("Seeding module families and variants...");

  const familyDefs = [
    {
      key: "sequencing",
      title: "Sequencing & Debugging",
      iconEmoji: "🔧",
      k2: { title: "Boost's Lost Steps", subtitle: "Plan a path step by step!", moduleSlug: "k2-stem-sequencing" },
      g3_5: {
        title: "Bug Lab: Sequence & Debug",
        subtitle: "Find the bug in the algorithm!",
        contentConfig: {
          theme: "lab",
          reading: { wordCount: 250, topic: "algorithms, precise steps, debugging", vocabulary: ["algorithm", "sequence", "debug", "loop", "variable"] },
          questions: { count: 5, types: ["ordering", "bug-identification", "cause-effect"] },
          game: { rounds: 3, phases: ["reorder", "find-bug", "optimize"], mechanics: ["playback", "highlight-wrong-step", "path-preview", "hint-ladder"] },
          supports: { hintLadder: true, glossary: true, readAloud: true, recap: true },
          ui: { tone: "mission-control", progressType: "ring" },
        },
      },
    },
    {
      key: "motion",
      title: "Forces & Motion",
      iconEmoji: "🚀",
      k2: { title: "Rhyme & Ride", subtitle: "Ride through worlds and catch rhymes!", moduleSlug: "k2-stem-rhyme-ride" },
      g3_5: {
        title: "Motion Mission: Force Lab",
        subtitle: "Predict, test, and master forces!",
        contentConfig: {
          theme: "lab",
          reading: { wordCount: 260, topic: "force, friction, mass, prediction", vocabulary: ["force", "friction", "mass", "acceleration", "prediction"] },
          questions: { count: 5, types: ["prediction", "comparison", "variable-identification"] },
          game: { rounds: 3, phases: ["predict", "test", "adjust-variables"], mechanics: ["force-slider", "surface-selector", "target-practice"] },
          supports: { hintLadder: true, glossary: true, readAloud: true, recap: true },
          ui: { tone: "lab", progressType: "bar" },
        },
      },
    },
    {
      key: "sorting",
      title: "Sorting & Classification",
      iconEmoji: "📊",
      k2: { title: "Bounce & Buds", subtitle: "Bounce through the right gate!", moduleSlug: "k2-stem-bounce-buds" },
      g3_5: {
        title: "Data Dash: Sort & Discover",
        subtitle: "Classify data and find hidden patterns!",
        contentConfig: {
          theme: "dashboard",
          reading: { wordCount: 240, topic: "classification, organizing data, finding patterns", vocabulary: ["classify", "attribute", "pattern", "data", "graph"] },
          questions: { count: 6, types: ["multi-attribute-sort", "hidden-rule", "chart-reading"] },
          game: { rounds: 3, phases: ["sort-by-attribute", "infer-rule", "read-chart"], mechanics: ["drag-sort", "rule-builder", "bar-chart"] },
          supports: { hintLadder: true, glossary: true, readAloud: true, recap: true },
          ui: { tone: "mission", progressType: "ring" },
        },
      },
    },
    {
      key: "plant_variables",
      title: "Plants & Fair Tests",
      iconEmoji: "🌱",
      k2: { title: "Gotcha Gears", subtitle: "Catch the right gear!", moduleSlug: "k2-stem-gotcha-gears" },
      g3_5: {
        title: "Variable Quest: Fair Test Lab",
        subtitle: "Design experiments and test your ideas!",
        contentConfig: {
          theme: "lab",
          reading: { wordCount: 270, topic: "fair tests, changing one variable, evidence-based conclusions", vocabulary: ["variable", "control", "hypothesis", "evidence", "conclusion"] },
          questions: { count: 5, types: ["fair-test-check", "variable-identification", "conclusion-choice"] },
          game: { rounds: 3, phases: ["setup-experiment", "observe-results", "evaluate-fairness"], mechanics: ["variable-lock", "lab-notebook", "sentence-stems"] },
          supports: { hintLadder: true, glossary: true, readAloud: true, recap: true },
          ui: { tone: "lab", progressType: "bar" },
        },
      },
    },
    {
      key: "bridge",
      title: "Engineering & Design",
      iconEmoji: "🏗️",
      k2: { title: "Tank Trek", subtitle: "Guide a robot through mazes!", moduleSlug: "k2-stem-tank-trek" },
      g3_5: {
        title: "Design Under Pressure: Bridge Lab",
        subtitle: "Build, test, and redesign structures!",
        contentConfig: {
          theme: "blueprint",
          reading: { wordCount: 260, topic: "stability, triangles, constraints, redesign", vocabulary: ["stability", "triangle", "constraint", "load", "redesign"] },
          questions: { count: 5, types: ["weak-point-identification", "material-choice", "design-comparison"] },
          game: { rounds: 3, phases: ["build", "load-test", "redesign"], mechanics: ["weak-point-highlight", "starter-blueprint", "budget-constraint", "before-after-compare"] },
          supports: { hintLadder: true, glossary: true, readAloud: true, recap: true },
          ui: { tone: "blueprint", progressType: "ring" },
        },
      },
    },
  ];

  for (const fd of familyDefs) {
    const family = await prisma.moduleFamily.upsert({
      where: { key: fd.key },
      create: { key: fd.key, title: fd.title, iconEmoji: fd.iconEmoji },
      update: { title: fd.title, iconEmoji: fd.iconEmoji },
    });

    // K-2 variant (links to existing module)
    await prisma.moduleVariant.upsert({
      where: { familyId_band_version: { familyId: family.id, band: "k2", version: "1.0" } },
      create: {
        familyId: family.id,
        band: "k2",
        version: "1.0",
        title: fd.k2.title,
        subtitle: fd.k2.subtitle,
        status: "active",
        moduleSlug: fd.k2.moduleSlug,
      },
      update: { title: fd.k2.title, subtitle: fd.k2.subtitle, moduleSlug: fd.k2.moduleSlug },
    });

    // G3-5 variant (new upper-elementary content)
    await prisma.moduleVariant.upsert({
      where: { familyId_band_version: { familyId: family.id, band: "g3_5", version: "1.0" } },
      create: {
        familyId: family.id,
        band: "g3_5",
        version: "1.0",
        title: fd.g3_5.title,
        subtitle: fd.g3_5.subtitle,
        status: "active",
        contentConfig: fd.g3_5.contentConfig,
      },
      update: { title: fd.g3_5.title, subtitle: fd.g3_5.subtitle, contentConfig: fd.g3_5.contentConfig },
    });

    console.log(`  Seeded family "${fd.key}" with k2 + g3_5 variants`);
  }

  // Seed a demo g3_5 class if teacher exists
  const demoClass = await prisma.course.upsert({
    where: { joinCode: "UPPER35" },
    create: {
      name: "Grade 3-5 STEM Demo",
      joinCode: "UPPER35",
      teacherId: teacher.id,
      gradeBand: "g3_5",
    },
    update: { gradeBand: "g3_5" },
  });
  console.log("Seeded demo g3_5 class:", demoClass.name);

  // Auto-assign all g3_5 variants to the demo class
  const g35Variants = await prisma.moduleVariant.findMany({ where: { band: "g3_5", status: "active" } });
  for (let i = 0; i < g35Variants.length; i++) {
    await prisma.classModuleAssignment.upsert({
      where: { courseId_moduleVariantId: { courseId: demoClass.id, moduleVariantId: g35Variants[i].id } },
      create: { courseId: demoClass.id, moduleVariantId: g35Variants[i].id, orderIndex: i },
      update: { orderIndex: i },
    });
  }
  console.log(`  Assigned ${g35Variants.length} g3_5 variants to demo class`);

  console.log("Module families and variants seeded.");
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
