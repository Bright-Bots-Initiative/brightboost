import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

/**
 * #881 (DEP-01) — the avatar upload route bounds every dimension of a
 * multipart request, not only the file's bytes.
 *
 * The route consumes exactly one part: the `avatar` file. Before this fix the
 * only limit was `fileSize`, so a single authenticated request could carry an
 * unbounded number of fields, parts and header pairs, and a deeply nested
 * field name was handed to `append-field` before any handler ran — the shape
 * the Multer maintainers describe in GHSA-72gw-mp4g-v24j (fixed in 2.2.0) and
 * in the field-name advisories fixed in 2.3.0.
 *
 * Runs through the mounted app with a real signed JWT and the real middleware
 * chain; Prisma is mocked so a rejected request can be shown to write nothing.
 *
 * RED evidence — this suite run against main fc75512f's route (`limits:
 * { fileSize }` only), with multer 2.3.0 already installed so the failures are
 * attributable to the missing bounds and not to the library version:
 * 6 of 9 fail.
 *   - AV-3, AV-4, AV-5, AV-6 returned **200**. The extra field, the 200-field
 *     burst, the 5000-level nested field name and the oversized field value
 *     were each parsed and the avatar written, i.e. the request was accepted.
 *   - AV-2 and AV-7 returned the correct 400 but no `code`, so the response
 *     carried no machine-readable reason. `single()` already rejected the
 *     second file part, so AV-7 is a contract case, not a new bound.
 *   - AV-1, AV-8 and AV-9 passed before and after: the healthy upload, the
 *     401 and the mime rejection are unchanged by this fix.
 */

const SECRET = process.env.SESSION_SECRET || "default_dev_secret";

const prismaMock = vi.hoisted(() => ({
  user: { update: vi.fn(), findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("../../utils/prisma", () => ({ default: prismaMock }));
vi.mock("@prisma/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@prisma/client")>()),
  PrismaClient: class {
    constructor() {
      return prismaMock;
    }
  },
}));

import app from "../../server";

const STUDENT = { id: "student-1", role: "student", auth: "class_code" };
const bearer = () => ({
  Authorization: `Bearer ${jwt.sign(STUDENT, SECRET, { expiresIn: "1h" })}`,
});

// A real 1x1 PNG. `fileFilter` checks the declared mime type, but using valid
// bytes keeps the healthy case honest end to end.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const attachAvatar = (req: request.Test) =>
  req.attach("avatar", PNG, {
    filename: "avatar.webp",
    contentType: "image/png",
  });

describe("#881 POST /api/user/avatar/upload multipart bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.update.mockResolvedValue({
      id: STUDENT.id,
      name: "Ada",
      email: "ada@example.invalid",
      role: "student",
      avatarUrl: "data:image/png;base64,stored",
    });
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  // ---- Phase 1: the healthy path the classroom actually uses ----

  it("AV-1 accepts the one-part upload the client sends", async () => {
    const res = await attachAvatar(
      request(app).post("/api/user/avatar/upload").set(bearer()),
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    const dataUrl = prismaMock.user.update.mock.calls[0][0].data.avatarUrl;
    expect(dataUrl).toBe(`data:image/png;base64,${PNG.toString("base64")}`);
  });

  // ---- Phase 2: each bound, proven to reject and to write nothing ----

  it("AV-2 rejects a file over the 300KB byte limit", async () => {
    const res = await request(app)
      .post("/api/user/avatar/upload")
      .set(bearer())
      .attach("avatar", Buffer.alloc(300 * 1024 + 1, 0x41), {
        filename: "big.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("LIMIT_FILE_SIZE");
    expect(res.body.error).toBe("File too large. Maximum size is 300KB.");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("AV-3 rejects a valid file carrying one unused extra field", async () => {
    const res = await attachAvatar(
      request(app).post("/api/user/avatar/upload").set(bearer()),
    ).field("note", "unused");

    expect(res.status).toBe(400);
    expect(res.body.code).toMatch(/^LIMIT_(FIELD_COUNT|PART_COUNT)$/);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("AV-4 rejects a valid file carrying a 200-field burst", async () => {
    let req = attachAvatar(
      request(app).post("/api/user/avatar/upload").set(bearer()),
    );
    for (let i = 0; i < 200; i += 1) req = req.field(`f${i}`, "x");
    const res = await req;

    expect(res.status).toBe(400);
    expect(res.body.code).toMatch(/^LIMIT_(FIELD_COUNT|PART_COUNT)$/);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("AV-5 rejects a deeply nested field name before it is expanded", async () => {
    // The advisory shape: a name whose bracket nesting drives append-field.
    const nested = `a${"[b]".repeat(5000)}`;
    const res = await attachAvatar(
      request(app).post("/api/user/avatar/upload").set(bearer()),
    ).field(nested, "x");

    expect(res.status).toBe(400);
    expect(res.body.code).toMatch(/^LIMIT_(FIELD_KEY|FIELD_COUNT|PART_COUNT)$/);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("AV-6 rejects an oversized field value", async () => {
    const res = await attachAvatar(
      request(app).post("/api/user/avatar/upload").set(bearer()),
    ).field("note", "x".repeat(2048));

    expect(res.status).toBe(400);
    expect(res.body.code).toMatch(
      /^LIMIT_(FIELD_VALUE|FIELD_COUNT|PART_COUNT)$/,
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("AV-7 rejects a second file part", async () => {
    const res = await attachAvatar(
      request(app).post("/api/user/avatar/upload").set(bearer()),
    ).attach("extra", PNG, {
      filename: "extra.png",
      contentType: "image/png",
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toMatch(
      /^LIMIT_(UNEXPECTED_FILE|FILE_COUNT|PART_COUNT)$/,
    );
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  // ---- Phase 3: bounds did not weaken the guards already in place ----

  it("AV-8 still refuses an unauthenticated upload", async () => {
    const res = await attachAvatar(
      request(app).post("/api/user/avatar/upload"),
    );

    expect(res.status).toBe(401);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("AV-9 still refuses a disallowed mime type", async () => {
    const res = await request(app)
      .post("/api/user/avatar/upload")
      .set(bearer())
      .attach("avatar", Buffer.from("GIF89a"), {
        filename: "avatar.gif",
        contentType: "image/gif",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid file type/);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
