#!/usr/bin/env node
/**
 * Locate a real bash (Git Bash on Windows) and run a script with remaining args.
 * Avoids the Windows Store / WSL bash.exe shim that is often first on PATH.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/**
 * @returns {string | null}
 */
function findBash() {
  if (process.env.GIT_BASH && fs.existsSync(process.env.GIT_BASH)) {
    return process.env.GIT_BASH;
  }
  const candidates = [];
  if (process.env.PROGRAMFILES) {
    candidates.push(
      path.join(process.env.PROGRAMFILES, "Git", "bin", "bash.exe"),
      path.join(process.env.PROGRAMFILES, "Git", "usr", "bin", "bash.exe"),
    );
  }
  if (process.env["PROGRAMFILES(X86)"]) {
    candidates.push(
      path.join(process.env["PROGRAMFILES(X86)"], "Git", "bin", "bash.exe"),
    );
  }
  if (process.env.LOCALAPPDATA) {
    candidates.push(
      path.join(process.env.LOCALAPPDATA, "Programs", "Git", "bin", "bash.exe"),
    );
  }
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  const git = spawnSync("git", ["--exec-path"], { encoding: "utf8" });
  if (git.status === 0 && git.stdout) {
    const execPath = git.stdout.trim();
    const fromGit = path.resolve(execPath, "..", "..", "bin", "bash.exe");
    if (fs.existsSync(fromGit)) return fromGit;
    const fromGitUnix = path.resolve(execPath, "..", "..", "bin", "bash");
    if (fs.existsSync(fromGitUnix)) return fromGitUnix;
  }
  return process.platform === "win32" ? null : "bash";
}

const scriptArg = process.argv[2];
if (!scriptArg) {
  process.stderr.write("usage: run-bash.mjs <script> [args...]\n");
  process.exit(2);
}

const scriptPath = path.isAbsolute(scriptArg)
  ? scriptArg
  : path.join(root, scriptArg);
const bash = findBash();
if (!bash) {
  process.stderr.write(
    "run-bash: could not find Git Bash. Install Git for Windows or set GIT_BASH.\n",
  );
  process.exit(2);
}

const result = spawnSync(bash, [scriptPath, ...process.argv.slice(3)], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 2);
