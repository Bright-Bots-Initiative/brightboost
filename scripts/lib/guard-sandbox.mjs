/**
 * guard-sandbox.mjs — disposable sandbox roots for sabotage guards (#815).
 *
 * A guard that proves a check has teeth has to break something. It must never
 * break the caller's checkout. #801/#814 fixed `verify-ci-shell-gate.sh` that
 * way — build a disposable tree first, then serve the sabotage from it — and
 * this module is that pattern, shared by the Node guards.
 *
 * Structural, not restorative, on purpose: `finally`/trap restores cannot run
 * on SIGKILL (nor on the hard kill Vitest and CI issue at timeout), so
 * "write the checkout, then put it back" strands damage in the developer's
 * tree. Here the checkout is only ever read; if cleanup never runs the residue
 * is a temp directory the OS reclaims, never a dirty working tree.
 *
 * Two positive assertions, not assumptions:
 *   1. the sandbox root is disjoint from the repository root (neither contains
 *      the other) — checked at construction;
 *   2. every sabotage target resolves inside the sandbox — checked per target
 *      lexically AND by realpath, and refused if it would travel through one of
 *      the linked directories. A refusal throws SandboxEscapeError; callers
 *      turn that into a loud non-zero "could not run".
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

/** Could-not-run class: the sandbox itself is unusable. */
export class GuardSandboxError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = "GuardSandboxError";
  }
}

/** A sabotage target did not resolve inside the sandbox. Never write it. */
export class SandboxEscapeError extends GuardSandboxError {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = "SandboxEscapeError";
  }
}

/** Directory name used when the checkout is spaced but the temp base is not. */
export const SPACED_SEGMENT = "spaced path";

/**
 * True when `child` is at or below `parent` (both already absolute).
 * @param {string} parent
 * @param {string} child
 */
