/** Seed only the Great Work curriculum, preserving an existing unit's teacher. */
const studio = {
  slug: "k2-stem-great-work",
  activityId: "great-work",
  unitId: "great-work-workshop",
  lessonId: "great-work-studio",
};

async function seedGreatWork(prisma, teacherId) {
  await prisma.$transaction(async (tx) => {
    const details = {
      title: "The Great Work",
      description: "Build a machine, change one move, and save what you made.",
      level: "K-2",
      published: true,
    };
    const module = await tx.module.upsert({
      where: { slug: studio.slug },
      create: { ...details, slug: studio.slug },
      update: details,
    });
    const unit = {
      moduleId: module.id,
      title: "The Machine Workshop",
      order: 1,
    };
    await tx.unit.upsert({
      where: { id: studio.unitId },
      create: { ...unit, id: studio.unitId, teacherId },
      update: unit,
    });
    const lesson = {
      unitId: studio.unitId,
      title: "My First Machine",
      order: 1,
    };
    await tx.lesson.upsert({
      where: { id: studio.lessonId },
      create: { ...lesson, id: studio.lessonId },
      update: lesson,
    });
    const activity = {
      lessonId: studio.lessonId,
      title: "The Great Work",
      kind: "INTERACT",
      order: 1,
      content: JSON.stringify({ gameKey: "great_work" }),
    };
    await tx.activity.upsert({
      where: { id: studio.activityId },
      create: { ...activity, id: studio.activityId },
      update: activity,
    });
  });
}

module.exports = { seedGreatWork };
