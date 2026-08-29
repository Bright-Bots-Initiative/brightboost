/**
 * Test-only child runner for the #815 mid-run proofs.
 *
 * Runs one sabotage guard in its own process with the expensive probe replaced
 * by a barrier: the moment the sabotage has been written, the runner emits a
 * JSON line on stdout (`fs.writeSync` — a blocking pipe write, so the parent has
 * it before we go any further) and then blocks until the parent releases it or
 * kills the process.
 *
 * The block is a synchronous child that waits on a socket, so nothing here
 * sleeps or polls: the parent's `connection` / stdout event is the barrier, and
 * writing a byte back is the release. That is what lets a test inspect the real
 * checkout WHILE the sabotage is live, and what lets it SIGKILL the guard at
 * exactly that point.
 *
 * usage: node guard-barrier-runner.mjs <type|storybook> <releasePort>
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

const guard = process.argv[2];
const port = Number(process.argv[3]);

const BLOCKER = `
const net = require("net");
const socket = net.connect(Number(process.argv[1]), "127.0.0.1");
socket.on("data", () => socket.end());
socket.on("close", () => process.exit(0));
socket.on("error", () => process.exit(0));
`;

/** @param {Record<string, unknown>} payload */
function emit(payload) {
  writeSync(1, `${JSON.stringify(payload)}\n`);
}

/** Emit, then block until the parent releases us (or kills us). */
function barrier(payload) {
  emit(payload);
  spawnSync(process.execPath, ["-e", BLOCKER, String(port)], {
    stdio: "ignore",
  });
}

/** Synthetic `tsc --listFiles` output: manifest files present, probe absent. */
function healthyListing() {
  const manifest = JSON.parse(
    readFileSync(
      path.join(repoRoot, "scripts/type-guard-manifest.json"),
      "utf8",
    ),
  );
  return manifest.guardFiles
    .map((rel) => `${repoRoot.replace(/\\/g, "/")}/${rel}`)
    .join("\n");
}

/** @param {number} count */
function syntheticProbe(count) {
  return {
    projectNotFound: false,
    warningPresent: false,
    count,
    parseError: false,
    browserMissing: false,
    stderr: "",
    stdout: "",
    outputFile: "",
    tmpDir: "",
  };
}

async function main() {
  if (guard === "type") {
    const mod = await import(
      pathToFileURL(
        path.join(repoRoot, "scripts/verify-type-program-membership.mjs"),
      ).href
    );
    const listing = healthyListing();
    const code = mod.runTypeProgramMembership({
      listFiles: (root) => {
        if (path.resolve(root) === path.resolve(repoRoot)) return listing;
        barrier({
          event: "sabotage-active",
          guard: "type",
          sandboxRoot: root,
          sandboxTarget: path.join(root, "src/test/__type_guard_sabotage__.ts"),
        });
        return listing;
      },
    });
    emit({ event: "done", code });
    process.exit(code);
  }

  if (guard === "storybook") {
    const mod = await import(
      pathToFileURL(
        path.join(repoRoot, "scripts/verify-storybook-empty-suite.mjs"),
      ).href
    );
    let calls = 0;
    const code = mod.runStorybookEmptySuiteGuard(
      {},
      {
        probe: (_env, cwd) => {
          calls += 1;
          if (calls === 1) return syntheticProbe(15);
          barrier({
            event: "sabotage-active",
            guard: "storybook",
            sandboxRoot: cwd,
            sandboxTarget: path.join(cwd, ".storybook/main.ts"),
          });
          return syntheticProbe(0);
        },
      },
    );
    emit({ event: "done", code });
    process.exit(code);
  }

  emit({ event: "usage-error", guard });
  process.exit(2);
}

main().catch((err) => {
  emit({
    event: "error",
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(2);
});
