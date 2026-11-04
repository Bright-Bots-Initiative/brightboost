// @vitest-environment node
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  pathwayCohort: { findFirst: vi.fn() },
  pathwayEnrollment: { findFirst: vi.fn(), create: vi.fn() },
  user: { findUnique: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
}));
vi.mock("../../utils/prisma", () => ({ default: db }));
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(
      async (plain: string, hash: string) =>
        plain === "password" && hash === "stored",
    ),
    hash: vi.fn(async () => "stored"),
  },
}));
import bcrypt from "bcryptjs";
import auth from "../auth";

const app = express()
  .set("trust proxy", 1)
  .use(express.json())
  .use("/api", auth);
const login = (
  ip: string,
  userId: string,
  password: unknown = "password",
  code: unknown = "ABC234",
) =>
  request(app)
    .post("/api/auth/pathways-code-login")
    .set("X-Forwarded-For", ip)
    .send({ cohortCode: code, userId, password });
const register = (ip: string, cohortCode: unknown, displayName = "Learner") =>
  request(app)
    .post("/api/auth/register-pathways")
    .set("X-Forwarded-For", ip)
    .send({ cohortCode, displayName, password: "password", birthYear: 2011 });

beforeEach(() => {
  vi.clearAllMocks();
  db.pathwayCohort.findFirst.mockImplementation(async ({ where }) =>
    where.joinCode.equals === "ABC234"
      ? { id: "cohort", name: "Room", band: "explorer", trackIds: [] }
      : null,
  );
  db.pathwayEnrollment.findFirst.mockImplementation(async ({ where }) =>
    where.userId === "absent"
      ? null
      : { user: { id: where.userId, role: "student", password: "stored" } },
  );
  db.user.findUnique.mockResolvedValue(null);
  db.user.create.mockImplementation(async ({ data }) => ({
    ...data,
    id: data.name,
  }));
});

describe("Pathways cohort sign-in", () => {
  it("lets 30 learners register and sign in from one school address", async () => {
    for (let i = 0; i < 30; i++) {
      const id = `learner-${i}`;
      expect((await register("203.0.113.1", " abc234 ", id)).status).toBe(201);
      const res = await login("203.0.113.1", id);
      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(id);
      expect(res.body.user).not.toHaveProperty("password");
    }
  });

  it("charges guesses across addresses to the learner, leaving a classmate able to sign in", async () => {
    for (let i = 0; i < 8; i++) {
      expect(
        (
          await login(
            `203.0.113.${10 + i}`,
            "target",
            "wrong",
            i % 2 ? "abc234" : "ABC234",
          )
        ).status,
      ).toBe(401);
    }
    expect((await login("203.0.113.30", "target")).status).toBe(429);
    expect((await login("203.0.113.30", "classmate")).status).toBe(200);
  });

  it("bounds password spraying across accounts on the same address", async () => {
    for (let i = 0; i < 60; i++)
      expect((await login("203.0.113.31", `spray-${i}`, "wrong")).status).toBe(
        401,
      );
    expect((await login("203.0.113.31", "another")).status).toBe(429);
    expect((await register("203.0.113.31", "ABC234")).status).toBe(201);
  });

  it("bounds registrations against one normalized code even across addresses", async () => {
    for (let i = 0; i < 90; i++)
      expect(
        (await register(`198.51.100.${i + 1}`, i % 2 ? " unknown " : "UNKNOWN"))
          .status,
      ).toBe(404);
    expect((await register("198.51.100.100", "unknown")).status).toBe(429);
    expect((await register("198.51.100.100", "ABC234")).status).toBe(201);
  });

  it("rejects malformed and oversized data before database or bcrypt work", async () => {
    for (const [id, pw, code] of [
      ["id", "p".repeat(101), "ABC234"],
      ["i".repeat(129), "password", "ABC234"],
      ["id", {}, "ABC234"],
      ["id", "password", "c".repeat(65)],
    ] as const)
      expect((await login("203.0.113.32", id, pw, code)).status).toBe(400);
    expect((await register("203.0.113.32", "c".repeat(65))).status).toBe(400);
    expect(db.pathwayCohort.findFirst).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it("gives the same credential error for a bad code, an absent learner, or a bad password", async () => {
    const badCode = await login("203.0.113.33", "one", "password", "no");
    const absent = await login("203.0.113.33", "absent");
    const wrong = await login("203.0.113.33", "three", "wrong");
    for (const res of [badCode, absent, wrong]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid credentials" });
    }
  });
});
