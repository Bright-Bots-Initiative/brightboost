/* @vitest-environment node */
import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  truncateSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const directories: string[] = [];
const script = path.resolve(__dirname, "../check-bundle-size.js");
const limit = 400 * 1024 * 1024;
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "bb-bundle-"));
  directories.push(dir);
  return dir;
}
function file(dir: string, name: string, bytes: number) {
  const target = path.join(dir, name);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, "");
  // Sparse files prove the byte budget without allocating hundreds of MB.
  truncateSync(target, bytes);
}
function run(dir: string) {
  const result = spawnSync(process.execPath, [script, dir], {
    encoding: "utf8",
  });
  return { status: result.status, output: result.stdout + result.stderr };
}
afterEach(() =>
  directories
    .splice(0)
    .forEach((dir) => rmSync(dir, { recursive: true, force: true })),
);

describe("the shared local/CI deployment footprint budget (#816)", () => {
  it("passes at the existing 400 MiB CI limit, fails one byte over, then recovers", () => {
    const dir = fixture();
    file(dir, "index.html", 128);
    file(dir, "assets/game.js", limit - 128);
    expect(run(dir)).toEqual({
      status: 0,
      output: expect.stringContaining(`BUNDLE_OK: ${limit} bytes`),
    });
    file(dir, "assets/game.js", limit - 127);
    expect(run(dir)).toEqual({
      status: 1,
      output: expect.stringContaining(`BUNDLE_TOO_LARGE: ${limit + 1} bytes`),
    });
    file(dir, "assets/game.js", 512);
    expect(run(dir)).toEqual({
      status: 0,
      output: expect.stringContaining("BUNDLE_OK: 640 bytes"),
    });
  });
  it("counts small and nested files without rounding each file away", () => {
    const dir = fixture();
    file(dir, "assets/main.js", 513);
    file(dir, "nested/data.json", 1);
    expect(run(dir).output).toContain("BUNDLE_OK: 514 bytes");
  });
  it("refuses an absent or empty build", () => {
    const dir = fixture();
    expect(run(path.join(dir, "missing"))).toEqual({
      status: 2,
      output: expect.stringContaining("BUNDLE_READ_ERROR"),
    });
    expect(run(dir)).toEqual({
      status: 1,
      output: expect.stringContaining("BUNDLE_EMPTY"),
    });
  });
});
