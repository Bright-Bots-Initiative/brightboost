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
  } else {
    // Always refresh password hash on seed (ensures credentials match docs)
    teacher = await prisma.user.update({
      where: { id: teacher.id },
      data: { password: teacherPasswordHash },
    });
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
  } else {
    // Always refresh password hash on seed
    student = await prisma.user.update({
      where: { id: student.id },
      data: { password: studentPasswordHash },
    });
  }
  console.log("Seeded student:", student.email);

  // Test Explorer — student with Set 1 fully completed (for Set 2 testing)
  const explorerHash = await bcrypt.hash("explore123", 10);
  let explorer = await prisma.user.findUnique({ where: { email: "explorer@test.com" } });
  if (!explorer) {
    explorer = await prisma.user.create({
      data: {
        id: "explorer-set2",
        name: "Test Explorer",
        email: "explorer@test.com",
        password: explorerHash,
        role: "student",
        xp: 650,
        level: "Explorer",
        streak: 4,
      },
    });
    console.log("Created Test Explorer student.");
  } else {
    explorer = await prisma.user.update({
      where: { id: explorer.id },
      data: { password: explorerHash, xp: 650, streak: 4 },
    });
  }

  // Enroll explorer in teacher's class
  const teacherCourse = await prisma.course.findFirst({ where: { teacherId: teacher.id } });
  if (teacherCourse) {
    await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: explorer.id, courseId: teacherCourse.id } },
      create: { studentId: explorer.id, courseId: teacherCourse.id },
      update: {},
    });
    console.log("Enrolled explorer in class:", teacherCourse.name);
  }

  // Create avatar for explorer
  await prisma.avatar.upsert({
    where: { studentId: explorer.id },
    create: { studentId: explorer.id, level: 5, xp: 650, hp: 100, energy: 100, speed: 4, control: 3, focus: 3 },
    update: { level: 5, xp: 650, speed: 4, control: 3, focus: 3 },
  });

  // Jordan — 9-year-old student in a grade 3-5 class
  const jordanHash = await bcrypt.hash("jordan123", 10);
  let jordan = await prisma.user.findUnique({ where: { email: "jordan@test.com" } });
  if (!jordan) {
    jordan = await prisma.user.create({
      data: {
        id: "jordan-g35",
        name: "Jordan",
        email: "jordan@test.com",
        password: jordanHash,
        role: "student",
        grade: 4,
        loginIcon: "🚀",
        xp: 0,
        level: "Explorer",
        streak: 0,
      },
    });
    console.log("Created Jordan (grade 3-5 student).");
  } else {
    jordan = await prisma.user.update({
      where: { id: jordan.id },
      data: { password: jordanHash, grade: 4 },
    });
  }

  // Create a grade 3-5 class and enroll Jordan
  const g35Class = await prisma.course.upsert({
    where: { joinCode: "GRADE35" },
    create: { name: "Grade 3-5 STEM", joinCode: "GRADE35", teacherId: teacher.id, gradeBand: "g3_5" },
    update: { gradeBand: "g3_5" },
  });
  await prisma.enrollment.upsert({
    where: { studentId_courseId: { studentId: jordan.id, courseId: g35Class.id } },
    create: { studentId: jordan.id, courseId: g35Class.id },
    update: {},
  });
  console.log("Enrolled Jordan in grade 3-5 class:", g35Class.name);

  // Create avatar for Jordan
  await prisma.avatar.upsert({
    where: { studentId: jordan.id },
    create: { studentId: jordan.id, level: 1, xp: 0, hp: 100, energy: 100 },
    update: {},
  });

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
      title: "Fix the Order",
      description: "Help Boost find the way! Plan a path step by step. 🤖🗺️⭐",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-sequencing",
      title: "Fix the Order",
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
      title: "Rhyme & Ride",
      description: "Ride through three worlds and catch the rhymes! 🎵🚲",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-rhyme-ride",
      title: "Rhyme & Ride",
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
      { id: "q1", prompt: { i18nKey: "content.rhymo.q1.prompt" }, choices: [{ i18nKey: "content.rhymo.q1.c1" }, { i18nKey: "content.rhymo.q1.c2" }, { i18nKey: "content.rhymo.q1.c3" }, { i18nKey: "content.rhymo.q1.c4" }], answerIndex: 0, hint: { i18nKey: "content.rhymo.q1.hint" } },
      { id: "q2", prompt: { i18nKey: "content.rhymo.q2.prompt" }, choices: [{ i18nKey: "content.rhymo.q2.c1" }, { i18nKey: "content.rhymo.q2.c2" }, { i18nKey: "content.rhymo.q2.c3" }, { i18nKey: "content.rhymo.q2.c4" }], answerIndex: 1, hint: { i18nKey: "content.rhymo.q2.hint" } },
      { id: "q3", prompt: { i18nKey: "content.rhymo.q3.prompt" }, choices: [{ i18nKey: "content.rhymo.q3.c1" }, { i18nKey: "content.rhymo.q3.c2" }, { i18nKey: "content.rhymo.q3.c3" }, { i18nKey: "content.rhymo.q3.c4" }], answerIndex: 1, hint: { i18nKey: "content.rhymo.q3.hint" } },
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
      title: "Bounce & Buds",
      description: "Bounce Buddy through the right gate to learn about plants! 🌿🧫",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-bounce-buds",
      title: "Bounce & Buds",
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
      { id: "q1", prompt: { i18nKey: "content.buddy.q1.prompt" }, choices: [{ i18nKey: "content.buddy.q1.c1" }, { i18nKey: "content.buddy.q1.c2" }, { i18nKey: "content.buddy.q1.c3" }, { i18nKey: "content.buddy.q1.c4" }], answerIndex: 0, hint: { i18nKey: "content.buddy.q1.hint" } },
      { id: "q2", prompt: { i18nKey: "content.buddy.q2.prompt" }, choices: [{ i18nKey: "content.buddy.q2.c1" }, { i18nKey: "content.buddy.q2.c2" }, { i18nKey: "content.buddy.q2.c3" }, { i18nKey: "content.buddy.q2.c4" }], answerIndex: 0, hint: { i18nKey: "content.buddy.q2.hint" } },
      { id: "q3", prompt: { i18nKey: "content.buddy.q3.prompt" }, choices: [{ i18nKey: "content.buddy.q3.c1" }, { i18nKey: "content.buddy.q3.c2" }, { i18nKey: "content.buddy.q3.c3" }, { i18nKey: "content.buddy.q3.c4" }], answerIndex: 0, hint: { i18nKey: "content.buddy.q3.hint" } },
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
      title: "Gotcha Gears",
      description: "Catch the right gear to solve AI thinking puzzles! ⚙️🤖",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "k2-stem-gotcha-gears",
      title: "Gotcha Gears",
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
      { id: "q1", prompt: { i18nKey: "content.gearbot.q1.prompt" }, choices: [{ i18nKey: "content.gearbot.q1.c1" }, { i18nKey: "content.gearbot.q1.c2" }, { i18nKey: "content.gearbot.q1.c3" }, { i18nKey: "content.gearbot.q1.c4" }], answerIndex: 0, hint: { i18nKey: "content.gearbot.q1.hint" } },
      { id: "q2", prompt: { i18nKey: "content.gearbot.q2.prompt" }, choices: [{ i18nKey: "content.gearbot.q2.c1" }, { i18nKey: "content.gearbot.q2.c2" }, { i18nKey: "content.gearbot.q2.c3" }, { i18nKey: "content.gearbot.q2.c4" }], answerIndex: 0, hint: { i18nKey: "content.gearbot.q2.hint" } },
      { id: "q3", prompt: { i18nKey: "content.gearbot.q3.prompt" }, choices: [{ i18nKey: "content.gearbot.q3.c1" }, { i18nKey: "content.gearbot.q3.c2" }, { i18nKey: "content.gearbot.q3.c3" }, { i18nKey: "content.gearbot.q3.c4" }], answerIndex: 0, hint: { i18nKey: "content.gearbot.q3.hint" } },
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
    update: { title: "Tank Trek", description: "Guide a robot through mazes! 🤖🧩", level: "K-2", published: true },
    create: { slug: "k2-stem-tank-trek", title: "Tank Trek", description: "Guide a robot through mazes! 🤖🧩", level: "K-2", published: true },
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
      { id: "tt-s1", text: { en: "Meet Bolt! Bolt listens to your code words to move safely through the maze.", es: "¡Conoce a Bolt! Bolt escucha tus palabras de código para moverse con seguridad por el laberinto." }, icon: "🤖" },
      { id: "tt-s2", text: { en: "Use clear commands: Forward, Turn Left, Turn Right. Order matters!", es: "Usa comandos claros: Adelante, Girar Izquierda, Girar Derecha. ¡El orden importa!" }, icon: "🧭" },
      { id: "tt-s3", text: { en: "Great robot coders test, fix, and try again. Short smart paths earn more stars!", es: "Los grandes programadores de robots prueban, corrigen e intentan otra vez. ¡Los caminos cortos e inteligentes ganan más estrellas!" }, icon: "⭐" },
    ],
    questions: [
      { id: "tt-q1", prompt: { en: "Which command makes Bolt move ahead one space?", es: "¿Qué comando hace que Bolt avance un espacio?" }, choices: [{ en: "Forward", es: "Adelante" }, { en: "Turn Left", es: "Girar Izquierda" }, { en: "Turn Right", es: "Girar Derecha" }, { en: "Stop and spin", es: "Parar y girar" }], answerIndex: 0, hint: { en: "Forward means move ahead.", es: "Adelante significa moverse al frente." } },
      { id: "tt-q2", prompt: { en: "Two paths reach the goal. Which is more efficient?", es: "Dos caminos llegan a la meta. ¿Cuál es más eficiente?" }, choices: [{ en: "The path with fewer commands", es: "El camino con menos comandos" }, { en: "The path with more turns", es: "El camino con más giros" }, { en: "The longest path", es: "El camino más largo" }, { en: "Any path is always equal", es: "Cualquier camino siempre es igual" }], answerIndex: 0, hint: { en: "Efficient means doing the job in fewer steps.", es: "Eficiente significa hacer el trabajo con menos pasos." } },
      { id: "tt-q3", prompt: { en: "Bolt bumped a wall. What should you do next?", es: "Bolt chocó con una pared. ¿Qué debes hacer después?" }, choices: [{ en: "Change one command and test again", es: "Cambiar un comando y probar otra vez" }, { en: "Keep the same plan forever", es: "Seguir el mismo plan para siempre" }, { en: "Press random buttons", es: "Presionar botones al azar" }, { en: "Quit the mission", es: "Salir de la misión" }], answerIndex: 0, hint: { en: "Debugging means fixing and retesting.", es: "Depurar significa corregir y volver a probar." } },
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
    await prisma.activity.update({ where: { id: tankGameAct.id }, data: { id: "tank-trek", title: "Game: Tank Trek", content: tankGameContent } });
  } else {
    await prisma.activity.create({ data: { id: "tank-trek", title: "Game: Tank Trek", kind: INTERACT, order: 2, content: tankGameContent, Lesson: { connect: { id: k2TankLesson.id } } } });
  }
  console.log("Seeded Tank Trek module + activities.");

  // ═══════════════════════════════════════════════════════════════════════════
  // Module 5 — Quantum Quest (Set 2: Math / Space / Quantum)
  // ═══════════════════════════════════════════════════════════════════════════
  const k2QuantumModule = await prisma.module.upsert({
    where: { slug: "k2-stem-quantum-quest" },
    update: { title: "Quantum Quest", description: "Explore quantum puzzles in a space math adventure! 🚀✨", level: "K-2", published: true },
    create: { slug: "k2-stem-quantum-quest", title: "Quantum Quest", description: "Explore quantum puzzles in a space math adventure! 🚀✨", level: "K-2", published: true },
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
      { id: "qq-s1", text: { en: "Welcome, Space Explorer! Your mission is to spot number patterns and true clues in the stars.", es: "¡Bienvenido, Explorador Espacial! Tu misión es encontrar patrones de números y pistas verdaderas en las estrellas." }, icon: "🚀" },
      { id: "qq-s2", text: { en: "Look carefully at every choice. Use evidence: count, compare, and notice what repeats.", es: "Mira con atención cada opción. Usa evidencia: cuenta, compara y nota lo que se repite." }, icon: "🔍" },
      { id: "qq-s3", text: { en: "Each correct answer builds your streak power. Careful thinking keeps your mission safe!", es: "Cada respuesta correcta aumenta tu racha. ¡Pensar con cuidado mantiene tu misión segura!" }, icon: "🌟" },
    ],
    questions: [
      { id: "qq-q1", prompt: { en: "Which pattern comes next: 2, 4, 6, __?", es: "¿Qué patrón sigue: 2, 4, 6, __?" }, choices: [{ en: "8", es: "8" }, { en: "7", es: "7" }, { en: "5", es: "5" }, { en: "10", es: "10" }], answerIndex: 0, hint: { en: "The pattern adds 2 each time.", es: "El patrón suma 2 cada vez." } },
      { id: "qq-q2", prompt: { en: "You count 3 stars, then 2 more. How many stars now?", es: "Cuentas 3 estrellas y luego 2 más. ¿Cuántas estrellas hay ahora?" }, choices: [{ en: "4", es: "4" }, { en: "5", es: "5" }, { en: "6", es: "6" }, { en: "3", es: "3" }], answerIndex: 1, hint: { en: "Count on: 3, 4, 5.", es: "Cuenta hacia adelante: 3, 4, 5." } },
      { id: "qq-q3", prompt: { en: "Which answer shows careful evidence?", es: "¿Qué respuesta muestra evidencia cuidadosa?" }, choices: [{ en: "Pick the biggest number quickly", es: "Elegir el número más grande rápido" }, { en: "Guess before you look", es: "Adivinar antes de mirar" }, { en: "Check the pattern, then choose", es: "Revisar el patrón y luego elegir" }, { en: "Tap any star", es: "Tocar cualquier estrella" }], answerIndex: 2, hint: { en: "Scientists observe first.", es: "Los científicos observan primero." } },
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
    await prisma.activity.update({ where: { id: quantumGameAct.id }, data: { id: "quantum-quest", title: "Game: Quantum Quest", content: quantumGameContent } });
  } else {
    await prisma.activity.create({ data: { id: "quantum-quest", title: "Game: Quantum Quest", kind: INTERACT, order: 2, content: quantumGameContent, Lesson: { connect: { id: k2QuantumLesson.id } } } });
  }
  console.log("Seeded Quantum Quest module + activities.");

  // ═══════════════════════════════════════════════════════════════════════════
  // Test Explorer — Set 1 completion records
  // ═══════════════════════════════════════════════════════════════════════════
  const set1Activities = [
    { activityId: "bounce-buds", moduleSlug: "k2-stem-bounce-buds", timeSpentS: 180, daysAgo: 5 },
    { activityId: "gotcha-gears", moduleSlug: "k2-stem-gotcha-gears", timeSpentS: 210, daysAgo: 4 },
    { activityId: "rhyme-ride", moduleSlug: "k2-stem-rhyme-ride", timeSpentS: 240, daysAgo: 3 },
    { activityId: "tank-trek", moduleSlug: "k2-stem-tank-trek", timeSpentS: 195, daysAgo: 2 },
    { activityId: "quantum-quest", moduleSlug: "k2-stem-quantum-quest", timeSpentS: 220, daysAgo: 1 },
  ];

  for (const sa of set1Activities) {
    const completedAt = new Date(Date.now() - sa.daysAgo * 86400000);
    await prisma.progress.upsert({
      where: { studentId_activityId: { studentId: explorer.id, activityId: sa.activityId } },
      create: {
        studentId: explorer.id,
        activityId: sa.activityId,
        moduleSlug: sa.moduleSlug,
        status: "COMPLETED",
        timeSpentS: sa.timeSpentS,
      },
      update: { status: "COMPLETED", timeSpentS: sa.timeSpentS },
    });
  }

  // Game personal bests for explorer
  const explorerBests = [
    { gameKey: "buddy_garden_sort", bestScore: 45, lastScore: 45, bestStreak: 4, bestRoundsCompleted: 8 },
    { gameKey: "gotcha_gears_unity", bestScore: 80, lastScore: 60, bestStreak: 3, bestRoundsCompleted: 7 },
    { gameKey: "boost_path_planner", bestScore: 35, lastScore: 35, bestStreak: 2, bestRoundsCompleted: 3 },
    { gameKey: "rhymo_rhyme_rocket", bestScore: 120, lastScore: 90, bestStreak: 5, bestRoundsCompleted: 15 },
    { gameKey: "tank_trek", bestScore: 55, lastScore: 55, bestStreak: 3, bestRoundsCompleted: 7 },
  ];

  for (const gb of explorerBests) {
    await prisma.gamePersonalBest.upsert({
      where: { studentId_gameKey: { studentId: explorer.id, gameKey: gb.gameKey } },
      create: { studentId: explorer.id, ...gb, playCount: 3 },
      update: gb,
    });
  }
  console.log("Seeded Test Explorer with Set 1 completion + personal bests.");

  // ═══════════════════════════════════════════════════════════════════════════
  // SET 2 — Exploration (5 K-2 STEM modules, locked until Set 1 complete)
  // ═══════════════════════════════════════════════════════════════════════════

  const set2Modules = [
    {
      slug: "k2-stem-maze-maps",
      title: "Maze Maps",
      description: "Plan the best path through the maze! 🗺️🤖",
      activityId: "maze-maps",
      gameKey: "maze_maps",
      strand: "AI",
      story: {
        title: "Story: Maze Explorer",
        slides: [
          { id: "mm-s1", text: { en: "Spark the helper bot is lost in the idea maze! Glowing orbs are scattered everywhere, but sneaky sweepers are patrolling the paths. Spark needs YOUR help to collect every orb and find the exit.", es: "¡Spark el robot ayudante está perdido en el laberinto de ideas! Hay esferas brillantes por todas partes, pero los barredores patrullan los caminos. ¡Spark necesita TU ayuda para recoger cada esfera y encontrar la salida!" }, icon: "🗺️" },
          { id: "mm-s2", text: { en: "But here's the trick — Spark can't just run in! The sweepers move in patterns. Watch them carefully before you move. The smartest path isn't always the shortest one.", es: "Pero hay un truco — ¡Spark no puede solo correr! Los barredores se mueven en patrones. Obsérvalos antes de moverte. El camino más inteligente no siempre es el más corto." }, icon: "🤔" },
          { id: "mm-s3", text: { en: "Ready? Guide Spark through the maze. Collect all the orbs. Avoid the sweepers. Think before you move!", es: "¿Listo? Guía a Spark por el laberinto. Recoge todas las esferas. Evita los barredores. ¡Piensa antes de moverte!" }, icon: "⭐" },
        ],
        questions: [
          { id: "mm-q1", prompt: { en: "What should you do before moving in a maze?", es: "¿Qué debes hacer antes de moverte en un laberinto?" }, choices: [{ en: "Plan a path", es: "Planificar un camino" }, { en: "Run fast", es: "Correr rápido" }, { en: "Close your eyes", es: "Cerrar los ojos" }, { en: "Ask for directions", es: "Pedir direcciones" }], answerIndex: 0 },
        ],
      },
      quiz: [
        { id: "mmz-q1", prompt: { en: "Before moving through the maze, what should you do first?", es: "Antes de moverte en el laberinto, ¿qué debes hacer primero?" }, choices: [{ en: "Run as fast as you can", es: "Correr lo más rápido posible" }, { en: "Watch the sweeper's pattern", es: "Observar el patrón del barredor" }, { en: "Close your eyes and guess", es: "Cerrar los ojos y adivinar" }, { en: "Pick the shortest path", es: "Elegir el camino más corto" }], answerIndex: 1 },
        { id: "mmz-q2", prompt: { en: "A sweeper moves left, right, left, right. What does it do next?", es: "Un barredor se mueve izquierda, derecha, izquierda, derecha. ¿Qué hace después?" }, choices: [{ en: "Stop", es: "Parar" }, { en: "Move up", es: "Ir arriba" }, { en: "Move left", es: "Ir a la izquierda" }, { en: "Disappear", es: "Desaparecer" }], answerIndex: 2 },
        { id: "mmz-q3", prompt: { en: "Which is the smartest path?", es: "¿Cuál es el camino más inteligente?" }, choices: [{ en: "The shortest path past a sweeper", es: "El camino más corto pasando un barredor" }, { en: "A longer path that avoids sweepers", es: "Un camino más largo que evita barredores" }, { en: "Standing still forever", es: "Quedarse quieto para siempre" }, { en: "The path with the most turns", es: "El camino con más giros" }], answerIndex: 1 },
      ],
    },
    {
      slug: "k2-stem-move-measure",
      title: "Move & Measure",
      description: "Move your body and measure how far you go! 🏃📏",
      activityId: "move-measure",
      gameKey: "move_measure",
      strand: "Biotech",
      story: {
        title: "Story: Body Lab",
        slides: [
          { id: "mmi-s1", text: { en: "Welcome to the Motion Lab! Today you're the scientist AND the athlete. You'll run, jump, and throw — then measure how you did.", es: "¡Bienvenido al Laboratorio de Movimiento! Hoy eres el científico Y el atleta. Correrás, saltarás y lanzarás — luego medirás cómo te fue." }, icon: "🏃" },
          { id: "mmi-s2", text: { en: "But here's what makes a real scientist — after you measure, you get to IMPROVE. Pick one coaching tip, try again, and see if your numbers go up.", es: "Pero esto es lo que hace a un verdadero científico — después de medir, puedes MEJORAR. Elige un consejo, inténtalo de nuevo y mira si tus números suben." }, icon: "📏" },
          { id: "mmi-s3", text: { en: "Ready to test your body and your brain? Let's go!", es: "¿Listo para probar tu cuerpo y tu cerebro? ¡Vamos!" }, icon: "💪" },
        ],
        questions: [
          { id: "mmi-q1", prompt: { en: "How do you know you got better at something?", es: "¿Cómo sabes que mejoraste en algo?" }, choices: [{ en: "Measure and compare", es: "Medir y comparar" }, { en: "Guess", es: "Adivinar" }, { en: "Ask a fish", es: "Preguntar a un pez" }, { en: "Just feel it", es: "Solo sentirlo" }], answerIndex: 0 },
        ],
      },
      quiz: [
        { id: "mmv-q1", prompt: { en: "What should you do after your first try?", es: "¿Qué debes hacer después de tu primer intento?" }, choices: [{ en: "Give up", es: "Rendirse" }, { en: "Try the exact same thing again", es: "Intentar exactamente lo mismo" }, { en: "Look at your results and pick one thing to change", es: "Mirar tus resultados y elegir una cosa para cambiar" }, { en: "Change everything at once", es: "Cambiar todo a la vez" }], answerIndex: 2 },
        { id: "mmv-q2", prompt: { en: "Which body part helps the most with jumping?", es: "¿Qué parte del cuerpo ayuda más a saltar?" }, choices: [{ en: "Your arms", es: "Tus brazos" }, { en: "Your legs", es: "Tus piernas" }, { en: "Your ears", es: "Tus orejas" }, { en: "Your neck", es: "Tu cuello" }], answerIndex: 1 },
        { id: "mmv-q3", prompt: { en: "You threw the ball 10 feet. Then you used a tip and threw it 14 feet. What happened?", es: "Lanzaste la pelota 10 pies. Luego usaste un consejo y la lanzaste 14 pies. ¿Qué pasó?" }, choices: [{ en: "Nothing changed", es: "Nada cambió" }, { en: "The tip helped you throw farther", es: "El consejo te ayudó a lanzar más lejos" }, { en: "You should try a different tip", es: "Deberías probar otro consejo" }, { en: "Throwing doesn't use your arms", es: "Lanzar no usa tus brazos" }], answerIndex: 1 },
      ],
    },
    {
      slug: "k2-stem-sky-shield",
      title: "Sky Shield",
      description: "Find the pattern and protect the sky! 🛡️✨",
      activityId: "sky-shield",
      gameKey: "sky_shield",
      strand: "Quantum",
      story: {
        title: "Story: Pattern Patrol",
        slides: [
          { id: "ss-s1", text: { en: "Light drops are falling. Catch them in the right lane.", es: "Caen gotas de luz. Atrápalas en el carril correcto." }, icon: "🌌" },
          { id: "ss-s2", text: { en: "Watch the pattern: blue, gold, blue, gold...", es: "Mira el patrón: azul, dorado, azul, dorado..." }, icon: "🔍" },
          { id: "ss-s3", text: { en: "If a light is mystery, tap Scan first.", es: "Si una luz es misterio, toca Escanear primero." }, icon: "🛡️" },
        ],
        questions: [
          { id: "ss-q1", prompt: { en: "What is a pattern?", es: "¿Qué es un patrón?" }, choices: [{ en: "Something that repeats", es: "Algo que se repite" }, { en: "A random mess", es: "Un desorden" }, { en: "A color", es: "Un color" }, { en: "A loud sound", es: "Un sonido fuerte" }], answerIndex: 0, hint: { en: "Look for what repeats.", es: "Busca lo que se repite." } },
        ],
      },
      quiz: [
        { id: "ss-qz1", prompt: { en: "Blue, gold, blue, gold, blue. What comes next?", es: "Azul, dorado, azul, dorado, azul. ¿Qué sigue?" }, choices: [{ en: "Blue", es: "Azul" }, { en: "Gold", es: "Dorado" }, { en: "Red", es: "Rojo" }, { en: "Green", es: "Verde" }], answerIndex: 1, hint: { en: "Say the pattern out loud.", es: "Di el patrón en voz alta." } },
        { id: "ss-qz2", prompt: { en: "You see a mystery light. What should you do?", es: "Ves una luz misteriosa. ¿Qué debes hacer?" }, choices: [{ en: "Guess fast", es: "Adivinar rápido" }, { en: "Tap Scan first", es: "Tocar Escanear primero" }, { en: "Run away", es: "Huir" }, { en: "Skip your turn", es: "Saltar tu turno" }], answerIndex: 1, hint: { en: "Scan helps you check before choosing.", es: "Escanear te ayuda a revisar antes de elegir." } },
        { id: "ss-qz3", prompt: { en: "Why watch before you choose?", es: "¿Por qué mirar antes de elegir?" }, choices: [{ en: "To predict the next drop", es: "Para predecir la próxima gota" }, { en: "To make it harder", es: "Para hacerlo más difícil" }, { en: "Because patterns do not matter", es: "Porque los patrones no importan" }, { en: "To lose points", es: "Para perder puntos" }], answerIndex: 0, hint: { en: "Watching helps your brain plan.", es: "Mirar ayuda a tu cerebro a planear." } },
      ],
    },
    {
      slug: "k2-stem-fast-lane",
      title: "Fast Lane",
      description: "Read the signals and choose the safe lane! 🚦🏎️",
      activityId: "fast-lane",
      gameKey: "fast_lane",
      strand: "AI + Biotech",
      story: {
        title: "Story: Signal School",
        slides: [
          { id: "fl-s1", text: { en: "You're driving the science delivery cart today! The lab needs these supplies FAST — but the road is full of obstacles. Cones, puddles, and blocked lanes are everywhere.", es: "¡Hoy conduces el carrito de entregas del laboratorio! El laboratorio necesita estos materiales RÁPIDO — pero el camino está lleno de obstáculos. Conos, charcos y carriles bloqueados por todas partes." }, icon: "🚦" },
          { id: "fl-s2", text: { en: "Follow the road signals: green arrow means GO, yellow means GET READY, red X means AVOID. The safest driver wins — not the fastest!", es: "Sigue las señales del camino: flecha verde significa AVANZA, amarillo significa PREPÁRATE, X roja significa EVITA. ¡El conductor más seguro gana — no el más rápido!" }, icon: "🤔" },
          { id: "fl-s3", text: { en: "Watch ahead, read the signs, and deliver those supplies safely. Let's roll!", es: "Mira adelante, lee las señales y entrega los materiales con seguridad. ¡Vamos!" }, icon: "⏱️" },
        ],
        questions: [
          { id: "fl-q1", prompt: { en: "What does a green signal mean?", es: "¿Qué significa una señal verde?" }, choices: [{ en: "Go", es: "Avanzar" }, { en: "Stop", es: "Parar" }, { en: "Sleep", es: "Dormir" }, { en: "Wait", es: "Esperar" }], answerIndex: 0 },
        ],
      },
      quiz: [
        { id: "fl-qz1", prompt: { en: "You see a yellow road sign. What does it mean?", es: "Ves una señal amarilla. ¿Qué significa?" }, choices: [{ en: "Speed up", es: "Acelerar" }, { en: "Stop immediately", es: "Parar inmediatamente" }, { en: "Get ready — something is about to change", es: "Prepárate — algo está a punto de cambiar" }, { en: "Close your eyes", es: "Cerrar los ojos" }], answerIndex: 2 },
        { id: "fl-qz2", prompt: { en: "What matters most when driving the delivery cart?", es: "¿Qué es lo más importante al conducir el carrito de entregas?" }, choices: [{ en: "Going as fast as possible", es: "Ir lo más rápido posible" }, { en: "Getting there safely", es: "Llegar con seguridad" }, { en: "Crashing into every cone", es: "Chocarse con cada cono" }, { en: "Ignoring the signs", es: "Ignorar las señales" }], answerIndex: 1 },
        { id: "fl-qz3", prompt: { en: "There's a boost pad in a lane with a red X. What should you do?", es: "Hay un impulso en un carril con una X roja. ¿Qué debes hacer?" }, choices: [{ en: "Go for the boost", es: "Ir por el impulso" }, { en: "Avoid that lane — red X means danger", es: "Evitar ese carril — X roja significa peligro" }, { en: "Stop the cart", es: "Parar el carrito" }, { en: "Switch to a random lane", es: "Cambiar a un carril aleatorio" }], answerIndex: 1 },
      ],
    },
    {
      slug: "k2-stem-qualify-tune-race",
      title: "Qualify & Race",
      description: "Test, change one thing, and race to win! 🏁🔧",
      activityId: "qualify-tune-race",
      gameKey: "qualify_tune_race",
      strand: "Capstone",
      story: {
        title: "Story: Race Lab",
        slides: [
          { id: "qtr-s1", text: { en: "Welcome to the engineering garage! Today you'll build, test, and improve your racer. But here's the rule: you can only change ONE thing at a time.", es: "¡Bienvenido al garaje de ingeniería! Hoy construirás, probarás y mejorarás tu corredor. Pero hay una regla: solo puedes cambiar UNA cosa a la vez." }, icon: "🏎️" },
          { id: "qtr-s2", text: { en: "First, do a practice lap. Then look at your results — time, bumps, smoothness. Pick ONE upgrade: better tires, a speed boost, or steadier steering. Then race again!", es: "Primero, haz una vuelta de práctica. Luego mira tus resultados — tiempo, golpes, suavidad. Elige UNA mejora: mejores neumáticos, turbo de velocidad o dirección más estable. ¡Luego corre de nuevo!" }, icon: "🔧" },
          { id: "qtr-s3", text: { en: "Real scientists test one change at a time. That's how you know what actually worked. Ready to qualify, tune, and race?", es: "Los científicos reales prueban un cambio a la vez. Así sabes qué realmente funcionó. ¿Listo para probar, ajustar y competir?" }, icon: "🧪" },
        ],
        questions: [
          { id: "qtr-q1", prompt: { en: "To make a fair test, how many things should you change at a time?", es: "Para hacer una prueba justa, ¿cuántas cosas debes cambiar a la vez?" }, choices: [{ en: "One", es: "Una" }, { en: "All of them", es: "Todas" }, { en: "None", es: "Ninguna" }, { en: "Three", es: "Tres" }], answerIndex: 0 },
        ],
      },
      quiz: [
        { id: "qtr-qz1", prompt: { en: "How many things should you change at a time when tuning?", es: "¿Cuántas cosas debes cambiar a la vez al ajustar?" }, choices: [{ en: "As many as possible", es: "Todas las posibles" }, { en: "Two", es: "Dos" }, { en: "One", es: "Una" }, { en: "None", es: "Ninguna" }], answerIndex: 2 },
        { id: "qtr-qz2", prompt: { en: "Your first lap had 5 bumps. You added Grip Tires and your second lap had 2 bumps. What happened?", es: "Tu primera vuelta tuvo 5 golpes. Agregaste Neumáticos de Agarre y tu segunda vuelta tuvo 2 golpes. ¿Qué pasó?" }, choices: [{ en: "Nothing changed", es: "Nada cambió" }, { en: "Grip Tires helped you bump less", es: "Los neumáticos de agarre te ayudaron a golpear menos" }, { en: "The track got easier", es: "La pista se hizo más fácil" }, { en: "Bumps don't matter", es: "Los golpes no importan" }], answerIndex: 1 },
        { id: "qtr-qz3", prompt: { en: "Why do engineers change only one thing at a time?", es: "¿Por qué los ingenieros cambian solo una cosa a la vez?" }, choices: [{ en: "Because they're slow", es: "Porque son lentos" }, { en: "So they know which change made the difference", es: "Para saber qué cambio hizo la diferencia" }, { en: "Because two changes would break everything", es: "Porque dos cambios romperían todo" }, { en: "They don't — they change everything", es: "No lo hacen — cambian todo" }], answerIndex: 1 },
        { id: "qtr-qz4", prompt: { en: "You picked Speed Boost but bumped into more walls. What does that tell you?", es: "Elegiste Turbo de Velocidad pero chocaste con más paredes. ¿Qué te dice eso?" }, choices: [{ en: "Speed Boost made it harder to control", es: "El Turbo hizo más difícil de controlar" }, { en: "Speed Boost doesn't work", es: "El Turbo no funciona" }, { en: "You should always pick Speed Boost", es: "Siempre debes elegir Turbo" }, { en: "Bumps help you go faster", es: "Los golpes te ayudan a ir más rápido" }], answerIndex: 0 },
      ],
    },
  ];

  for (const s2 of set2Modules) {
    const mod = await prisma.module.upsert({
      where: { slug: s2.slug },
      update: { title: s2.title, description: s2.description, level: "K-2", published: true },
      create: { slug: s2.slug, title: s2.title, description: s2.description, level: "K-2", published: true },
    });

    // Get or create unit — use first unit of this module (not by title, which may have changed)
    let s2Unit = await prisma.unit.findFirst({ where: { moduleId: mod.id }, orderBy: { order: "asc" } });
    if (!s2Unit) {
      s2Unit = await prisma.unit.create({ data: { title: "Unit 1", order: 1, Module: { connect: { id: mod.id } }, teacher: { connect: { id: teacher.id } } } });
    }

    // Get or create lesson — use first lesson of this unit
    let s2Lesson = await prisma.lesson.findFirst({ where: { unitId: s2Unit.id }, orderBy: { order: "asc" } });
    if (!s2Lesson) {
      s2Lesson = await prisma.lesson.create({ data: { title: s2.title, order: 1, Unit: { connect: { id: s2Unit.id } } } });
    }

    // Clean up duplicate lessons (from previous seed runs with different titles)
    const allLessons = await prisma.lesson.findMany({ where: { unitId: s2Unit.id } });
    for (const dup of allLessons) {
      if (dup.id !== s2Lesson.id) {
        await prisma.activity.deleteMany({ where: { lessonId: dup.id } });
        await prisma.lesson.delete({ where: { id: dup.id } }).catch(() => {});
      }
    }

    // Clean up duplicate activities within this lesson (keep only 3: story, game, quiz)
    const existingActs = await prisma.activity.findMany({ where: { lessonId: s2Lesson.id }, orderBy: { order: "asc" } });
    for (const act of existingActs) {
      if (act.order > 3) {
        await prisma.activity.delete({ where: { id: act.id } }).catch(() => {});
      }
    }

    // Activity 1: Story (INFO)
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

    // Activity 2: Game (INTERACT)
    const gameContent = JSON.stringify({ gameKey: s2.gameKey });
    let gameAct = await prisma.activity.findFirst({ where: { lessonId: s2Lesson.id, kind: INTERACT, order: 2 } });
    if (gameAct) {
      await prisma.activity.update({ where: { id: gameAct.id }, data: { id: s2.activityId, title: `Game: ${s2.title}`, content: gameContent } });
    } else {
      await prisma.activity.create({ data: { id: s2.activityId, title: `Game: ${s2.title}`, kind: INTERACT, order: 2, content: gameContent, Lesson: { connect: { id: s2Lesson.id } } } });
    }

    // Activity 3: Quiz (INFO with quiz questions)
    const quizContent = JSON.stringify({
      type: "story_quiz",
      slides: [],
      questions: s2.quiz ?? [],
    });
    let quizAct = await prisma.activity.findFirst({ where: { lessonId: s2Lesson.id, order: 3 } });
    if (quizAct) {
      await prisma.activity.update({ where: { id: quizAct.id }, data: { title: `Quiz: ${s2.title}`, kind: INFO, content: quizContent } });
    } else {
      await prisma.activity.create({ data: { title: `Quiz: ${s2.title}`, kind: INFO, order: 3, content: quizContent, Lesson: { connect: { id: s2Lesson.id } } } });
    }

    console.log("Seeded Set 2 module:", s2.slug, "(story + game + quiz)");
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

  // Build-a-Bot removed from canon — clean up any existing activity
  const buildBot = await prisma.activity.findFirst({
    where: { lessonId: lesson.id, title: "Build a Bot" },
  });
  if (buildBot) {
    await prisma.activity.delete({ where: { id: buildBot.id } }).catch(() => {});
    console.log("Cleaned up removed Build-a-Bot activity.");
  }
  console.log("Seeded activities.");


  // ── Grade 3-5 first playable module: Data Dash: Sort & Discover ──
  const g35DataDashModule = await prisma.module.upsert({
    where: { slug: "g35-data-dash-sort-discover" },
    update: {
      title: "Data Dash: Sort & Discover",
      description: "Classify plant data with multiple attributes, infer rules, and support claims with chart evidence.",
      level: "G3-5",
      published: true,
    },
    create: {
      slug: "g35-data-dash-sort-discover",
      title: "Data Dash: Sort & Discover",
      description: "Classify plant data with multiple attributes, infer rules, and support claims with chart evidence.",
      level: "G3-5",
      published: true,
    },
  });
  console.log("Created module:", g35DataDashModule.slug);

  let g35DataDashUnit = await prisma.unit.findFirst({
    where: { moduleId: g35DataDashModule.id, title: "Unit 1: Greenhouse Data Lab" },
  });
  if (!g35DataDashUnit) {
    g35DataDashUnit = await prisma.unit.create({
      data: {
        title: "Unit 1: Greenhouse Data Lab",
        order: 1,
        Module: { connect: { id: g35DataDashModule.id } },
        teacher: { connect: { id: teacher.id } },
      },
    });
  }

  let g35DataDashLesson = await prisma.lesson.findFirst({
    where: { unitId: g35DataDashUnit.id, title: "Lesson 1: Sort, Infer, Explain" },
  });
  if (!g35DataDashLesson) {
    g35DataDashLesson = await prisma.lesson.create({
      data: {
        title: "Lesson 1: Sort, Infer, Explain",
        order: 1,
        Unit: { connect: { id: g35DataDashUnit.id } },
      },
    });
  }

  const dataDashStoryContent = JSON.stringify({
    type: "story_quiz",
    slides: [
      {
        id: "dd-s1",
        text: {
          en: "Mission Briefing: Greenhouse Data Drop. A science team sent plant cards from three beds. Your job is to organize the data and report what the patterns show.",
          es: "Informe de misión: Entrega de datos del invernadero. Un equipo de ciencias envió tarjetas de plantas de tres camas. Tu trabajo es organizar los datos e informar qué patrones muestran.",
        },
        icon: "🛰️",
      },
      {
        id: "dd-s2",
        text: {
          en: "How scientists classify: They group by shared attributes like sunlight need, water need, leaf type, seed type, or growth speed. One clear rule keeps the data fair.",
          es: "Cómo clasifican los científicos: Agrupan por atributos compartidos como necesidad de luz solar, necesidad de agua, tipo de hoja, tipo de semilla o velocidad de crecimiento. Una regla clara mantiene los datos justos.",
        },
        icon: "🧪",
      },
      {
        id: "dd-s3",
        text: {
          en: "Evidence first: A good claim uses observations and counts, not guesses. Chart bars and totals are evidence you can point to.",
          es: "Evidencia primero: Una buena afirmación usa observaciones y conteos, no suposiciones. Las barras y los totales del gráfico son evidencia que puedes señalar.",
        },
        icon: "📌",
      },
      {
        id: "dd-s4",
        text: {
          en: "From sort to pattern: Once cards are sorted, patterns become visible. Then you can explain what is common, what is different, and what to test next.",
          es: "Del orden al patrón: Una vez ordenadas las tarjetas, los patrones se vuelven visibles. Luego puedes explicar qué es común, qué es diferente y qué probar después.",
        },
        icon: "📊",
      },
    ],
    questions: [
      {
        id: "dd-q1",
        prompt: { en: "Which choice is a classification rule (not just one observation)?", es: "¿Qué opción es una regla de clasificación (no solo una observación)?" },
        choices: [
          { en: "Group plants by seed type", es: "Agrupar plantas por tipo de semilla" },
          { en: "This fern needs high water", es: "Este helecho necesita mucha agua" },
          { en: "Plant bed A has three plants", es: "La cama de plantas A tiene tres plantas" }
        ],
        answerIndex: 0,
        hint: { en: "A rule can be used on every card.", es: "Una regla puede usarse en cada tarjeta." }
      },
      {
        id: "dd-q2",
        prompt: { en: "If two cards both have cone seeds, what is true?", es: "Si dos tarjetas tienen semillas en cono, ¿qué es verdadero?" },
        choices: [
          { en: "They match on seed type", es: "Coinciden en tipo de semilla" },
          { en: "They must be in the same plant bed", es: "Deben estar en la misma cama de plantas" },
          { en: "They must need the same water", es: "Deben necesitar la misma agua" }
        ],
        answerIndex: 0,
        hint: { en: "Look only at the named attribute.", es: "Mira solo el atributo nombrado." }
      },
      {
        id: "dd-q3",
        prompt: { en: "A chart shows full sunlight = 5, shade = 2, partial = 1. Which claim is best supported?", es: "Un gráfico muestra luz solar completa = 5, sombra = 2, parcial = 1. ¿Qué afirmación está mejor respaldada?" },
        choices: [
          { en: "Most plants need full sunlight", es: "La mayoría de las plantas necesitan luz solar completa" },
          { en: "All plants need shade", es: "Todas las plantas necesitan sombra" },
          { en: "No plants need partial sunlight", es: "Ninguna planta necesita luz solar parcial" }
        ],
        answerIndex: 0,
        hint: { en: "Choose the claim that matches the largest count.", es: "Elige la afirmación que coincide con el mayor conteo." }
      },
      {
        id: "dd-q4",
        prompt: { en: "What is the strongest evidence for your claim?", es: "¿Cuál es la evidencia más fuerte para tu afirmación?" },
        choices: [
          { en: "The full-sun bar is tallest", es: "La barra de sol completo es la más alta" },
          { en: "I like full-sun plants", es: "Me gustan las plantas de sol completo" },
          { en: "My friend chose that answer", es: "Mi amigo eligió esa respuesta" }
        ],
        answerIndex: 0,
        hint: { en: "Evidence comes from measured data.", es: "La evidencia proviene de datos medidos." }
      },
      {
        id: "dd-q5",
        prompt: { en: "Why is multi-attribute sorting useful?", es: "¿Por qué es útil clasificar por múltiples atributos?" },
        choices: [
          { en: "It helps find deeper patterns and better explanations", es: "Ayuda a encontrar patrones más profundos y mejores explicaciones" },
          { en: "It makes data random", es: "Hace los datos aleatorios" },
          { en: "It removes the need for evidence", es: "Elimina la necesidad de evidencia" }
        ],
        answerIndex: 0,
        hint: { en: "More than one attribute can reveal hidden structure.", es: "Más de un atributo puede revelar estructura oculta." }
      }
    ],
  });

  const g35StoryActivity = await prisma.activity.findFirst({
    where: { lessonId: g35DataDashLesson.id, kind: INFO, order: 1 },
  });
  if (g35StoryActivity) {
    await prisma.activity.update({
      where: { id: g35StoryActivity.id },
      data: {
        title: "Mission Briefing: Greenhouse Data Drop",
        content: dataDashStoryContent,
      },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Mission Briefing: Greenhouse Data Drop",
        kind: INFO,
        order: 1,
        content: dataDashStoryContent,
        Lesson: { connect: { id: g35DataDashLesson.id } },
      },
    });
  }

  const dataDashGameContent = JSON.stringify({
    type: "game",
    activityId: "data-dash-sort-discover",
    gameKey: "data_dash_sort_discover",
    title: "Data Dash: Sort & Discover",
    rounds: 3,
  });

  const g35GameActivity = await prisma.activity.findFirst({
    where: { lessonId: g35DataDashLesson.id, kind: INTERACT, order: 2 },
  });
  if (g35GameActivity) {
    await prisma.activity.update({
      where: { id: g35GameActivity.id },
      data: {
        title: "Data Dash: Sort & Discover",
        content: dataDashGameContent,
      },
    });
  } else {
    await prisma.activity.create({
      data: {
        title: "Data Dash: Sort & Discover",
        kind: INTERACT,
        order: 2,
        content: dataDashGameContent,
        Lesson: { connect: { id: g35DataDashLesson.id } },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Module Families & Variants (grade-banded content system)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("Seeding module families and variants...");
  try {

  const familyDefs = [
    {
      key: "quantum_quest",
      title: "Quantum Foundations",
      iconEmoji: "⚛️",
      k2: { title: "Quantum Quest", subtitle: "Explore quantum puzzles in a space math adventure!", moduleSlug: "k2-stem-quantum-quest" },
      g3_5: {
        title: "Quantum Mission: Pattern Lab",
        subtitle: "Model quantum patterns and test outcomes!",
        contentConfig: {
          theme: "lab",
          reading: { wordCount: 270, topic: "probability, patterns, observation, and evidence", vocabulary: ["quantum", "pattern", "probability", "outcome", "evidence"] },
          questions: { count: 5, types: ["pattern-identification", "prediction", "evidence-choice"] },
          game: { rounds: 3, phases: ["observe", "predict", "test"], mechanics: ["state-toggle", "outcome-tracker", "pattern-matcher", "hint-ladder"] },
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
  } catch (e) {
    console.warn("Module families seed skipped (tables may not exist yet):", e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pathways — secondary-age (14-17) program layer
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("Seeding Pathways data...");

  try {
  // Facilitator
  const facilitatorHash = await bcrypt.hash("pathway123", 10);
  let facilitator = await prisma.user.findUnique({ where: { email: "facilitator@test.com" } });
  if (!facilitator) {
    facilitator = await prisma.user.create({
      data: {
        name: "Coach Davis",
        email: "facilitator@test.com",
        password: facilitatorHash,
        role: "teacher",
        userType: "pathways",
      },
    });
  } else {
    facilitator = await prisma.user.update({
      where: { id: facilitator.id },
      data: { password: facilitatorHash, userType: "pathways" },
    });
  }
  console.log("Seeded facilitator:", facilitator.email);

  // Marcus — Launch band, partial progress
  const marcusHash = await bcrypt.hash("marcus123", 10);
  let marcus = await prisma.user.findUnique({ where: { email: "marcus@test.com" } });
  if (!marcus) {
    marcus = await prisma.user.create({
      data: {
        name: "Marcus",
        email: "marcus@test.com",
        password: marcusHash,
        role: "student",
        userType: "pathways",
        ageBand: "launch",
        birthYear: 2009,
      },
    });
  } else {
    marcus = await prisma.user.update({
      where: { id: marcus.id },
      data: { password: marcusHash, userType: "pathways", ageBand: "launch", birthYear: 2009 },
    });
  }
  console.log("Seeded Marcus:", marcus.email);

  // Aisha — Explorer band, fresh
  const aishaHash = await bcrypt.hash("aisha123", 10);
  let aisha = await prisma.user.findUnique({ where: { email: "aisha@test.com" } });
  if (!aisha) {
    aisha = await prisma.user.create({
      data: {
        name: "Aisha",
        email: "aisha@test.com",
        password: aishaHash,
        role: "student",
        userType: "pathways",
        ageBand: "explorer",
        birthYear: 2011,
      },
    });
  } else {
    aisha = await prisma.user.update({
      where: { id: aisha.id },
      data: { password: aishaHash, userType: "pathways", ageBand: "explorer", birthYear: 2011 },
    });
  }
  console.log("Seeded Aisha:", aisha.email);

  // Cohort
  const cohort = await prisma.pathwayCohort.upsert({
    where: { joinCode: "ETO2026" },
    create: {
      name: "ETO Spring 2026 — Cyber Cohort",
      band: "launch",
      sitePartner: "Escape The Odds",
      facilitatorId: facilitator.id,
      trackIds: ["cyber-launch"],
      joinCode: "ETO2026",
    },
    update: { facilitatorId: facilitator.id },
  });

  // Enroll Marcus and Aisha
  for (const u of [marcus, aisha]) {
    await prisma.pathwayEnrollment.upsert({
      where: { userId_cohortId: { userId: u.id, cohortId: cohort.id } },
      create: { userId: u.id, cohortId: cohort.id },
      update: {},
    });
  }

  // Marcus's Cyber Launch milestones (partial progress)
  const marcusMilestones = [
    { moduleSlug: "cyber-foundations", status: "completed", score: 85, daysAgo: 7 },
    { moduleSlug: "digital-safety-sim", status: "completed", score: 90, daysAgo: 5 },
    { moduleSlug: "network-basics", status: "completed", score: 78, daysAgo: 3 },
    { moduleSlug: "threat-detective", status: "in_progress", score: null, daysAgo: 1 },
  ];

  for (const m of marcusMilestones) {
    await prisma.pathwayMilestone.upsert({
      where: { userId_trackSlug_moduleSlug: { userId: marcus.id, trackSlug: "cyber-launch", moduleSlug: m.moduleSlug } },
      create: {
        userId: marcus.id,
        trackSlug: "cyber-launch",
        moduleSlug: m.moduleSlug,
        status: m.status,
        score: m.score,
        completedAt: m.status === "completed" ? new Date(Date.now() - m.daysAgo * 86400000) : null,
      },
      update: { status: m.status, score: m.score },
    });
  }
  console.log("Seeded Pathways cohort, enrollments, and milestones.");
  } catch (e) {
    console.warn("Pathways seed skipped (tables may not exist yet):", e.message);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // A/B Testing — seed one example experiment so the dashboard isn't empty
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("Seeding A/B experiments...");
  try {
    const creator =
      (await prisma.user.findUnique({ where: { email: "facilitator@test.com" } })) ||
      (await prisma.user.findFirst({ where: { role: "teacher" } }));

    if (creator) {
      await prisma.experiment.upsert({
        where: { slug: "game-difficulty-default" },
        create: {
          slug: "game-difficulty-default",
          name: "Default Game Difficulty: Easy vs Medium",
          hypothesis:
            "Defaulting to Easy difficulty will increase game completion rate by 20% for K-2 students",
          metric: "game_completion_rate",
          status: "draft",
          trafficSplit: 50,
          createdBy: creator.id,
        },
        update: {},
      });
      console.log("Seeded example experiment.");
    } else {
      console.warn("No teacher user found — skipping experiment seed.");
    }
  } catch (e) {
    console.warn("Experiment seed skipped (tables may not exist yet):", e.message);
  }
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
