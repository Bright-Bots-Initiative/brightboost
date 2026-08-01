import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Regression guard for #698 — "STARS1 class code fails to unlock K-2".
 *
 * Root cause was a SEED OMISSION: STARS1 was documented as the K-2
 * emoji-login class code but never seeded, so `/auth/lookup-code` 404'd and
 * the K-2 section never unlocked. A mocked-endpoint test cannot catch this
 * (it would mock the class into existence); the honest guard asserts the
 * seed actually defines the STARS1 K-2 class + a non-empty emoji roster —
 * the exact conditions the join chain (lookup-code → by-code roster →
 * class-login → useGradeBand=k2) depends on. The end-to-end endpoint chain
 * itself was verified live against the seeded stack (see the PR).
 */
const ROOT_SEED = resolve(__dirname, "../seed.cjs");
const BACKEND_SEED = resolve(__dirname, "../../backend/prisma/seed.cjs");

const src = readFileSync(ROOT_SEED, "utf8");

describe("seed defines the STARS1 K-2 emoji-login class (#698)", () => {
  it("creates a Course with joinCode STARS1", () => {
    expect(src).toMatch(/joinCode:\s*"STARS1"/);
  });

  it("leaves STARS1 on the k2 band (never forces g3_5) so useGradeBand resolves k2", () => {
    // Isolate the STARS1 upsert block and assert it is not created/updated as g3_5.
    const block = src.slice(
      src.indexOf('joinCode: "STARS1"') - 200,
      src.indexOf('joinCode: "STARS1"') + 400,
    );
    expect(block).not.toMatch(/gradeBand:\s*"g3_5"/);
    // Course.gradeBand defaults "k2" in the schema; the update path pins k2.
    expect(block).toMatch(/gradeBand:\s*"k2"/);
  });

  it("enrolls emoji-login students (loginIcon set) so the roster is non-empty", () => {
    // At least one student defined with a loginIcon…
    expect(src).toMatch(/loginIcon:\s*"[^"]+"/);
    // …and the star cohort is wired to the class via enrollment.
    expect(src).toMatch(/star-nova|starStudents/);
    expect(src).toMatch(/enrollment\.upsert/);
  });

  it("keeps STARS1 students PIN-less (emoji-only login path)", () => {
    const block = src.slice(src.indexOf("starStudents"), src.indexOf("starStudents") + 600);
    expect(block).not.toMatch(/loginPin/);
  });

  it("root and backend seed files stay byte-identical (sync invariant)", () => {
    expect(readFileSync(BACKEND_SEED, "utf8")).toBe(src);
  });
});
