import { PrismaClient, ActivityKind, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type ActivitySeed = {
  index: number;
  kind: ActivityKind;
  title: string;
  promptEn: string;
  promptEs: string;
  xp?: number;
  data?: Prisma.InputJsonValue;
};

type LessonSeed = {
  index: number;
  title: string;
  objective: string;
  minutes?: number;
  activities: ActivitySeed[];
  assessmentItems?: Prisma.InputJsonValue;
  maxScore?: number;
};

type UnitSeed = {
  index: number;
  title: string;
  objective: string;
  lessons: LessonSeed[];
};

type ModuleSeed = {
  slug: string;
  title: string;
  subtitle?: string;
  gradeMin: number;
  gradeMax: number;
  totalXp: number;
  estMinutes: number;
  languageTags: string[];
  units: UnitSeed[];
  badges: {
    slug: string;
    name: string;
    criteria: string;
    iconKey: string;
    xpBonus?: number;
  }[];
};

const stem1: ModuleSeed = {
  slug: "stem-1",
  title: "STEM-1",
  subtitle: "Foundations of Thinking Like a Scientist",
  gradeMin: 4,
  gradeMax: 6,
  totalXp: 300,
  estMinutes: 180,
  languageTags: ["en", "es"],
  units: [
    {
      index: 1,
      title: "Observe & Measure",
      objective: "Build observation skills and measure accurately.",
      lessons: [
        {
          index: 1,
          title: "What Makes a Good Observation?",
          objective: "Distinguish observations from inferences.",
          activities: [
            {
              index: 1,
              kind: ActivityKind.INFO,
              title: "Observations vs. Inferences",
              promptEn: "Read examples of observations and inferences.",
              promptEs: "Lee ejemplos de observaciones e inferencias.",
              xp: 30,
            },
            {
              index: 2,
              kind: ActivityKind.INTERACT,
              title: "Measure It!",
              promptEn: "Use the virtual ruler to measure objects.",
              promptEs: "Usa la regla virtual para medir objetos.",
              xp: 50,
              data: { tool: "ruler", unit: "cm" },
            },
            {
              index: 3,
              kind: ActivityKind.REFLECT,
              title: "Reflection",
              promptEn: "Write about why precise measurement matters.",
              promptEs: "Escribe por qué importa la medición precisa.",
              xp: 20,
            },
          ],
        },
        {
          index: 2,
          title: "Precision and Accuracy",
          objective: "Compare precision and accuracy in measurements.",
          activities: [
            {
              index: 1,
              kind: ActivityKind.INFO,
              title: "Targets and Darts",
              promptEn: "Learn precision vs accuracy with diagrams.",
              promptEs: "Aprende precisión vs. exactitud con diagramas.",
              xp: 30,
            },
            {
              index: 2,
              kind: ActivityKind.INTERACT,
              title: "Reading Scales",
              promptEn: "Estimate values between tick marks.",
              promptEs: "Estima valores entre marcas.",
              xp: 50,
              data: { tool: "scale", difficulty: "medium" },
            },
          ],
          assessmentItems: {
            type: "quiz",
            questions: [
              {
                id: "q1",
                prompt: "Define precision.",
                choices: ["A", "B", "C"],
                answer: 1,
              },
              {
                id: "q2",
                prompt: "Define accuracy.",
                choices: ["A", "B", "C"],
                answer: 2,
              },
            ],
          },
          maxScore: 100,
        },
      ],
    },
    {
      index: 2,
      title: "Cause & Effect",
      objective: "Understand causal relationships in experiments.",
      lessons: [
        {
          index: 1,
          title: "Variables",
          objective: "Identify independent and dependent variables.",
          activities: [
            {
              index: 1,
              kind: ActivityKind.INFO,
              title: "Types of Variables",
              promptEn: "Independent vs dependent vs controlled.",
              promptEs: "Independiente vs dependiente vs controladas.",
              xp: 30,
            },
            {
              index: 2,
              kind: ActivityKind.INTERACT,
              title: "Match the Variable",
              promptEn: "Match each example to the variable type.",
              promptEs: "Empareja cada ejemplo con el tipo de variable.",
              xp: 50,
              data: { tool: "matching" },
            },
            {
              index: 3,
              kind: ActivityKind.REFLECT,
              title: "Plan a Test",
              promptEn: "Describe how you would test a simple claim.",
              promptEs: "Describe cómo probarías una afirmación simple.",
              xp: 20,
            },
          ],
        },
        {
          index: 2,
          title: "Fair Tests",
          objective: "Plan experiments with controlled variables.",
          activities: [
            {
              index: 1,
              kind: ActivityKind.INFO,
              title: "Control the Controls",
              promptEn: "What makes a fair test?",
              promptEs: "¿Qué hace una prueba justa?",
              xp: 30,
            },
            {
              index: 2,
              kind: ActivityKind.INTERACT,
              title: "Fix the Experiment",
              promptEn: "Identify and fix flawed setups.",
              promptEs: "Identifica y arregla montajes defectuosos.",
              xp: 50,
              data: { tool: "spot-the-error" },
            },
          ],
        },
      ],
    },
    {
      index: 3,
      title: "Data & Decisions",
      objective: "Use data to make and defend decisions.",
      lessons: [
        {
          index: 1,
          title: "Reading Graphs",
          objective: "Interpret bar and line graphs.",
          activities: [
            {
              index: 1,
              kind: ActivityKind.INFO,
              title: "Graph Basics",
              promptEn: "Axes, labels, and trends.",
              promptEs: "Ejes, etiquetas y tendencias.",
              xp: 30,
            },
            {
              index: 2,
              kind: ActivityKind.INTERACT,
              title: "Trends Explorer",
              promptEn: "Drag points to see trend changes.",
              promptEs: "Arrastra puntos para ver cambios de tendencia.",
              xp: 50,
              data: { tool: "graph", mode: "line" },
            },
            {
              index: 3,
              kind: ActivityKind.REFLECT,
              title: "Make a Claim",
              promptEn: "Use data to support a decision.",
              promptEs: "Usa datos para apoyar una decisión.",
              xp: 20,
            },
          ],
          assessmentItems: {
            type: "quiz",
            questions: [
              {
                id: "q1",
                prompt: "Identify the trend.",
                choices: ["Up", "Down", "Flat"],
                answer: 0,
              },
              {
                id: "q2",
                prompt: "Best graph for categories?",
                choices: ["Bar", "Line", "Pie"],
                answer: 0,
              },
            ],
          },
          maxScore: 100,
        },
      ],
    },
  ],
  badges: [
    {
      slug: "observer",
      name: "Observer",
      criteria: "Complete Unit 1 activities",
      iconKey: "badge-observer",
      xpBonus: 25,
    },
    {
      slug: "tester",
      name: "Tester",
      criteria: "Complete an assessment",
      iconKey: "badge-tester",
      xpBonus: 25,
    },
    {
      slug: "data-sleuth",
      name: "Data Sleuth",
      criteria: "Analyze data to make decisions",
      iconKey: "badge-data",
      xpBonus: 25,
    },
  ],
};

async function upsertModule(m: ModuleSeed) {
  const module = await prisma.module.upsert({
    where: { slug: m.slug },
    create: {
      slug: m.slug,
      title: m.title,
      subtitle: m.subtitle,
      gradeMin: m.gradeMin,
      gradeMax: m.gradeMax,
      totalXp: m.totalXp,
      estMinutes: m.estMinutes,
      languageTags: m.languageTags,
      isActive: true,
    },
    update: {
      title: m.title,
      subtitle: m.subtitle,
      gradeMin: m.gradeMin,
      gradeMax: m.gradeMax,
      totalXp: m.totalXp,
      estMinutes: m.estMinutes,
      languageTags: m.languageTags,
      isActive: true,
    },
  });
  return module;
}

async function upsertUnit(moduleId: string, u: UnitSeed) {
  const unit = await prisma.unit.upsert({
    where: { moduleId_index: { moduleId, index: u.index } },
    create: {
      moduleId,
      index: u.index,
      title: u.title,
      objective: u.objective,
    },
    update: {
      title: u.title,
      objective: u.objective,
    },
  });
  return unit;
}

async function upsertLesson(unitId: string, l: LessonSeed) {
  const lesson = await prisma.lesson.upsert({
    where: { unitId_index: { unitId, index: l.index } },
    create: {
      unitId,
      index: l.index,
      title: l.title,
      objective: l.objective,
      minutes: l.minutes ?? 10,
    },
    update: {
      title: l.title,
      objective: l.objective,
      minutes: l.minutes ?? 10,
    },
  });
  return lesson;
}

async function upsertActivity(lessonId: string, a: ActivitySeed) {
  const activity = await prisma.activity.upsert({
    where: { lessonId_index: { lessonId, index: a.index } },
    create: {
      lessonId,
      index: a.index,
      kind: a.kind,
      title: a.title,
      promptEn: a.promptEn,
      promptEs: a.promptEs,
      xp: a.xp ?? 50,
      data: a.data,
    },
    update: {
      kind: a.kind,
      title: a.title,
      promptEn: a.promptEn,
      promptEs: a.promptEs,
      xp: a.xp ?? 50,
      data: a.data,
    },
  });
  return activity;
}

async function upsertAssessment(
  lessonId: string,
  items: Prisma.InputJsonValue,
  maxScore = 100,
) {
  const assessment = await prisma.assessment.upsert({
    where: { lessonId },
    create: {
      lessonId,
      items,
      maxScore,
    },
    update: {
      items,
      maxScore,
    },
  });
  return assessment;
}

async function upsertBadge(moduleId: string, b: ModuleSeed["badges"][number]) {
  const badge = await prisma.badge.upsert({
    where: { slug: b.slug },
    create: {
      moduleId,
      slug: b.slug,
      name: b.name,
      criteria: b.criteria,
      iconKey: b.iconKey,
      xpBonus: b.xpBonus ?? 0,
    },
    update: {
      moduleId,
      name: b.name,
      criteria: b.criteria,
      iconKey: b.iconKey,
      xpBonus: b.xpBonus ?? 0,
    },
  });
  return badge;
}

async function seedModule(m: ModuleSeed) {
  const mod = await upsertModule(m);

  for (const unitSeed of m.units) {
    const unit = await upsertUnit(mod.id, unitSeed);

    for (const lessonSeed of unitSeed.lessons) {
      const lesson = await upsertLesson(unit.id, lessonSeed);

      for (const activitySeed of lessonSeed.activities) {
        await upsertActivity(lesson.id, activitySeed);
      }

      if (lessonSeed.assessmentItems) {
        await upsertAssessment(
          lesson.id,
          lessonSeed.assessmentItems,
          lessonSeed.maxScore ?? 100,
        );
      }
    }
  }

  for (const b of m.badges) {
    await upsertBadge(mod.id, b);
  }
}

async function main() {
  await seedModule(stem1);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
