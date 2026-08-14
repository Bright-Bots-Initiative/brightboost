/**
 * E2E seed / reset — overview.md §6.1 (A4-04).
 * Refuse production-shaped DATABASE_URL before any write (G-002).
 *
 * Usage:
 *   node scripts/e2e-seed.mjs
 *   node scripts/e2e-seed.mjs --reset
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import { describeDbUrl, isDesignatedTestDbUrl } from "./lib/db-target.mjs";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const fixturePath = path.join(
  root,
  "cypress",
  "fixtures",
  "seed-contract.json",
);

const STUDENT_NAMES = [
  "E2E Student One",
  "E2E Student Two",
  "E2E Student Three",
];
const MODULE_SLUG = "e2e-quiz-module";
const COURSE_NAME = "E2E Class";

export function isProductionShapedDatabaseUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    return true;
  }
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return false;
  }
  if (
    host.includes("prod") ||
    host.includes("production") ||
    host.endsWith(".supabase.co") ||
    host.includes("railway.app") ||
    host.includes("amazonaws.com")
  ) {
    return true;
  }
  // Any non-loopback host is treated as production-shaped for E2E writes.
  return true;
}

export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || String(url).trim() === "") {
    console.error("[e2e-seed] DATABASE_URL is not set.");
    process.exit(2);
  }
  const designated = isDesignatedTestDbUrl(url);
  if (!designated.ok) {
    const code = designated.code ?? 1;
    const info = describeDbUrl(url);
    if (info) {
      console.error(
        `[e2e-seed] target host=${info.host} database=${info.database}`,
      );
    }
    if (code === 2) {
      console.error(
        "[e2e-seed] refusing: DATABASE_URL is not a parseable URL (could not check). No writes performed.",
      );
    } else {
      console.error(
        `[e2e-seed] refusing: database "${designated.database}" is not a designated test database (name must contain a test/e2e token, e.g. brightboost_test). No writes performed.`,
      );
    }
    process.exit(code);
  }
  if (isProductionShapedDatabaseUrl(url)) {
    const info = describeDbUrl(url);
    if (info) {
      console.error(
        `[e2e-seed] target host=${info.host} database=${info.database}`,
      );
    }
    console.error(
      "[e2e-seed] Refusing to run against production-shaped DATABASE_URL (G-002). No writes performed.",
    );
    process.exit(1);
  }
  return url;
}

function loadContract() {
  const raw = readFileSync(fixturePath, "utf8");
  return JSON.parse(raw);
}

async function deleteCoursesByIds(prisma, courseIds) {
  if (courseIds.length === 0) return;
  // Children that RESTRICT (or lack onDelete) must go before Course.
  await prisma.assignment.deleteMany({
    where: { courseId: { in: courseIds } },
  });
  await prisma.pulseResponse.deleteMany({
    where: { courseId: { in: courseIds } },
  });
  const bench = await prisma.benchmarkAssignment.findMany({
    where: { courseId: { in: courseIds } },
    select: { id: true },
  });
  if (bench.length > 0) {
    const benchIds = bench.map((b) => b.id);
    await prisma.benchmarkAttempt.deleteMany({
      where: { assignmentId: { in: benchIds } },
    });
    await prisma.benchmarkAssignment.deleteMany({
      where: { id: { in: benchIds } },
    });
  }
  await prisma.classModuleAssignment.deleteMany({
    where: { courseId: { in: courseIds } },
  });
  await prisma.creation.deleteMany({
    where: { courseId: { in: courseIds } },
  });
  await prisma.enrollment.deleteMany({
    where: { courseId: { in: courseIds } },
  });
  await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
}

export function assertE2ETeacherEmail() {
  const email = process.env.E2E_TEACHER_EMAIL;
  if (!email) {
    console.error("[e2e-seed] E2E_TEACHER_EMAIL required.");
    process.exit(2);
  }
  if (!String(email).endsWith("@e2e.invalid")) {
    console.error(
      "[e2e-seed] E2E_TEACHER_EMAIL must use the non-routable @e2e.invalid domain (G-003). No writes performed.",
    );
    process.exit(1);
  }
  return email;
}

export async function resetE2E(prisma) {
  const teacherEmail = assertE2ETeacherEmail();

  // Clear E2E001 courses owned by @e2e.invalid teachers only.
  // Unscoped join-code deletes would destroy a real class issued E2E001.
  const byJoin = await prisma.course.findMany({
    where: { joinCode: "E2E001" },
    select: { id: true, teacher: { select: { email: true } } },
  });
  const safeIds = [];
  for (const c of byJoin) {
    if (c.teacher?.email?.endsWith("@e2e.invalid")) {
      safeIds.push(c.id);
    } else {
      console.error(
        `[e2e-seed] SKIPPING E2E001 course ${c.id} owned by ${c.teacher?.email ?? "(unknown)"} — not @e2e.invalid. No delete performed for this course.`,
      );
    }
  }
  await deleteCoursesByIds(prisma, safeIds);

  const teacher = await prisma.user.findUnique({
    where: { email: teacherEmail },
  });
  if (teacher) {
    const courses = await prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    });
    await deleteCoursesByIds(
      prisma,
      courses.map((c) => c.id),
    );
  }

  // Module tree before teacher units (Lesson.unitId RESTRICT).
  const mod = await prisma.module.findUnique({ where: { slug: MODULE_SLUG } });
  if (mod) {
    const units = await prisma.unit.findMany({ where: { moduleId: mod.id } });
    for (const u of units) {
      const lessons = await prisma.lesson.findMany({ where: { unitId: u.id } });
      for (const l of lessons) {
        await prisma.activity.deleteMany({ where: { lessonId: l.id } });
      }
      await prisma.lesson.deleteMany({ where: { unitId: u.id } });
      await prisma.activity.deleteMany({ where: { unitId: u.id } });
    }
    await prisma.unit.deleteMany({ where: { moduleId: mod.id } });
    await prisma.module.delete({ where: { id: mod.id } });
  }

  if (teacher) {
    await prisma.unit.deleteMany({ where: { teacherId: teacher.id } });
    await prisma.user.delete({ where: { id: teacher.id } });
  }

  const students = await prisma.user.findMany({
    where: { name: { in: STUDENT_NAMES }, role: "student" },
  });
  for (const s of students) {
    await prisma.enrollment.deleteMany({ where: { studentId: s.id } });
    await prisma.progress.deleteMany({ where: { studentId: s.id } });
    await prisma.user.delete({ where: { id: s.id } });
  }
}

async function seed(prisma) {
  const contract = loadContract();
  const teacherEmail = assertE2ETeacherEmail();
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD;
  if (!teacherPassword) {
    console.error(
      "[e2e-seed] E2E_TEACHER_EMAIL and E2E_TEACHER_PASSWORD are required.",
    );
    process.exit(2);
  }

  const passwordHash = await bcrypt.hash(teacherPassword, 10);
  const teacher = await prisma.user.create({
    data: {
      name: contract.teacher.name,
      email: teacherEmail,
      password: passwordHash,
      role: "teacher",
    },
  });

  const course = await prisma.course.create({
    data: {
      name: COURSE_NAME,
      teacherId: teacher.id,
      joinCode: "E2E001",
      gradeBand: "k2",
    },
  });

  const students = [];
  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    const student = await prisma.user.create({
      data: {
        name: STUDENT_NAMES[i],
        email: `student${i + 1}@e2e.invalid`,
        role: "student",
        loginIcon: ["🐱", "🐶", "🦊"][i],
      },
    });
    await prisma.enrollment.create({
      data: { studentId: student.id, courseId: course.id },
    });
    students.push(student);
  }

  const mod = await prisma.module.create({
    data: {
      slug: MODULE_SLUG,
      title: "E2E Quiz Module",
      description: "Deterministic E2E quiz module",
      level: "K-2",
      published: true,
    },
  });

  const unit = await prisma.unit.create({
    data: {
      moduleId: mod.id,
      title: "E2E Unit",
      order: 1,
      teacherId: teacher.id,
    },
  });

  const lesson = await prisma.lesson.create({
    data: {
      unitId: unit.id,
      title: "E2E Lesson",
      order: 1,
    },
  });

  const questions = contract.activity.questions;
  if (!Array.isArray(questions) || questions.length !== 3) {
    console.error(
      "[e2e-seed] seed-contract.json must define exactly 3 questions.",
    );
    process.exit(2);
  }

  const content = JSON.stringify({
    type: "story_quiz",
    slides: [],
    questions,
  });

  const activity = await prisma.activity.create({
    data: {
      lessonId: lesson.id,
      unitId: unit.id,
      title: contract.activity.title,
      kind: "INFO",
      order: 1,
      content,
    },
  });

  const ids = {
    teacherId: teacher.id,
    courseId: course.id,
    studentIds: students.map((s) => s.id),
    moduleSlug: MODULE_SLUG,
    lessonId: lesson.id,
    activityId: activity.id,
  };

  console.log("[e2e-seed] Seed complete.");
  console.log(`  teacherId=${ids.teacherId}`);
  console.log(`  courseId=${ids.courseId}`);
  console.log(`  studentIds=${ids.studentIds.join(",")}`);
  console.log(`  lessonId=${ids.lessonId}`);
  console.log(`  activityId=${ids.activityId}`);
  console.log("  Export for Cypress:");
  console.log(`    CYPRESS_STUDENT_ID=${ids.studentIds[0]}`);
  console.log(`    CYPRESS_LESSON_ID=${ids.lessonId}`);
}

async function main() {
  requireDatabaseUrl();
  const prisma = new PrismaClient();
  const doReset = process.argv.includes("--reset");
  try {
    if (doReset) {
      console.log("[e2e-seed] Resetting E2E records…");
      await resetE2E(prisma);
    }
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[e2e-seed] Fatal:", err);
  process.exit(1);
});
