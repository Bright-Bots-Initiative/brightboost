#!/usr/bin/env node
/**
 * Adds the missing initReactI18next + I18nextProvider stubs to test files
 * that aggressively mock react-i18next. The component code calls
 * `i18n.use(initReactI18next)` somewhere in its chain — if the mock
 * returns nothing for `initReactI18next`, the entire test file fails to
 * load with "No 'initReactI18next' export is defined on the
 * 'react-i18next' mock."
 *
 * This patch is idempotent: it inserts the stubs only if the file mocks
 * react-i18next and doesn't already mention initReactI18next.
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
const files = candidates.filter((f) =>
  fs.readFileSync(f, "utf8").includes('vi.mock("react-i18next"'),
);

let patched = 0;
let skipped = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");

  if (src.includes("initReactI18next")) {
    skipped++;
    continue;
  }

  // Match `vi.mock("react-i18next", ...)` with either:
  //   - sync factory: `vi.mock("...", () => ({ useTranslation: ... }))`
  //   - async factory: `vi.mock("...", async () => { ... return { useTranslation: ... }; })`
  //
  // We insert the stubs INSIDE the returned object. Strategy: find the
  // first `useTranslation:` inside the mock and prepend our stubs before
  // it. Lossless and safe — the stub object literal lines stay grouped
  // with the existing mock.
  const mockStart = src.indexOf('vi.mock("react-i18next"');
  if (mockStart < 0) {
    skipped++;
    continue;
  }
  const useTranslationKey = src.indexOf("useTranslation", mockStart);
  if (useTranslationKey < 0) {
    skipped++;
    continue;
  }

  // Find the start of the line containing useTranslation
  const lineStart = src.lastIndexOf("\n", useTranslationKey) + 1;
  const indentMatch = src.slice(lineStart, useTranslationKey).match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : "    ";

  const stub =
    `${indent}// Stubs required because the component chain calls\n` +
    `${indent}// \`.use(initReactI18next)\` somewhere; vitest needs every\n` +
    `${indent}// referenced export present on the mock or the whole file\n` +
    `${indent}// fails to load.\n` +
    `${indent}initReactI18next: { type: "3rdParty" as const, init: () => {} },\n` +
    `${indent}I18nextProvider: ({ children }: { children: React.ReactNode }) => children,\n` +
    `${indent}Trans: ({ children }: { children: React.ReactNode }) => children,\n`;

  const patched_src = src.slice(0, lineStart) + stub + src.slice(lineStart);
  fs.writeFileSync(file, patched_src, "utf8");
  console.log("patched:", path.relative(path.resolve(__dirname, ".."), file));
  patched++;
}

console.log(`\nPatched ${patched} file(s). Skipped ${skipped} (already had stubs).`);
