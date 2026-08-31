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
 * Three positive assertions, not assumptions:
 *   1. the sandbox root is disjoint from the repository root (neither contains
 *      the other) — checked at construction;
 *   2. every sabotage target resolves inside the sandbox — checked per target
 *      lexically AND physically, component by component INCLUDING the final one,
 *      and refused if it would travel through one of the linked directories. A
 *      refusal throws SandboxEscapeError; callers turn that into a loud non-zero
 *      "could not run";
 *   3. only the root configuration files a guard actually names are copied in —
 *      never "every regular file in the root". A blanket copy pulls a linked
 *      worktree's `.git` (a regular `gitdir:` FILE pointing at the real
 *      repository — the repository-selection class of #787) and any untracked
 *      `.env*` / `.npmrc` credentials into a tree that is explicitly allowed to
 *      survive SIGKILL.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  rmdirSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
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
 * Root files no guard may ever copy, whatever its allowlist says.
 *
 * The allowlist alone already excludes these — this is the second lock, so the
 * rule survives a future caller who adds a name without thinking about it. If a
 * guard genuinely needs one of these, that is an owner decision, not a patch:
 * the sandbox can outlive the process (SIGKILL leaves it on disk by design) and
 * these are exactly the files that must not be duplicated when it does.
 *
 * @type {Array<{ test: RegExp, why: string }>}
 */
