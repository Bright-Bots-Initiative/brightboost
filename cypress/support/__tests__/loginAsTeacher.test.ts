import { describe, expect, it, vi } from "vitest";
import { assertLoginSuccess, requireE2ECred } from "../loginAsTeacher";

describe("loginAsTeacher helpers (U2-04)", () => {
  describe("requireE2ECred", () => {
    it("returns trimmed credential from env getter", () => {
      const get = vi.fn().mockReturnValue("  teacher@e2e.invalid  ");
      expect(requireE2ECred("E2E_TEACHER_EMAIL", get)).toBe(
        "teacher@e2e.invalid",
      );
    });

    it("throws when credential is missing", () => {
      expect(() =>
        requireE2ECred("E2E_TEACHER_PASSWORD", () => undefined),
      ).toThrow(/Required env "E2E_TEACHER_PASSWORD"/);
    });

    it("throws when credential is whitespace-only", () => {
      expect(() => requireE2ECred("E2E_TEACHER_EMAIL", () => "   ")).toThrow(
        /Required env "E2E_TEACHER_EMAIL"/,
      );
    });
  });

  describe("assertLoginSuccess", () => {
    it("returns token and user on 200", () => {
      const result = assertLoginSuccess(200, {
        token: "tok-1",
        user: { id: "u1", role: "teacher" },
      });
      expect(result).toEqual({
        token: "tok-1",
        user: { id: "u1", role: "teacher" },
      });
    });

    it("throws with status on 401 (loud auth failure)", () => {
      expect(() =>
        assertLoginSuccess(401, { error: "Invalid credentials" }),
      ).toThrow(/loginAsTeacher failed with status 401/);
    });

    it("throws with status when token missing on 200", () => {
      expect(() => assertLoginSuccess(200, { user: { id: "u1" } })).toThrow(
        /missing token\/user in status 200/,
      );
    });

    it("throws with status when user missing on 200", () => {
      expect(() => assertLoginSuccess(200, { token: "tok" })).toThrow(
        /missing token\/user in status 200/,
      );
    });
  });
});
