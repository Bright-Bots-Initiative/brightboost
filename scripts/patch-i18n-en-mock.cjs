#!/usr/bin/env node
/**
 * Switch each test that mocks react-i18next with `t: (key) => key` to the
 * shared enMock helper, which resolves keys against `src/locales/en/common.json`.
 *
 * Tests using the bare key-passthrough mock pre-date the i18n migration —
 * they assert on user-visible English strings but the components now
 * render `t("some.key")`. The enMock helper makes those assertions pass
 * again WITHOUT changing what the test verifies: the user-facing string.
 *
 * Idempotent: skips files already using enMock.
 */
const fs = require("fs");
const path = require("path");

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(full, acc);
    } else if (name.endsWith(".test.ts") || name.endsWith(".test.tsx")) {
      acc.push(full);
    }
  }
  return acc;
}

const src_root = path.resolve(__dirname, "..", "src");
const candidates = walk(src_root);

const REPLACEMENT = `vi.mock("react-i18next", async () => {
  const { enMock } = await import("@/test/i18nMock");
  return enMock();
});`;

// Conservative pattern: match the whole vi.mock("react-i18next", ...) block
// that contains the key-passthrough \`t: (key) => key\`. Captures every block
// style we've seen — both with and without the recently-added
// initReactI18next/Trans/I18nextProvider stubs.
const PATTERN =
  /vi\.mock\(\s*["']react-i18next["'][\s\S]*?t:\s*\(key:\s*string\)\s*=>\s*key[\s\S]*?\}\)\s*\)\s*;/g;

let patched = 0;
let skipped_done = 0;
let skipped_nomatch = 0;

for (const file of candidates) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("react-i18next")) continue;
  if (src.includes('from "@/test/i18nMock"') || src.includes('"@/test/i18nMock"')) {
    skipped_done++;
    continue;
  }

  if (!PATTERN.test(src)) {
    PATTERN.lastIndex = 0;
    skipped_nomatch++;
    continue;
  }
  PATTERN.lastIndex = 0;

  const patched_src = src.replace(PATTERN, REPLACEMENT);
  fs.writeFileSync(file, patched_src, "utf8");
  console.log("patched:", path.relative(path.resolve(__dirname, ".."), file));
  patched++;
}

console.log(
  `\nPatched ${patched} file(s). Skipped: ${skipped_done} already on enMock, ${skipped_nomatch} no match.`,
);
