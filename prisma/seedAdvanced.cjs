/** Curriculum-only helper. Caller owns the seed's target gate and teacher identity. */
async function seedAdvanced(prisma, teacherId) {
  const module = await prisma.module.upsert({
    where: { slug: "advanced-biotech-biotrail" },
    update: {
      title: "BioTrail: Adaptation Islands",
      description:
        "Design nature-inspired tools, explore habitats, and improve your invention.",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "advanced-biotech-biotrail",
      title: "BioTrail: Adaptation Islands",
      description:
        "Design nature-inspired tools, explore habitats, and improve your invention.",
      level: "K-2",
      published: true,
    },
  });
  const unit = await prisma.unit.upsert({
    where: { id: "biotrail-expedition" },
    update: { moduleId: module.id, title: "The Living Archipelago", order: 1 },
    create: {
      id: "biotrail-expedition",
      moduleId: module.id,
      teacherId,
      title: "The Living Archipelago",
      order: 1,
    },
  });
  const lesson = await prisma.lesson.upsert({
    where: { id: "biotrail-field-lab" },
    update: {
      unitId: unit.id,
      title: "Observe, design, test, improve",
      order: 1,
    },
    create: {
      id: "biotrail-field-lab",
      unitId: unit.id,
      title: "Observe, design, test, improve",
      order: 1,
    },
  });
  await prisma.activity.upsert({
    where: { id: "biotrail" },
    update: {
      lessonId: lesson.id,
      title: "BioTrail: Adaptation Islands",
      kind: "INTERACT",
      order: 1,
      content: JSON.stringify({ gameKey: "biotrail" }),
    },
    create: {
      id: "biotrail",
      lessonId: lesson.id,
      title: "BioTrail: Adaptation Islands",
      kind: "INTERACT",
      order: 1,
      content: JSON.stringify({ gameKey: "biotrail" }),
    },
  });
  const aiModule = await prisma.module.upsert({
    where: { slug: "advanced-ai-sparbots" },
    update: {
      title: "SparBots: Training Tower",
      description:
        "Teach a bot with examples, test its choices, and improve its playbook.",
      level: "K-2",
      published: true,
    },
    create: {
      slug: "advanced-ai-sparbots",
      title: "SparBots: Training Tower",
      description:
        "Teach a bot with examples, test its choices, and improve its playbook.",
      level: "K-2",
      published: true,
    },
  });
  const aiUnit = await prisma.unit.upsert({
    where: { id: "sparbots-coaching" },
    update: { moduleId: aiModule.id, title: "My First AI Playbook", order: 1 },
    create: {
      id: "sparbots-coaching",
      moduleId: aiModule.id,
      teacherId,
      title: "My First AI Playbook",
      order: 1,
    },
  });
  const aiLesson = await prisma.lesson.upsert({
    where: { id: "sparbots-training-tower" },
    update: {
      unitId: aiUnit.id,
      title: "Show, train, test, improve",
      order: 1,
    },
    create: {
      id: "sparbots-training-tower",
      unitId: aiUnit.id,
      title: "Show, train, test, improve",
      order: 1,
    },
  });
  await prisma.activity.upsert({
    where: { id: "sparbots" },
    update: {
      lessonId: aiLesson.id,
      title: "SparBots: Training Tower",
      kind: "INTERACT",
      order: 1,
      content: JSON.stringify({ gameKey: "sparbots" }),
    },
    create: {
      id: "sparbots",
      lessonId: aiLesson.id,
      title: "SparBots: Training Tower",
      kind: "INTERACT",
      order: 1,
      content: JSON.stringify({ gameKey: "sparbots" }),
    },
  });
}
module.exports = { seedAdvanced };
