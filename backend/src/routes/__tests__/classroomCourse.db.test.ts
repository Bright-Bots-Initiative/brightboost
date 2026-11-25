import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { bindTestDatabase, runTag } from "../../__tests__/helpers/testDb";
import { generateToken } from "../../utils/token";

const dbUrl = bindTestDatabase();
describe.skipIf(!dbUrl)("classroom records on PostgreSQL", () => {
  const tag = runTag();
  const owner = tag + "-owner",
    other = tag + "-other",
    kid = tag + "-kid";
  let app: typeof import("../../server").default;
  let db: typeof import("../../utils/prisma").default;
  let template: string;
  const token = (id: string, role = "teacher") =>
    "Bearer " + generateToken({ id, role, sessionVersion: 0 }, "password");
  const remove = (id: string, who = owner) =>
    request(app)
      .delete("/api/teacher/courses/" + id)
      .set("Authorization", token(who))
      .timeout(4000);
  const course = () =>
    db.course.create({ data: { teacherId: owner, name: "Test classroom" } });
  beforeAll(async () => {
    db = (await import("../../utils/prisma")).default;
    app = (await import("../../server")).default;
    await db.user.createMany({
      data: [owner, other, kid].map((id) => ({
        id,
        name: "Test",
        role: id === kid ? "student" : "teacher",
      })),
    });
    template = (
      await db.benchmarkTemplate.create({
        data: {
          title: "Test",
          gradeRange: "K-2",
          subject: "STEM",
          questions: [],
        },
      })
    ).id;
  });
  afterAll(async () => {
    await db.benchmarkAttempt.deleteMany({ where: { studentId: kid } });
    await db.creation.deleteMany({ where: { authorId: kid } });
    await db.benchmarkAssignment.deleteMany({
      where: { templateId: template },
    });
    await db.enrollment.deleteMany({ where: { studentId: kid } });
    await db.course.deleteMany({ where: { teacherId: owner } });
    await db.benchmarkTemplate.delete({ where: { id: template } });
    await db.user.deleteMany({ where: { id: { in: [owner, other, kid] } } });
    await db.$disconnect();
  });
  it("deletes an empty class or one with an unused assessment; only its owner can do so", async () => {
    const a = await course();
    expect((await remove(a.id, other)).status).toBe(404);
    expect((await remove(a.id)).status).toBe(200);
    const b = await course();
    const unused = await db.benchmarkAssignment.create({
      data: { courseId: b.id, templateId: template, kind: "PRE" },
    });
    expect((await remove(b.id)).status).toBe(200);
    expect(
      await db.benchmarkAssignment.findUnique({ where: { id: unused.id } }),
    ).toBeNull();
  });
  it("protects a private draft even in a class with no benchmarks", async () => {
    const c = await course();
    const draft = await db.creation.create({
      data: {
        courseId: c.id,
        authorId: kid,
        type: "data_dash_challenge",
        content: {},
      },
    });
    expect((await remove(c.id)).status).toBe(409);
    await expect(
      db.course.delete({ where: { id: c.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
    expect(await db.creation.count({ where: { id: draft.id } })).toBe(1);
  });
  it("takes a teacher’s published choices through ordering and removal to the enrolled learner", async () => {
    const c = await course(),
      foreign = await course();
    const family = await db.moduleFamily.create({
      data: { key: tag, title: "Test family" },
    });
    const base = "/api/teacher/courses/" + c.id + "/module-assignments";
    const call = (id: string) =>
      request(app)
        .post(base)
        .set("Authorization", token(owner))
        .send({ moduleVariantId: id });
    const visible = async () => {
      const r = await request(app)
        .get("/api/student/assigned-modules")
        .set("Authorization", token(kid, "student"));
      expect(r.status).toBe(200);
      return (
        r.body
          .find((g: { classId: string }) => g.classId === c.id)
          ?.modules?.map((m: { variantId: string }) => m.variantId) ?? []
      );
    };
    try {
      const variants = [];
      for (const name of ["first", "second", "spec", "unpublished"]) {
        const slug = tag + "-" + name;
        if (name !== "spec")
          await db.module.create({
            data: {
              slug,
              title: name,
              level: "K-2",
              description: name,
              published: name !== "unpublished",
            },
          });
        variants.push(
          await db.moduleVariant.create({
            data: {
              familyId: family.id,
              band: "k2",
              version: name,
              title: name,
              moduleSlug: name === "spec" ? null : slug,
            },
          }),
        );
      }
      const [a, b, spec, unpublished] = variants;
      const catalog = await request(app)
        .get("/api/module-catalog/variants?band=k2&playable=true")
        .set("Authorization", token(owner));
      expect(catalog.status).toBe(200);
      expect(catalog.body.map((v: { id: string }) => v.id)).toEqual(
        expect.arrayContaining([a.id, b.id]),
      );
      expect(catalog.body.map((v: { id: string }) => v.id)).not.toContain(
        spec.id,
      );
      expect((await call(spec.id)).status).toBe(409);
      expect((await call(unpublished.id)).status).toBe(409);
      const one = await call(a.id),
        two = await call(b.id);
      expect([one.status, two.status]).toEqual([201, 201]);
      expect(await visible()).toEqual([]);
      await db.enrollment.create({ data: { studentId: kid, courseId: c.id } });
      expect(await visible()).toEqual([a.id, b.id]);
      const move = (who: string) =>
        request(app)
          .post(base + "/" + two.body.id + "/move")
          .set("Authorization", token(who))
          .send({ direction: "up" });
      expect((await move(other)).status).toBe(404);
      expect((await move(owner)).status).toBe(200);
      expect(await visible()).toEqual([b.id, a.id]);
      // Even the same teacher must not mutate an assignment through the wrong class.
      expect(
        (
          await request(app)
            .delete(
              "/api/teacher/courses/" +
                foreign.id +
                "/module-assignments/" +
                two.body.id,
            )
            .set("Authorization", token(owner))
        ).status,
      ).toBe(404);
      const locked = await request(app)
        .put(base + "/" + two.body.id)
        .set("Authorization", token(owner))
        .send({ isLocked: true });
      expect(locked.status).toBe(200);
      expect((await call(b.id)).status).toBe(201);
      expect(await visible()).toEqual([a.id]);
      expect(
        (
          await request(app)
            .delete(base + "/" + one.body.id)
            .set("Authorization", token(owner))
        ).status,
      ).toBe(200);
      expect(await visible()).toEqual([]);
    } finally {
      await db.classModuleAssignment.deleteMany({ where: { courseId: c.id } });
      await db.moduleVariant.deleteMany({ where: { familyId: family.id } });
      await db.moduleFamily.delete({ where: { id: family.id } });
      await db.module.deleteMany({
        where: { slug: { startsWith: tag + "-" } },
      });
    }
  });
  it.each(["attempt", "creation"] as const)(
    "retains the whole class and roster when there is a learner %s",
    async (kind) => {
      const c = await course();
      const enrollment = await db.enrollment.create({
        data: { studentId: kid, courseId: c.id },
      });
      const a = await db.benchmarkAssignment.create({
        data: { courseId: c.id, templateId: template, kind: "PRE" },
      });
      if (kind === "attempt")
        await db.benchmarkAttempt.create({
          data: {
            assignmentId: a.id,
            studentId: kid,
            answers: [],
            score: 1,
            totalQuestions: 1,
            timeSpentS: 10,
          },
        });
      else
        await db.creation.create({
          data: {
            courseId: c.id,
            authorId: kid,
            type: "data_dash_challenge",
            content: {},
          },
        });
      const response = await remove(c.id);
      expect(response.status).toBe(409);
      expect(response.body.error).toBe("class_has_learning_records");
      expect(await db.enrollment.count({ where: { id: enrollment.id } })).toBe(
        1,
      );
      expect(await db.benchmarkAssignment.count({ where: { id: a.id } })).toBe(
        1,
      );
      if (kind === "attempt")
        expect(
          await db.benchmarkAttempt.count({ where: { assignmentId: a.id } }),
        ).toBe(1);
      else
        expect(await db.creation.count({ where: { courseId: c.id } })).toBe(1);
    },
  );
});
