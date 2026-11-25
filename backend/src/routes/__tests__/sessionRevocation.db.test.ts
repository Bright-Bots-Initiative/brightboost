import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { bindTestDatabase, runTag } from "../../__tests__/helpers/testDb";

const dbUrl = bindTestDatabase();
describe.skipIf(!dbUrl)("session revocation on PostgreSQL", () => {
  const tag = runTag();
  const id = "session-" + tag;
  const email = id + "@example.invalid";
  let app: typeof import("../../server").default;
  let prisma: typeof import("../../utils/prisma").default;
  beforeAll(async () => {
    prisma = (await import("../../utils/prisma")).default;
    app = (await import("../../server")).default;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id } });
    await prisma.$disconnect();
  });
  it("keeps ordinary edits signed in but invalidates prior sessions after reset, home rebind, and role changes", async () => {
    const initial = "Aa1" + randomUUID();
    const replacement = "Bb2" + randomUUID();
    await prisma.user.create({
      data: {
        id,
        email,
        role: "student",
        name: "Learner",
        password: await bcrypt.hash(initial, 4),
        homeAccessEnabled: true,
      },
    });
    const login = async (address: string, password: string) => {
      const response = await request(app)
        .post("/api/login")
        .send({ email: address, password });
      expect(response.status).toBe(200);
      return response.body.token as string;
    };
    const profile = (token: string) =>
      request(app)
        .get("/api/profile")
        .set("Authorization", "Bearer " + token);
    const old = await login(email, initial);
    await prisma.user.update({ where: { id }, data: { name: "Learner two" } });
    expect((await profile(old)).status).toBe(200);
    const reset = randomUUID();
    await prisma.passwordResetToken.create({
      data: {
        token: reset,
        userId: id,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    expect(
      (
        await request(app)
          .post("/api/reset-password")
          .send({ token: reset, password: replacement })
      ).status,
    ).toBe(200);
    expect((await profile(old)).status).toBe(403);
    const fresh = await login(email, replacement);
    expect((await profile(fresh)).status).toBe(200);
    const rebound = id + "-new@example.invalid";
    expect(
      (
        await request(app)
          .post("/api/auth/home-access/credentials")
          .set("Authorization", "Bearer " + fresh)
          .send({ email: rebound, currentPassword: replacement })
      ).status,
    ).toBe(200);
    expect((await profile(fresh)).status).toBe(403);
    const beforeRoleChange = await login(rebound, replacement);
    // Changing a role back must never revive an earlier session.
    await prisma.user.update({ where: { id }, data: { role: "teacher" } });
    await prisma.user.update({ where: { id }, data: { role: "student" } });
    expect((await profile(beforeRoleChange)).status).toBe(403);
    expect((await profile(await login(rebound, replacement))).status).toBe(200);
  });
});
