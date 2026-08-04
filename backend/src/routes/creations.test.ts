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

// A solvable, unambiguous Data Dash challenge (see dataDashChallenge.test.ts).
const validChallenge = {
  v: 1,
  cardIds: ["bean", "fern", "pine", "moss"],
  sortRule: "waterNeed",
  inferRule: "growthSpeed",
};

const validRaceTrack = {
  v: 1,
  name: "Turbo Loop",
  grid: { w: 6, h: 6 },
  pieces: [
    { x: 1, y: 2, type: "start", rot: 0 },
    { x: 2, y: 2, type: "finish", rot: 0 },
  ],
};

const validSoundDuet = {
  v: 1,
  name: "Moon Echo",
  band: "k2",
  pulses: 4,
  layers: {
    lead: [{ t: 0, soundId: "step" }],
    partner: [{ t: 3, soundId: "clap" }],
  },
  spots: ["tunnel"],
  coverPose: "highFive",
};

const dbCreation = {
  id: "creation-1",
  authorId: KID,
  courseId: COURSE,
  type: "data_dash_challenge",
  title: "My plant sort",
  status: "IN_PROGRESS",
  content: validChallenge,
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
          content: validChallenge,
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

    it("rejects an unsolvable challenge at save (422)", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });

      const res = await request(app)
        .post("/api/creations")
        .set(asStudent(KID))
        .send({
          courseId: COURSE,
          type: "data_dash_challenge",
          // Too few cards — fails the solvability guard.
          content: {
            v: 1,
            cardIds: ["bean"],
            sortRule: "waterNeed",
            inferRule: "growthSpeed",
          },
        });

      expect(res.status).toBe(422);
      expect(prismaMock.creation.create).not.toHaveBeenCalled();
    });

    it("forbids a teacher from authoring a creation (403)", async () => {
      const res = await request(app)
        .post("/api/creations")
        .set(asTeacher(TEACHER))
        .send({ courseId: COURSE, type: "data_dash_challenge", content: {} });

      expect(res.status).toBe(403);
    });

    it("replaces a crafted title with the derived title on create", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });
      prismaMock.creation.create.mockResolvedValue({
        ...dbCreation,
        title: "Sort by Water need",
      });

      const res = await request(app)
        .post("/api/creations")
        .set(asStudent(KID))
        .send({
          courseId: COURSE,
          type: "data_dash_challenge",
          title: "this should be ignored",
          content: validChallenge,
        });

      expect(res.status).toBe(201);
      expect(prismaMock.creation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Sort by Water need",
          }),
        }),
      );
    });

    it("rejects a challenge with unexpected extra keys (422)", async () => {
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });

      const res = await request(app)
        .post("/api/creations")
        .set(asStudent(KID))
        .send({
          courseId: COURSE,
          type: "data_dash_challenge",
          content: { ...validChallenge, surprise: "not allowed" },
        });

      expect(res.status).toBe(422);
      expect(prismaMock.creation.create).not.toHaveBeenCalled();
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

    it("replaces a crafted title with the derived title on update", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        id: "creation-1",
        authorId: KID,
        type: "data_dash_challenge",
        content: validChallenge,
      });
      prismaMock.creation.update.mockResolvedValue({
        ...dbCreation,
        title: "Sort by Water need",
      });

      const res = await request(app)
        .patch("/api/creations/creation-1")
        .set(asStudent(KID))
        .send({
          title: "this should be ignored",
          content: validChallenge,
        });

      expect(res.status).toBe(200);
      expect(prismaMock.creation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Sort by Water need",
          }),
        }),
      );
    });

    it("rejects unexpected extra keys on update (422)", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        id: "creation-1",
        authorId: KID,
        type: "data_dash_challenge",
        content: validChallenge,
      });

      const res = await request(app)
        .patch("/api/creations/creation-1")
        .set(asStudent(KID))
        .send({
          content: { ...validChallenge, surprise: "not allowed" },
        });

      expect(res.status).toBe(422);
      expect(prismaMock.creation.update).not.toHaveBeenCalled();
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
      const res = await request(app).get("/api/creations").set(asStudent(KID));

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/creations/:id", () => {
    it("returns a shared creation WITH content to a group member", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        ...dbCreation,
        status: "SHARED",
      });
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });

      const res = await request(app)
        .get("/api/creations/creation-1")
        .set(asStudent(OTHER_KID));

      expect(res.status).toBe(200);
      expect(res.body.content).toEqual(validChallenge); // playable payload
      expect(res.body.authorName).toBe("Ada");
    });

    it.each([
      ["race_track", validRaceTrack],
      ["sound_duet", validSoundDuet],
    ])(
      "returns complete %s content instead of a Data Dash projection",
      async (type, content) => {
        prismaMock.creation.findUnique.mockResolvedValue({
          ...dbCreation,
          type,
          content,
          status: "SHARED",
        });
        prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });

        const res = await request(app)
          .get("/api/creations/creation-1")
          .set(asStudent(OTHER_KID));

        expect(res.status).toBe(200);
        expect(res.body.content).toEqual(content);
      },
    );

    it("lets the author fetch their own unshared draft", async () => {
      prismaMock.creation.findUnique.mockResolvedValue(dbCreation); // IN_PROGRESS
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });

      const res = await request(app)
        .get("/api/creations/creation-1")
        .set(asStudent(KID));

      expect(res.status).toBe(200);
    });

    it("hides an unshared draft from another group member (403)", async () => {
      prismaMock.creation.findUnique.mockResolvedValue(dbCreation); // IN_PROGRESS, author KID
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });

      const res = await request(app)
        .get("/api/creations/creation-1")
        .set(asStudent(OTHER_KID));

      expect(res.status).toBe(403);
    });

    it("forbids a non-member (403)", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        ...dbCreation,
        status: "SHARED",
      });
      prismaMock.enrollment.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/creations/creation-1")
        .set(asStudent(OTHER_KID));

      expect(res.status).toBe(403);
    });

    it("404s for a missing creation", async () => {
      prismaMock.creation.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/creations/nope")
        .set(asStudent(KID));

      expect(res.status).toBe(404);
    });

    it("does not return unexpected content keys", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        ...dbCreation,
        status: "SHARED",
        content: { ...validChallenge, surprise: "not shared" },
      });
      prismaMock.enrollment.findUnique.mockResolvedValue({ id: "enr-1" });

      const res = await request(app)
        .get("/api/creations/creation-1")
        .set(asStudent(OTHER_KID));

      expect(res.status).toBe(200);
      expect(res.body.content).toEqual(validChallenge);
      expect(res.body.content).not.toHaveProperty("surprise");
    });
  });

  describe("POST /api/creations/:id/encourage", () => {
    it("lets the owning teacher boost a creation", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        id: "creation-1",
        courseId: COURSE,
      });
      prismaMock.course.findFirst.mockResolvedValue({ id: COURSE });
      prismaMock.creation.update.mockResolvedValue({ encouragements: 3 });

      const res = await request(app)
        .post("/api/creations/creation-1/encourage")
        .set(asTeacher(TEACHER))
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.encouragements).toBe(3);
    });

    it("forbids a kid from boosting (adults only)", async () => {
      const res = await request(app)
        .post("/api/creations/creation-1/encourage")
        .set(asStudent(KID))
        .send({});

      expect(res.status).toBe(403);
      expect(prismaMock.creation.update).not.toHaveBeenCalled();
    });

    it("forbids a teacher who does not own the group", async () => {
      prismaMock.creation.findUnique.mockResolvedValue({
        id: "creation-1",
        courseId: COURSE,
      });
      prismaMock.course.findFirst.mockResolvedValue(null); // not their course

      const res = await request(app)
        .post("/api/creations/creation-1/encourage")
        .set(asTeacher("teacher-2"))
        .send({});

      expect(res.status).toBe(403);
    });
  });
});
