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
      description: "Sort plants, parts, and needs with Buddy! 🌿🧫",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-bounce-buds",
      title: "STEM-1: Module 3 — Bounce & Buds",
      description: "Sort plants, parts, and needs with Buddy! 🌿🧫",
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
