import { describe, it, expect, vi } from "vitest";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import {
  BIOTRAIL_SLUG,
  BIOTRAIL_ACTIVITY_ID,
  BIOTRAIL_LESSON_ID,
} from "../../shared/progression/advanced";
const { seedAdvanced } = createRequire(import.meta.url)("../seedAdvanced.cjs");
describe("Advanced curriculum seed", () => {
  it("upserts stable curriculum identities on repeated runs without touching accounts", async () => {
    const prisma = {
      module: { upsert: vi.fn().mockResolvedValue({ id: "module-id" }) },
      unit: {
        upsert: vi.fn().mockResolvedValue({ id: "biotrail-expedition" }),
      },
      lesson: { upsert: vi.fn().mockResolvedValue({ id: BIOTRAIL_LESSON_ID }) },
      activity: {
        upsert: vi.fn().mockResolvedValue({ id: BIOTRAIL_ACTIVITY_ID }),
      },
    };
    await seedAdvanced(prisma, "teacher-id");
    await seedAdvanced(prisma, "teacher-id");
    expect(prisma.module.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: BIOTRAIL_SLUG } }),
    );
    expect(prisma.lesson.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BIOTRAIL_LESSON_ID } }),
    );
    const calls = prisma.activity.upsert.mock.calls;
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[0][0].create).toMatchObject({
      id: BIOTRAIL_ACTIVITY_ID,
      lessonId: BIOTRAIL_LESSON_ID,
      content: JSON.stringify({ gameKey: "biotrail" }),
    });
    expect(readFileSync("prisma/seedAdvanced.cjs", "utf8")).toBe(
      readFileSync("backend/prisma/seedAdvanced.cjs", "utf8"),
    );
  });
});
