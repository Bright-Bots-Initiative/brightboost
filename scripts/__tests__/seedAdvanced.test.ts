import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";
import { ADVANCED_ACTIVITIES } from "../../shared/progression/advanced";
const require = createRequire(import.meta.url);

describe.each([
  "../../prisma/seedAdvanced.cjs",
  "../../backend/prisma/seedAdvanced.cjs",
])("advanced seed %s", (file) => {
  it("seeds both canonical chains idempotently with the first specialty activity", async () => {
    function table() {
      const rows = new Map<string, Record<string, unknown>>();
      return {
        rows,
        upsert: vi.fn(
          async ({
            where,
            create,
            update,
          }: {
            where: Record<string, string>;
            create: Record<string, unknown>;
            update: Record<string, unknown>;
          }) => {
            const key = Object.values(where)[0];
            const row = rows.has(key)
              ? { ...rows.get(key), ...update }
              : { id: key, ...create };
            rows.set(key, row);
            return row;
          },
        ),
      };
    }
    const db = {
      module: table(),
      unit: table(),
      lesson: table(),
      activity: table(),
    };
    const { seedAdvanced } = require(file);
    await seedAdvanced(db, "teacher");
    await seedAdvanced(db, "teacher");
    for (const advanced of ADVANCED_ACTIVITIES) {
      const module = db.module.rows.get(advanced.slug)!;
      const lesson = db.lesson.rows.get(advanced.lessonId)!;
      const activity = db.activity.rows.get(advanced.activityId)!;
      const unit = db.unit.rows.get(String(lesson.unitId))!;
      expect(unit.moduleId).toBe(module.id);
      expect(unit.teacherId).toBe("teacher");
      expect(module.level).toBe("K-2");
      expect(activity).toMatchObject({
        lessonId: lesson.id,
        order: 1,
        kind: "INTERACT",
      });
      expect(JSON.parse(String(activity.content))).toEqual({
        gameKey: advanced.activityId,
      });
    }
    for (const entity of Object.values(db)) expect(entity.rows.size).toBe(2);
  });
});
