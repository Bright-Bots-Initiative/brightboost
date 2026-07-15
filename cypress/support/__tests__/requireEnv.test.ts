import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { requireEnv } from "../requireEnv";

describe("requireEnv", () => {
  it("R-1: returns the present value", () => {
    const get = vi.fn().mockReturnValue("https://example.com");
    expect(requireEnv("CYPRESS_SWA_URL", get)).toBe("https://example.com");
  });

  it("R-2: throws on whitespace-only value", () => {
    const get = vi.fn().mockReturnValue("   ");
    expect(() => requireEnv("CYPRESS_SWA_URL", get)).toThrow(
      /Required env "CYPRESS_SWA_URL"/,
    );
  });

  it("R-3: throws on empty string", () => {
    const get = vi.fn().mockReturnValue("");
    expect(() => requireEnv("CYPRESS_SWA_URL", get)).toThrow(
      /Required env "CYPRESS_SWA_URL"/,
    );
  });

  it("R-4: throws on undefined", () => {
    const get = vi.fn().mockReturnValue(undefined);
    expect(() => requireEnv("VITE_API_BASE", get)).toThrow(
      /Required env "VITE_API_BASE"/,
    );
  });

  it("R-5: throws on null", () => {
    const get = vi.fn().mockReturnValue(null);
    expect(() => requireEnv("VITE_API_BASE", get)).toThrow(
      /Required env "VITE_API_BASE"/,
    );
  });

  it("R-6: trims surrounding whitespace", () => {
    const get = vi.fn().mockReturnValue("  https://example.com  ");
    expect(requireEnv("CYPRESS_SWA_URL", get)).toBe("https://example.com");
  });

  it("R-7: error message contains the variable name and #677", () => {
    const get = vi.fn().mockReturnValue(undefined);
    // G-101: name the var, say why it cannot run, cite #677 — one CI log line.
    expect(() => requireEnv("CYPRESS_SWA_URL", get)).toThrow(
      /Required env "CYPRESS_SWA_URL"[\s\S]*cannot run without it[\s\S]*Refusing to pass silently[\s\S]*#677/,
    );
  });

  it("R-8: getter is called once with the requested name", () => {
    const get = vi.fn().mockReturnValue("ok");
    requireEnv("VITE_API_BASE", get);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("VITE_API_BASE");
  });

  it("R-9: falsy-but-present values are stringified (0 → \"0\", false → \"false\")", () => {
    expect(requireEnv("NUM", () => 0)).toBe("0");
    expect(requireEnv("FLAG", () => false)).toBe("false");
  });

  it("G-102: helper source imports nothing from cypress and does not reference Cypress", () => {
    const sourcePath = path.resolve(__dirname, "../requireEnv.ts");
    const source = readFileSync(sourcePath, "utf8");
    expect(source).not.toMatch(/from\s+["']cypress["']/);
    expect(source).not.toMatch(/\bCypress\b/);
  });
});
