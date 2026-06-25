import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { PrismaClient } from "@prisma/client";

// Prisma mock (hoisted so it exists before the module mocks below apply).
const prismaMock = vi.hoisted(() => ({
  enrollment: {
    findUnique: vi.fn(),
  },
  course: {
    findFirst: vi.fn(),
  },
  creation: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

vi.mock("../utils/prisma", () => ({
  default: new PrismaClient(),
}));

// Import app AFTER mocking.
import app from "../server";

const KID = "kid-1";
const OTHER_KID = "kid-2";
const TEACHER = "teacher-1";
const COURSE = "course-1";

function asStudent(id: string) {
  return { "x-user-id": id, "x-role": "student" } as Record<string, string>;
}
function asTeacher(id: string) {
  return { "x-user-id": id, "x-role": "teacher" } as Record<string, string>;
}

const dbCreation = {
  id: "creation-1",
  authorId: KID,
  courseId: COURSE,
  type: "data_dash_challenge",
  title: "My plant sort",
  status: "IN_PROGRESS",
  content: { hello: "world" },
  createdAt: new Date("2026-06-25"),
  updatedAt: new Date("2026-06-25"),
  author: { name: "Ada Lovelace" },
};

describe("Creations routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOW_DEV_ROLE_HEADER = "1";
  });

  describe("POST /api/creations", () => {
    it("lets an enrolled kid create a draft (201, IN_PROGRESS, first name only)", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });
      prismaMock.creation.create.mockResolvedValue(dbCreation);

      const res = await request(app)
        .post("/api/creations")
        .set(asStudent(KID))
        .send({
          courseId: COURSE,
          type: "data_dash_challenge",
          title: "My plant sort",
          content: { hello: "world" },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("IN_PROGRESS");
      expect(res.body.authorName).toBe("Ada"); // first name only
      expect(res.body).not.toHaveProperty("content"); // payload not echoed
      expect(res.body.email).toBeUndefined();
    });

    it("rejects a kid who is not enrolled in the group (403)", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/creations")
        .set(asStudent(KID))
        .send({ courseId: COURSE, type: "data_dash_challenge", content: {} });

      expect(res.status).toBe(403);
      expect(prismaMock.creation.create).not.toHaveBeenCalled();
    });

    it("rejects an unknown creation type (400)", async () => {
      const res = await request(app)
        .post("/api/creations")
        .set(asStudent(KID))
        .send({ courseId: COURSE, type: "free_text_blog", content: {} });

      expect(res.status).toBe(400);
    });

    it("forbids a teacher from authoring a creation (403)", async () => {
      const res = await request(app)
        .post("/api/creations")
        .set(asTeacher(TEACHER))
        .send({ courseId: COURSE, type: "data_dash_challenge", content: {} });

      expect(res.status).toBe(403);
    });
  });

  describe("PATCH /api/creations/:id", () => {
    it("lets the author share their own WIP (kid-initiated SHARED)", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        id: "creation-1",
        authorId: KID,
        type: "data_dash_challenge",
      });
      prismaMock.creation.update.mockResolvedValue({
        ...dbCreation,
        status: "SHARED",
      });

      const res = await request(app)
        .patch("/api/creations/creation-1")
        .set(asStudent(KID))
        .send({ status: "SHARED" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("SHARED");
    });

    it("forbids a different kid from editing someone else's creation (403)", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        id: "creation-1",
        authorId: KID,
        type: "data_dash_challenge",
      });

      const res = await request(app)
        .patch("/api/creations/creation-1")
        .set(asStudent(OTHER_KID))
        .send({ status: "SHARED" });

      expect(res.status).toBe(403);
      expect(prismaMock.creation.update).not.toHaveBeenCalled();
    });

    it("404s for a missing creation", async () => {
      prismaMock.creation.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/creations/nope")
        .set(asStudent(KID))
        .send({ status: "COMPLETE" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/creations?courseId=", () => {
    it("returns group creations to an enrolled member (first name only)", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });
      prismaMock.creation.findMany.mockResolvedValue([dbCreation]);

      const res = await request(app)
        .get(`/api/creations?courseId=${COURSE}`)
        .set(asStudent(OTHER_KID));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].authorName).toBe("Ada");
      expect(res.body[0].email).toBeUndefined();
    });

    it("lets the owning teacher read the group gallery", async () => {
      prismaMock.course.findFirst.mockResolvedValue({ id: COURSE });
      prismaMock.creation.findMany.mockResolvedValue([dbCreation]);

      const res = await request(app)
        .get(`/api/creations?courseId=${COURSE}`)
        .set(asTeacher(TEACHER));

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("forbids a non-member (403)", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get(`/api/creations?courseId=${COURSE}`)
        .set(asStudent(OTHER_KID));

      expect(res.status).toBe(403);
    });

    it("400s when courseId is missing", async () => {
      const res = await request(app)
        .get("/api/creations")
        .set(asStudent(KID));

      expect(res.status).toBe(400);
    });
  });
});
