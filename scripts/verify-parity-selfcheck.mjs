/**
 * Two-phase proof that verify-parity fails when a step fails (§5.5.2).
 * Phase 1: run a known-green subset (CI-06 drift) and require exit 0.
 * Phase 2: --inject-fail that step and require non-zero.
 * Exit 1 = proof failed; exit 2 = could not run.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const parity = path.join(repoRoot, "scripts", "verify-parity.mjs");

function run(args) {
  return spawnSync(process.execPath, [parity, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

console.log(
  "[parity-selfcheck] Phase 1/2 — healthy subset (CI-06) expect exit 0…",
);
const healthy = run(["--only", "CI-06", "--skip-install"]);
process.stdout.write(healthy.stdout ?? "");
process.stderr.write(healthy.stderr ?? "");
if (healthy.status !== 0) {
  console.error(
    `FAIL: healthy phase exited ${healthy.status} (expected 0). Cannot prove sabotage causality.`,
  );
  process.exit(1);
}
console.log("[parity-selfcheck] Healthy phase GREEN.");

console.log(
  "[parity-selfcheck] Phase 2/2 — inject-fail CI-06 expect non-zero…",
);
const sabotaged = run([
  "--only",
  "CI-06",
  "--skip-install",
  "--inject-fail",
  "CI-06",
]);
process.stdout.write(sabotaged.stdout ?? "");
process.stderr.write(sabotaged.stderr ?? "");
if (sabotaged.status === 0) {
  console.error("FAIL: sabotaged phase exited 0 — parity runner has no teeth.");
  process.exit(1);
}

console.log("============================================================");
console.log("  PASS: parity selfcheck has teeth.");
console.log(`  Healthy:   exit=${healthy.status}`);
console.log(`  Sabotaged: exit=${sabotaged.status}`);
console.log("============================================================");
process.exit(0);