export const FORBIDDEN_ROOT_FILES = [
  {
    test: /^\.git$/,
    why: "in a linked worktree this is a regular `gitdir:` file pointing at the real repository (#787 repository-selection class)",
  },
  { test: /^\.env(\..+)?$/i, why: "environment/secret file" },
  {
    test: /^\.(npmrc|yarnrc|yarnrc\.yml|netrc|pypirc|dockercfg)$/i,
    why: "registry/credential file",
  },
  { test: /^_netrc$/i, why: "registry/credential file" },
  {
    test: /^(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/i,
    why: "lockfile — never needed to run a guard, and large",
  },
  {
    test: /(^id_(rsa|dsa|ecdsa|ed25519)|\.(pem|key|p12|pfx|keystore)$)/i,
    why: "private key material",
  },
];

/**
 * Validate one allowlisted root-file name. Returns the refusal reason, or null.
 * @param {string} name
 * @returns {string | null}
 */
export function rootFileRefusal(name) {
  if (typeof name !== "string" || !name.trim()) {
    return `root file entries must be non-empty strings (got ${JSON.stringify(name)})`;
  }
  if (name !== path.basename(name) || name === "." || name === "..") {
    return `root file entries must be bare file names in the repository root (got ${JSON.stringify(name)})`;
  }
  for (const { test, why } of FORBIDDEN_ROOT_FILES) {
    if (test.test(name)) {
      return `${name} is never copied into a guard sandbox: ${why}`;
    }
  }
  return null;
}

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
 * Human-readable file kind, for refusal messages.
 * @param {import("node:fs").Stats} st
 * @returns {string}
 */
function describeStat(st) {
  if (st.isSymbolicLink()) return "a symbolic link or reparse point";
  if (st.isDirectory()) return "a directory";
  if (st.isFile()) return "a regular file";
  if (st.isFIFO()) return "a FIFO";
  if (st.isSocket()) return "a socket";
  if (st.isBlockDevice()) return "a block device";
  if (st.isCharacterDevice()) return "a character device";
  return "not a regular file";
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
 *   rootFiles: string[],
 *   resolve: (rel: string) => string,
 *   write: (rel: string, contents: string) => string,
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
 * `location` picks WHERE, and the two options carry different — equally
 * positive — assertions:
 *
 *   "tmp"  (default) — outside the checkout entirely; asserted disjoint from the
 *            repository root. Right for a guard that only needs the copied files.
 *   "repo" — a dot-prefixed directory inside the checkout, asserted **ignored by
 *            git** (`git check-ignore`), so it can never alter `git status`,
 *            the index, or any tracked file. Needed when the sandboxed tool must
 *            resolve modules the way the checkout does: Vite serves files only
 *            from its workspace root, which it derives from the nearest
 *            `package.json` (`searchForWorkspaceRoot`). A /tmp sandbox therefore
 *            gets `fs.allow = [sandbox]` and the checkout's real `node_modules`
 *            is refused — measured on CI as
 *            `Failed to fetch dynamically imported module: …/node_modules/@storybook/
 *            experimental-addon-test/dist/vitest-plugin/setup-file.mjs`, with all
 *            story files failing to import and 0 tests collected.
 *
 * `rootFiles` is an explicit per-guard ALLOWLIST — there is deliberately no
 * "copy them all" switch. See the module header, assertion 3.
 *
 * @param {{
 *   repoRoot: string,
 *   prefix?: string,
 *   copyDirs?: string[],
 *   linkDirs?: string[],
 *   rootFiles?: string[],
 *   matchPathSpace?: boolean,
 *   location?: "tmp" | "repo",
 *   env?: NodeJS.ProcessEnv,
 * }} opts
 * @returns {GuardSandbox}
 */
export function createGuardSandbox({
  repoRoot,
  prefix = "bb-guard-",
  copyDirs = ["src", "shared", ".storybook"],
  linkDirs = ["node_modules", "public"],
  rootFiles = [],
  matchPathSpace = false,
  location = "tmp",
  env = process.env,
  ...rest
}) {
  // The retired blanket-copy options must fail loudly, not be quietly ignored:
  // a caller that still asks for them would otherwise get a sandbox with NO root
  // config at all and a confusing downstream error.
  for (const retired of ["copyRootFiles", "excludeRootFiles"]) {
    if (Object.hasOwn(rest, retired)) {
      throw new GuardSandboxError(
        `${retired} was removed: a guard sandbox copies only the root files it names in ` +
          `\`rootFiles\`. Blanket root copying pulled a linked worktree's \`.git\` and any ` +
          `untracked .env*/.npmrc into the sandbox.`,
      );
    }
  }
  const unknown = Object.keys(rest);
  if (unknown.length > 0) {
    throw new GuardSandboxError(
      `unknown createGuardSandbox option(s): ${unknown.join(", ")}`,
    );
  }

  const absRepoRoot = path.resolve(repoRoot);
  if (!existsSync(absRepoRoot)) {
    throw new GuardSandboxError(`repository root does not exist: ${repoRoot}`);
  }
  if (location === "repo" && !prefix.startsWith(".")) {
    throw new GuardSandboxError(
      `an in-repository sandbox prefix must start with "." (got ${JSON.stringify(prefix)})`,
    );
  }

  // Validate the allowlist BEFORE anything is created, so a bad entry cannot
  // leave a half-built sandbox behind — and so a guard can never run against a
  // partial tree whose missing config would make an empty result look like a
  // pass. Fail loudly on missing, non-regular and forbidden entries alike.
  if (!Array.isArray(rootFiles)) {
    throw new GuardSandboxError("rootFiles must be an array of file names");
  }
  for (const name of rootFiles) {
    const refusal = rootFileRefusal(name);
    if (refusal) throw new GuardSandboxError(refusal);
    const from = path.join(absRepoRoot, name);
    let st;
    try {
      st = lstatSync(from);
    } catch {
      throw new GuardSandboxError(
        `required root file is missing from the checkout: ${name} (${from}). ` +
          `A guard sandbox is never built partially — that is how an empty result ` +
          `becomes a false pass.`,
      );
    }
    if (!st.isFile()) {
      throw new GuardSandboxError(
        `required root file ${name} is not a regular file (${describeStat(st)}); ` +
          `refusing to copy it into the sandbox`,
      );
    }
  }

  const { base, spacedSegment } =
    location === "repo"
      ? // Nested in the checkout, so path space-ness matches by construction.
        { base: absRepoRoot, spacedSegment: false }
      : resolveSandboxBase({ repoRoot: absRepoRoot, matchPathSpace, env });

  const disposeRoot = mkdtempSync(path.join(base, prefix));
  const root = spacedSegment
    ? path.join(disposeRoot, SPACED_SEGMENT)
    : disposeRoot;
  if (spacedSegment) mkdirSync(root);

  const realRepoRoot = realpathSync(absRepoRoot);
  const realRoot = realpathSync(root);
  if (location === "repo") {
    // Assertion 1a: git must not be able to see it. This is the invariant #815
    // is actually about — status, the index and tracked files stay identical —
    // and it is checked, never assumed.
    const ignored = spawnSync("git", ["check-ignore", "-q", "--", realRoot], {
      cwd: absRepoRoot,
      windowsHide: true,
    });
    if (ignored.error || ignored.status !== 0) {
      rmSync(disposeRoot, { recursive: true, force: true });
      throw new GuardSandboxError(
        `in-repository sandbox ${realRoot} is not ignored by git ` +
          `(git check-ignore status=${ignored.status}${ignored.error ? `, ${ignored.error.message}` : ""}). ` +
          `Add the sandbox pattern to .gitignore before running this guard.`,
      );
    }
  } else if (
    // Assertion 1b: a /tmp sandbox that resolved onto (or inside) the checkout
    // would make every later containment check pass while writing the caller's
    // files.
    isInside(realRoot, realRepoRoot) ||
    isInside(realRepoRoot, realRoot)
  ) {
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

  // Allowlist only — validated above. `.git`, `.env*`, `.npmrc`, lockfiles and
  // every other unnamed root file (tracked or not) stay in the checkout.
  for (const name of rootFiles) {
    cpSync(path.join(absRepoRoot, name), path.join(root, name));
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
    // Physical containment, EVERY component including the last. Lexical checks
    // cannot see a link planted inside the sandbox, and stopping at
    // path.dirname(target) let a symlink AT THE TARGET pass: `cpSync` preserves
    // such a link from the caller, and the write then followed it out of the
    // sandbox. Walk down from the root and lstat (never stat: it follows) each
    // component in turn.
    const segments = relFromRoot.split(/[\\/]/).filter(Boolean);
    let deepestExisting = root;
    for (let i = 0; i < segments.length; i += 1) {
      const soFar = path.join(root, ...segments.slice(0, i + 1));
      const isFinal = i === segments.length - 1;
      let st;
      try {
        st = lstatSync(soFar);
      } catch (err) {
        if (err && err.code === "ENOENT") break; // created fresh by the caller
        throw new SandboxEscapeError(
          `cannot inspect ${soFar} while resolving sabotage target ${rel}: ${err?.message ?? err}`,
        );
      }
      // Symlinks, Windows junctions and every other reparse point land here:
      // node reports all of them as symbolic links to lstat.
      if (st.isSymbolicLink()) {
        throw new SandboxEscapeError(
          `sabotage target ${rel} passes through a ${isFinal ? "symlinked target" : "symlinked directory"} ` +
            `(${soFar}); a guard sandbox never follows links, whatever they point at`,
        );
      }
      if (isFinal) {
        if (!st.isFile()) {
          throw new SandboxEscapeError(
            `sabotage target ${rel} already exists and is not a regular file (${describeStat(st)}); refusing to write it`,
          );
        }
        if (typeof st.nlink === "number" && st.nlink > 1) {
          throw new SandboxEscapeError(
            `sabotage target ${rel} has ${st.nlink} hard links, so writing it would change a file outside the sandbox too`,
          );
        }
      } else if (!st.isDirectory()) {
        throw new SandboxEscapeError(
          `sabotage target ${rel} treats ${soFar} as a directory, but it is ${describeStat(st)}`,
        );
      }
      deepestExisting = soFar;
    }

    // Belt and braces: whatever the deepest existing component is — the target
    // itself when it exists, otherwise its nearest existing ancestor — its
    // realpath must still be inside the sandbox.
    const realProbe = realpathSync(deepestExisting);
    if (!isInside(realRoot, realProbe)) {
      throw new SandboxEscapeError(
        `sabotage target ${rel} resolves through a link out of the sandbox (${realProbe} is not under ${realRoot})`,
      );
    }
    return target;
  }

  /**
   * Write a sabotage file inside the sandbox, or refuse.
   *
   * The path is re-resolved (all of the checks above) immediately before the
   * write, and the write itself cannot follow a link: the old entry is removed
   * with `unlink`, which acts on the link and never on its referent, and the new
   * file is created with the `wx` flag (`O_CREAT|O_EXCL`), which the kernel
   * refuses to satisfy through a symbolic link.
   *
   * Scope of that guarantee, stated exactly: the FINAL component cannot be
   * followed out of the sandbox even if it is replaced after the check. The
   * ancestor directories are validated by `lstat` before the write and are not
   * re-validated atomically, so this is still check-then-act with respect to a
   * process that can rename a directory mid-run. The threat model is a stale or
   * accidental link in a developer's checkout — not a concurrent local attacker.
   *
   * @param {string} rel
   * @param {string} contents
   * @returns {string} the absolute path written
   */
  function writeInside(rel, contents) {
    const target = resolveTarget(rel);
    mkdirSync(path.dirname(target), { recursive: true });
    // unlink, not truncate: removes a link as a link, never through it.
    rmSync(target, { force: true });
    writeFileSync(target, contents, { encoding: "utf8", flag: "wx" });
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
    rootFiles: [...rootFiles],
    resolve: resolveTarget,
    write: writeInside,
    dispose,
  };
}