export function isInside(parent, child) {
  if (parent === child) return true;
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Directory exists (or may be created) and we can actually write in it.
 * Probing never leaves anything behind.
 * @param {string} dir
 * @param {{ create?: boolean }} [opts]
 * @returns {boolean}
 */
function isUsableDir(dir, { create = false } = {}) {
  try {
    if (create) mkdirSync(dir, { recursive: true });
    if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
    const probe = mkdtempSync(path.join(dir, ".bb-guard-probe-"));
    rmSync(probe, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Pick the directory the sandbox is created in.
 *
 * `matchPathSpace` exists for the Storybook guard: vitest.workspace.ts skips the
 * Storybook project when the *running* path contains a space (#707 /
 * storybookjs#29572). Relocating the probe into a temp tree whose space-ness
 * differs from the checkout would silently change which mode the guard runs in,
 * so the sandbox must agree with the checkout. When no matching base exists we
 * refuse (could-not-run) instead of quietly reporting a different mode's verdict.
 *
 * @param {{ repoRoot: string, matchPathSpace?: boolean, env?: NodeJS.ProcessEnv }} opts
 * @returns {{ base: string, spacedSegment: boolean }}
 */
export function resolveSandboxBase({
  repoRoot,
  matchPathSpace = false,
  env = process.env,
}) {
  const explicit = env.BB_GUARD_SANDBOX_BASE;
  if (explicit && explicit.trim()) {
    const base = explicit.trim();
    if (!isUsableDir(base, { create: true })) {
      throw new GuardSandboxError(
        `BB_GUARD_SANDBOX_BASE is not a usable directory: ${base}`,
      );
    }
    return { base, spacedSegment: false };
  }

  const tmp = os.tmpdir();
  const want = repoRoot.includes(" ");
  if (!matchPathSpace || tmp.includes(" ") === want) {
    return { base: tmp, spacedSegment: false };
  }
  if (want) {
    // Checkout is spaced, temp is not: add a spaced segment inside the sandbox.
    return { base: tmp, spacedSegment: true };
  }

  // Checkout is space-free, temp is not (e.g. a Windows profile with a space).
  // A space cannot be removed from os.tmpdir(); look for another base.
  const candidates = [
    env.RUNNER_TEMP,
    process.platform === "win32"
      ? path.join(env.SystemDrive || "C:", path.sep, "Temp")
      : "/tmp",
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = path.resolve(candidate);
    if (resolved.includes(" ")) continue;
    if (isUsableDir(resolved)) return { base: resolved, spacedSegment: false };
  }
  throw new GuardSandboxError(
    `no space-free temp directory is available (os.tmpdir()=${tmp} contains a space, ` +
      `the checkout does not). The Storybook Vitest project is registered per path ` +
      `space-ness (#707), so the sandbox has to match the checkout. Set ` +
      `BB_GUARD_SANDBOX_BASE to a writable, space-free directory and re-run.`,
  );
}

/**
 * @typedef {{
 *   root: string,
 *   base: string,
 *   linkDirs: string[],
 *   resolve: (rel: string) => string,
 *   dispose: () => void,
 * }} GuardSandbox
 */

/**
 * Build a disposable copy of the checkout.
 *
 * Large, read-only directories are LINKED (Windows junction / POSIX symlink)
 * instead of copied — `public/` alone is ~145 MB. Links are removed as links by
 * `dispose()`, never descended into, and `resolve()` refuses any target that
 * would travel through one.
 *
 * A file this misses surfaces as a loud failing phase in the calling guard, not
 * as a silent pass — the same trade-off `verify-ci-shell-gate.sh` documents.
 *
 * @param {{
 *   repoRoot: string,
 *   prefix?: string,
 *   copyDirs?: string[],
 *   linkDirs?: string[],
 *   copyRootFiles?: boolean,
 *   matchPathSpace?: boolean,
 *   env?: NodeJS.ProcessEnv,
 * }} opts
 * @returns {GuardSandbox}
 */
export function createGuardSandbox({
  repoRoot,
  prefix = "bb-guard-",
  copyDirs = ["src", "shared", ".storybook"],
  linkDirs = ["node_modules", "public"],
  copyRootFiles = true,
  matchPathSpace = false,
  env = process.env,
}) {
  const absRepoRoot = path.resolve(repoRoot);
  if (!existsSync(absRepoRoot)) {
    throw new GuardSandboxError(`repository root does not exist: ${repoRoot}`);
  }
  const { base, spacedSegment } = resolveSandboxBase({
    repoRoot: absRepoRoot,
    matchPathSpace,
    env,
  });

  const disposeRoot = mkdtempSync(path.join(base, prefix));
  const root = spacedSegment
    ? path.join(disposeRoot, SPACED_SEGMENT)
    : disposeRoot;
  if (spacedSegment) mkdirSync(root);

  // Assertion 1: the sandbox and the checkout must be disjoint trees. A sandbox
  // that resolved onto (or inside) the checkout would make every later
  // containment check pass while writing the caller's files.
  const realRepoRoot = realpathSync(absRepoRoot);
  const realRoot = realpathSync(root);
  if (isInside(realRoot, realRepoRoot) || isInside(realRepoRoot, realRoot)) {
    rmSync(disposeRoot, { recursive: true, force: true });
    throw new GuardSandboxError(
      `sandbox root ${realRoot} is not disjoint from the repository root ${realRepoRoot}`,
    );
  }

  for (const rel of copyDirs) {
    const from = path.join(absRepoRoot, rel);
    if (!existsSync(from)) continue;
    cpSync(from, path.join(root, rel), { recursive: true });
  }

  if (copyRootFiles) {
    for (const entry of readdirSync(absRepoRoot, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      cpSync(path.join(absRepoRoot, entry.name), path.join(root, entry.name));
    }
  }

  for (const rel of linkDirs) {
    const target = path.join(absRepoRoot, rel);
    if (!existsSync(target)) continue;
    // "junction" is Windows-only and ignored elsewhere; MSYS-style symlinks are
    // not followed by native node.exe, junctions are.
    symlinkSync(target, path.join(root, rel), "junction");
  }

  /**
   * Assertion 2: resolve a sabotage target inside this sandbox or refuse.
   * @param {string} rel
   * @returns {string}
   */
  function resolveTarget(rel) {
    if (typeof rel !== "string" || !rel.trim()) {
      throw new SandboxEscapeError(
        `sabotage target must be a non-empty relative path (got ${JSON.stringify(rel)})`,
      );
    }
    if (path.isAbsolute(rel)) {
      throw new SandboxEscapeError(
        `sabotage target must be relative to the sandbox, got absolute path: ${rel}`,
      );
    }
    const target = path.resolve(root, rel);
    const relFromRoot = path.relative(root, target);
    if (
      relFromRoot === "" ||
      relFromRoot.startsWith("..") ||
      path.isAbsolute(relFromRoot)
    ) {
      throw new SandboxEscapeError(
        `sabotage target ${rel} resolves outside the sandbox (${target} is not under ${root})`,
      );
    }
    const firstSegment = relFromRoot.split(/[\\/]/)[0];
    if (linkDirs.includes(firstSegment)) {
      throw new SandboxEscapeError(
        `sabotage target ${rel} would travel through the linked directory ${firstSegment}, ` +
          `which points back into the checkout`,
      );
    }
    // Physical containment: lexical checks alone cannot see a link planted
    // inside the sandbox.
    let probe = path.dirname(target);
    while (!existsSync(probe) && path.dirname(probe) !== probe) {
      probe = path.dirname(probe);
    }
    const realProbe = realpathSync(probe);
    if (!isInside(realRoot, realProbe)) {
      throw new SandboxEscapeError(
        `sabotage target ${rel} resolves through a link out of the sandbox (${realProbe} is not under ${realRoot})`,
      );
    }
    return target;
  }

  function dispose() {
    // Drop the links AS LINKS first (POSIX symlink → unlink, Windows junction →
    // rmdir), so the recursive delete below can never reach the checkout.
    const stubborn = [];
    for (const rel of linkDirs) {
      const link = path.join(root, rel);
      try {
        unlinkSync(link);
      } catch {
        try {
          rmdirSync(link);
        } catch {
          // fall through to the check below
        }
      }
      if (existsSync(link)) stubborn.push(link);
    }
    if (stubborn.length > 0) {
      // Node's recursive rm unlinks links rather than descending, but the cost
      // of being wrong here is the caller's node_modules/public. Refuse instead.
      throw new GuardSandboxError(
        `refusing to recursively delete ${root}: link(s) into the checkout are still ` +
          `present (${stubborn.join(", ")}). Remove the sandbox by hand.`,
      );
    }
    rmSync(disposeRoot, { recursive: true, force: true });
  }

  return {
    root,
    base,
    linkDirs: [...linkDirs],
    resolve: resolveTarget,
    dispose,
  };
}
