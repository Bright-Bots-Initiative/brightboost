/**
 * verify-type-program-membership.mjs — Prove type-level guards are inside the
 * root tsc program (W-12 / G-008 / §5.8).
 *
 * Phase 1 (healthy): `tsc --noEmit --listFiles` must list every manifest path.
 * Phase 2 (sabotage): treat an excluded-path file as a required guard; require
 *   non-zero naming the file and the excluding pattern.
 *
 * Exit 0 = both phases OK.
 * Exit 1 = property false.
 * Exit 2 = could not run.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(__dirname, "type-guard-manifest.json");

const EXIT_PROPERTY = 1;
const EXIT_CANNOT_RUN = 2;

function failCannotRun(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(EXIT_CANNOT_RUN);
}

function failProperty(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(EXIT_PROPERTY);
}

if (!existsSync(MANIFEST)) {
  failCannotRun(`missing manifest ${MANIFEST}`);
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const guardFiles = manifest.guardFiles;
if (!Array.isArray(guardFiles) || guardFiles.length === 0) {
  failCannotRun("type-guard-manifest.json has no guardFiles");
}

function listFiles() {
  const tscJs = path.join(REPO_ROOT, "node_modules/typescript/bin/tsc");
  const result = spawnSync(
    process.execPath,
    [tscJs, "--noEmit", "--listFiles"],
    {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: process.env,
    },
  );
  const out = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (!out.trim()) {
    failCannotRun(
      `tsc --listFiles produced no output (status=${result.status})`,
    );
  }
  return out.replace(/\\/g, "/");
}

function normalizeRel(rel) {
  return rel.replace(/\\/g, "/");
}

function isListed(listOutput, rel) {
  return listOutput.includes(normalizeRel(rel));
}

function assertPresent(listOutput, files, label) {
  const missing = [];
  for (const rel of files) {
    if (!isListed(listOutput, rel)) missing.push(rel);
  }
  return missing;
}

console.log(
  "[verify-type-program-membership] Phase 1/2 — healthy manifest files (expect present)…",
);
const list = listFiles();
const healthyMissing = assertPresent(list, guardFiles, "healthy");
if (healthyMissing.length > 0) {
  failProperty(
    `guard file(s) absent from tsc program: ${healthyMissing.join(", ")} (check tsconfig include/exclude)`,
  );
}
for (const rel of guardFiles) {
  console.log(`  present: ${rel}`);
}
console.log("[verify-type-program-membership] Healthy phase PASS.");

// Sabotage: create a file under an excluded path and require it to be reported absent.
const excludingPattern = "src/test (root tsconfig.json exclude)";
const sabotageRel = "src/test/__type_guard_sabotage__.ts";
const sabotageAbs = path.join(REPO_ROOT, sabotageRel);
mkdirSync(path.dirname(sabotageAbs), { recursive: true });
writeFileSync(
  sabotageAbs,
  "// intentional excluded-path probe for verify-type-program-membership\nexport {};\n",
);

try {
  console.log(
    "[verify-type-program-membership] Phase 2/2 — excluded-path guard (expect ABSENT / non-zero)…",
  );
  const list2 = listFiles();
  if (isListed(list2, sabotageRel)) {
    failProperty(
      `excluded guard unexpectedly present in tsc program: ${sabotageRel}`,
    );
  }
  // Property under test: a guard placed where tsconfig excludes it is detected absent.
  console.error(
    `ABSENT (expected): ${sabotageRel} — excluding pattern: ${excludingPattern}`,
  );
  console.log("============================================================");
  console.log("  PASS: type-program membership guard has teeth.");
  console.log("  Healthy:   manifest files present in tsc --listFiles");
  console.log(`  Sabotage:  ${sabotageRel} absent (${excludingPattern})`);
  console.log("============================================================");
} finally {
  rmSync(sabotageAbs, { force: true });
}

process.exit(0);
