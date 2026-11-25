import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  starterStudioDraft,
  verifyStudioDraft,
} from "@brightboost/greatwork-engine";
import { bindTestDatabase, runTag } from "../../__tests__/helpers/testDb";
import {
  creationCreateLimiter,
  creationUpdateLimiter,
} from "../../utils/security";

const dbUrl = bindTestDatabase();

describe.skipIf(!dbUrl)("authenticated Great Work shelf (Postgres)", () => {
  const tag = runTag();
  const owner = "gw-kid-" + tag,
    peer = "gw-peer-" + tag,
    teacher = "gw-adult-" + tag;
  const courseId = "gw-class-" + tag;
  const shelf = "/api/great-work/machines";
  const as = (id: string) => ({
    "x-user-id": id,
    "x-role": id === teacher ? "teacher" : "student",
  });
  let prisma: typeof import("../../utils/prisma").default;
  let app: typeof import("../../server").default;
  let oldShim: string | undefined;

  beforeAll(async () => {
    oldShim = process.env.ALLOW_DEV_ROLE_HEADER;
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
    app = (await import("../../server")).default;
    prisma = (await import("../../utils/prisma")).default;
    await prisma.user.createMany({
      data: [owner, peer, teacher].map((id) => ({
        id,
        name: "Test",
        role: id === teacher ? "teacher" : "student",
      })),
    });
    await prisma.course.create({
      data: { id: courseId, teacherId: teacher, name: "Test workshop" },
    });
    await prisma.enrollment.createMany({
      data: [owner, peer].map((studentId) => ({ studentId, courseId })),
    });
  });
  beforeEach(() => {
    for (const user of [owner, peer]) {
      creationCreateLimiter.resetKey("student:" + user);
      creationUpdateLimiter.resetKey("student:" + user);
    }
  });
  afterAll(async () => {
    if (oldShim === undefined) delete process.env.ALLOW_DEV_ROLE_HEADER;
    else process.env.ALLOW_DEV_ROLE_HEADER = oldShim;
    if (!prisma) return;
    await prisma.gamePersonalBest.deleteMany({
      where: { studentId: { in: [owner, peer] }, gameKey: "great_work" },
    });
    await prisma.creation.deleteMany({ where: { courseId } });
    await prisma.enrollment.deleteMany({ where: { courseId } });
    await prisma.course.deleteMany({ where: { id: courseId } });
    await prisma.user.deleteMany({
      where: { id: { in: [owner, peer, teacher] } },
    });
  });
  const put = (
    user: string,
    id: string,
    expectedRevision: number | null,
    content: unknown,
    parentCreationId?: string,
  ) =>
    request(app)
      .put(shelf + "/" + id)
      .set(as(user))
      .send({ courseId, expectedRevision, content, parentCreationId });
  const get = (user: string, id: string) =>
    request(app)
      .get(shelf + "/" + id)
      .query({ courseId })
      .set(as(user));

  it("replays a named design after reload, ignores fabricated results and saves unfinished edits", async () => {
    const id = randomUUID();
    const base = starterStudioDraft("es", true);
    const draft = {
      ...base,
      program: {
        ...base.program,
        tapes: [{ armId: 1, chips: ["GRAB", "ROTATE_CW", "DROP"] as const }],
      },
    };
    const expected = verifyStudioDraft(draft);
    expect(expected.solved).toBe(true);
    const { body } = await put(owner, id, null, {
      ...draft,
      lastRun: { cost: 0, area: 0, solved: false },
    }).expect(201);
    expect(body.content).toEqual(draft);
    expect(body.lastRun).toMatchObject({
      solved: true,
      cost: expected.cost,
      cycles: expected.cycles,
      area: expected.area,
    });
    const reloaded = await get(owner, id).expect(200);
    expect(reloaded.body).toEqual(body);
    const retry = await put(owner, id, null, draft).expect(200);
    expect(retry.body).toEqual(body);
    const unfinished = await put(owner, id, 1, base).expect(200);
    expect(unfinished.body).toMatchObject({
      revision: 2,
      content: base,
      lastRun: { solved: false },
    });
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: owner } })).xp,
    ).toBe(0);
    const best = await prisma.gamePersonalBest.findUniqueOrThrow({
      where: { studentId_gameKey: { studentId: owner, gameKey: "great_work" } },
    });
    expect(best.bestScore).toBe(0);
    expect(best.meta).toMatchObject({
      overall: {
        cost: expected.cost,
        cycles: expected.cycles,
        area: expected.area,
      },
    });
  });

  it("makes copies independent and admits only one of two conflicting revisions", async () => {
    const id = randomUUID(),
      copy = randomUUID();
    const original = starterStudioDraft("en");
    await put(owner, id, null, original).expect(201);
    await put(owner, copy, null, original, id).expect(201);
    const writes = await Promise.all(
      [1, 2].map((iterations) =>
        put(owner, copy, 1, { ...original, iterations }),
      ),
    );
    expect(writes.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(writes.find((r) => r.status === 409)?.body.error).toBe(
      "machine_revision_conflict",
    );
    expect((await get(owner, copy)).body).toMatchObject({
      revision: 2,
      parentCreationId: id,
    });
    expect((await get(owner, id)).body).toMatchObject({
      revision: 1,
      content: original,
    });
    const list = await request(app)
      .get(shelf)
      .query({ courseId })
      .set(as(owner))
      .expect(200);
    expect(list.body.machines.map((m: { id: string }) => m.id)).toEqual(
      expect.arrayContaining([id, copy]),
    );
  });

  it("enforces author and membership, including the generic creation route", async () => {
    const id = randomUUID(),
      draft = starterStudioDraft("en");
    await put(owner, id, null, draft).expect(201);
    await get(peer, id).expect(404);
    await put(peer, id, 1, draft).expect(404);
    await put(peer, randomUUID(), null, draft, id).expect(404);
    await request(app)
      .patch("/api/creations/" + id)
      .set(as(owner))
      .send({ status: "SHARED" })
      .expect(403);
    await get(teacher, id).expect(403);
    await request(app).get(shelf).query({ courseId }).expect(401);
    const list = await request(app)
      .get(shelf)
      .query({ courseId })
      .set(as(peer))
      .expect(200);
    expect(list.body.machines).toEqual([]);
    const row = await put(peer, randomUUID(), null, draft).expect(201);
    await prisma.enrollment.delete({
      where: { studentId_courseId: { studentId: peer, courseId } },
    });
    try {
      await get(peer, row.body.id).expect(404);
      await put(peer, row.body.id, 1, draft).expect(403);
    } finally {
      await prisma.enrollment.create({ data: { studentId: peer, courseId } });
    }
  });
});
