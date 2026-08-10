#!/usr/bin/env node
/**
 * Locate Git Bash and run scripts/verify.sh (Windows-safe).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(__dirname, "run-bash.mjs");
const script = path.join(__dirname, "verify.sh");
const result = spawnSync(process.execPath, [runner, script], {
  cwd: path.resolve(__dirname, ".."),
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 2);
