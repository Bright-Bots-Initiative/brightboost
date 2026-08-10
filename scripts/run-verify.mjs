#!/usr/bin/env node
/**
 * Locate a real bash (Git Bash on Windows) and run scripts/verify.sh.
 * Avoids the Windows Store / WSL `bash.exe` shim that is first on PATH.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const script = path.join(root, "scripts", "verify.sh");

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
  // Prefer `git` install dir over PATH bash (PATH may be the WSL shim).
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

const bash = findBash();
if (!bash) {
  process.stderr.write(
    "verify: could not find Git Bash. Install Git for Windows or set GIT_BASH.\n",
  );
  process.exit(2);
}

const result = spawnSync(bash, [script], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 2);
