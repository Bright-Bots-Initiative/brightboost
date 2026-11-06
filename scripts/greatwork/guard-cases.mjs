/** Healthy/red checks use synthetic files in disjoint OS temporary directories.
 * No mutation is ever applied to the developer checkout or its shared/dist.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { buildShared } from "../build-shared.mjs";
import { verifySharedFreshness } from "../verify-shared-freshness.mjs";
import { selectCompiler } from "../lib/shared-compiler.mjs";

export function guardCases(root, explicitCompiler) {
  const compiler = selectCompiler(root, explicitCompiler);
  const definition = [
    [
      "healthy exact JS and declarations pass",
      ({ directory }) => {
        const v = verifySharedFreshness(directory, { compiler });
        assert.equal(v.ok, true);
        assert.equal(v.files, 4);
      },
    ],
    [
      "changed source with restored mtime is rejected",
      ({ directory, source }) => {
        const stat = fs.statSync(source);
        fs.appendFileSync(source, "\nexport const later = 2;\n");
        fs.utimesSync(source, stat.atime, stat.mtime);
        assert.equal(verifySharedFreshness(directory, { compiler }).ok, false);
      },
    ],
    [
      "changed emitted JS is rejected without repair",
      ({ directory, emitted }) => {
        fs.appendFileSync(emitted, "\n// corrupted\n");
        const before = fs.readFileSync(emitted);
        const v = verifySharedFreshness(directory, { compiler });
        assert.ok(v.findings.includes("stale:greatwork-engine/index.js"));
        assert.deepEqual(fs.readFileSync(emitted), before);
      },
    ],
    [
      "missing declaration fails",
      ({ directory, declaration }) => {
        fs.unlinkSync(declaration);
        assert.ok(
          verifySharedFreshness(directory, { compiler }).findings.includes(
            "missing:greatwork-engine/index.d.ts",
          ),
        );
      },
    ],
    [
      "changed declaration fails",
      ({ directory, declaration }) => {
        fs.appendFileSync(
          declaration,
          "\nexport declare const old: boolean;\n",
        );
        assert.equal(verifySharedFreshness(directory, { compiler }).ok, false);
      },
    ],
    [
      "orphan output from deleted source fails",
      ({ directory }) => {
        fs.unlinkSync(path.join(directory, "shared/greatwork-engine/types.ts"));
        assert.ok(
          verifySharedFreshness(directory, { compiler }).findings.includes(
            "extra:greatwork-engine/types.js",
          ),
        );
      },
    ],
    [
      "extra emitted file fails",
      ({ directory }) => {
        fs.writeFileSync(
          path.join(directory, "shared/dist/unexpected.js"),
          'throw new Error("old");',
        );
        assert.ok(
          verifySharedFreshness(directory, { compiler }).findings.includes(
            "extra:unexpected.js",
          ),
        );
      },
    ],
    [
      "absent shared/dist fails",
      ({ directory }) => {
        fs.rmSync(path.join(directory, "shared/dist"), { recursive: true });
        assert.equal(verifySharedFreshness(directory, { compiler }).ok, false);
      },
    ],
    [
      "compile error never counts as parity",
      ({ directory, source }) => {
        fs.appendFileSync(source, '\nconst bad: number = "no";');
        assert.throws(
          () => verifySharedFreshness(directory, { compiler }),
          /GW_COMPILE_FAILED/,
        );
      },
    ],
    [
      "failed build preserves previous emitted bytes",
      ({ directory, source, emitted }) => {
        const before = fs.readFileSync(emitted);
        fs.appendFileSync(source, '\nconst bad: number = "no";');
        assert.throws(
          () => buildShared(directory, { compiler }),
          /GW_COMPILE_FAILED/,
        );
        assert.deepEqual(fs.readFileSync(emitted), before);
      },
    ],
    [
      "explicit rebuild repairs stale emit then passes",
      ({ directory, source }) => {
        fs.appendFileSync(source, "\nexport const revised = 3;");
        assert.equal(verifySharedFreshness(directory, { compiler }).ok, false);
        buildShared(directory, { compiler });
        assert.equal(verifySharedFreshness(directory, { compiler }).ok, true);
      },
    ],
    [
      "type-only change is detected through declarations",
      ({ directory }) => {
        fs.writeFileSync(
          path.join(directory, "shared/greatwork-engine/types.ts"),
          "export interface Example { value: string; }\n",
        );
        assert.ok(
          verifySharedFreshness(directory, { compiler }).findings.includes(
            "stale:greatwork-engine/types.d.ts",
          ),
        );
      },
    ],
    [
      "timestamp-only difference does not create a false failure",
      ({ directory, emitted }) => {
        fs.utimesSync(emitted, new Date(0), new Date(0));
        assert.equal(verifySharedFreshness(directory, { compiler }).ok, true);
      },
    ],
    [
      "empty output fails rather than reporting zero comparisons",
      ({ directory }) => {
        fs.rmSync(path.join(directory, "shared/dist"), { recursive: true });
        fs.mkdirSync(path.join(directory, "shared/dist"));
        const v = verifySharedFreshness(directory, { compiler });
        assert.equal(v.ok, false);
        assert.equal(v.findings.length, 4);
      },
    ],
    [
      "compiler resolution prefers root over backend",
      ({ directory }) => {
        for (const rel of [
          "node_modules/typescript/lib",
          "backend/node_modules/typescript/lib",
        ]) {
          fs.mkdirSync(path.join(directory, rel), { recursive: true });
          fs.writeFileSync(path.join(directory, rel, "tsc.js"), "");
        }
        fs.writeFileSync(path.join(directory, "backend/package.json"), "{}");
        assert.equal(
          selectCompiler(directory),
          path.join(directory, "node_modules/typescript/lib/tsc.js"),
        );
      },
    ],
    [
      "CLI returns failure for stale code before any backend launch",
      ({ directory, source }) => {
        installTooling(directory);
        fs.appendFileSync(source, "\nexport const oldEmit = 4;");
        const cp = spawnSync(
          process.execPath,
          ["scripts/verify-shared-freshness.mjs"],
          { cwd: directory, encoding: "utf8" },
        );
        assert.equal(cp.status, 1);
        assert.match(cp.stdout, /stale:/);
      },
    ],
    [
      "CLI fails closed on invalid arguments",
      ({ directory }) => {
        installTooling(directory);
        assert.equal(
          spawnSync(
            process.execPath,
            ["scripts/verify-shared-freshness.mjs", "--skip"],
            { cwd: directory },
          ).status,
          2,
        );
      },
    ],
    [
      "actual npm root pretest stops stale emit before tests run",
      ({ directory, source }) => {
        lifecycle(directory, source, false);
      },
    ],
    [
      "actual npm backend predev stops stale emit before server entry",
      ({ directory, source }) => {
        lifecycle(directory, source, true);
      },
    ],
    [
      "backend package copy is compared, not assumed to be a symlink",
      ({ directory }) => {
        const installed = installBackendCopy(directory);
        assert.equal(
          verifySharedFreshness(directory, { compiler, requireBackend: true })
            .ok,
          true,
        );
        fs.appendFileSync(
          path.join(installed, "dist/greatwork-engine/index.js"),
          "\n// old copy",
        );
        const v = verifySharedFreshness(directory, {
          compiler,
          requireBackend: true,
        });
        assert.ok(
          v.findings.includes("backend:stale:greatwork-engine/index.js"),
        );
      },
    ],
    [
      "backend package declaration drift is rejected",
      ({ directory }) => {
        const installed = installBackendCopy(directory);
        fs.appendFileSync(
          path.join(installed, "dist/greatwork-engine/index.d.ts"),
          "\nexport declare const old: boolean;",
        );
        assert.ok(
          verifySharedFreshness(directory, {
            compiler,
            requireBackend: true,
          }).findings.includes("backend:stale:greatwork-engine/index.d.ts"),
        );
      },
    ],
    [
      "backend package main cannot point at another file",
      ({ directory }) => {
        const installed = installBackendCopy(directory);
        fs.writeFileSync(
          path.join(installed, "package.json"),
          JSON.stringify({
            name: "@brightboost/greatwork-engine",
            main: "dist/greatwork-engine/types.js",
          }),
        );
        assert.ok(
          verifySharedFreshness(directory, {
            compiler,
            requireBackend: true,
          }).findings.includes("backend:wrong-entry-point"),
        );
      },
    ],
    [
      "backend launches require an installed package",
      ({ directory }) => {
        assert.ok(
          verifySharedFreshness(directory, {
            compiler,
            requireBackend: true,
          }).findings.includes("backend:package-not-installed"),
        );
      },
    ],
    [
      "symlink output is rejected while its target is unchanged",
      ({ directory, emitted }) => {
        const sentinel = path.join(directory, "external-sentinel.js");
        fs.writeFileSync(sentinel, "unchanged");
        fs.unlinkSync(emitted);
        fs.symlinkSync(sentinel, emitted);
        assert.throws(
          () => verifySharedFreshness(directory, { compiler }),
          /GW_UNSAFE_LINK/,
        );
        assert.equal(fs.readFileSync(sentinel, "utf8"), "unchanged");
      },
    ],
    [
      "symlink dist directory is refused by build and verification",
      ({ directory }) => {
        const destination = path.join(directory, "shared/dist"),
          external = path.join(directory, "elsewhere");
        fs.mkdirSync(external);
        fs.writeFileSync(path.join(external, "sentinel"), "unchanged");
        fs.rmSync(destination, { recursive: true });
        fs.symlinkSync(
          external,
          destination,
          process.platform === "win32" ? "junction" : "dir",
        );
        assert.throws(
          () => verifySharedFreshness(directory, { compiler }),
          /GW_UNSAFE_DIRECTORY/,
        );
        assert.throws(
          () => buildShared(directory, { compiler }),
          /GW_UNSAFE_DIRECTORY/,
        );
        assert.equal(
          fs.readFileSync(path.join(external, "sentinel"), "utf8"),
          "unchanged",
        );
      },
    ],
  ];
  function installBackendCopy(directory) {
    const installed = path.join(
      directory,
      "backend/node_modules/@brightboost/greatwork-engine",
    );
    fs.mkdirSync(installed, { recursive: true });
    fs.copyFileSync(
      path.join(directory, "shared/package.json"),
      path.join(installed, "package.json"),
    );
    fs.cpSync(
      path.join(directory, "shared/dist"),
      path.join(installed, "dist"),
      { recursive: true },
    );
    return installed;
  }
  function installTooling(directory) {
    fs.writeFileSync(
      path.join(directory, "package.json"),
      JSON.stringify({ type: "module" }),
    );
    for (const rel of [
      "scripts/build-shared.mjs",
      "scripts/verify-shared-freshness.mjs",
      "scripts/lib/shared-compiler.mjs",
    ]) {
      const dest = path.join(directory, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(path.join(root, rel), dest);
    }
    fs.mkdirSync(path.join(directory, "node_modules"), { recursive: true });
    fs.symlinkSync(
      path.resolve(compiler, "../.."),
      path.join(directory, "node_modules/typescript"),
      process.platform === "win32" ? "junction" : "dir",
    );
    fs.mkdirSync(path.join(directory, "backend/node_modules/@brightboost"), {
      recursive: true,
    });
    fs.symlinkSync(
      path.join(directory, "shared"),
      path.join(
        directory,
        "backend/node_modules/@brightboost/greatwork-engine",
      ),
      process.platform === "win32" ? "junction" : "dir",
    );
  }
  function lifecycle(directory, source, backend) {
    installTooling(directory);
    const cwd = backend ? path.join(directory, "backend") : directory;
    fs.mkdirSync(cwd, { recursive: true });
    const scripts = JSON.parse(
      fs.readFileSync(
        path.join(root, backend ? "backend/package.json" : "package.json"),
      ),
    ).scripts;
    const command = backend ? "dev" : "test",
      hook = backend ? "predev" : "pretest";
    assert.equal(typeof scripts[hook], "string");
    assert.equal(typeof scripts["verify:shared"], "string");
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({
        type: "module",
        scripts: {
          [hook]: scripts[hook],
          "verify:shared": scripts["verify:shared"],
          [command]: "node marker.cjs",
        },
      }),
    );
    fs.writeFileSync(
      path.join(cwd, "marker.cjs"),
      `require('node:fs').writeFileSync('started', 'yes');`,
    );
    const npm = [
      process.env.npm_execpath,
      path.resolve(
        path.dirname(process.execPath),
        "../lib/node_modules/npm/bin/npm-cli.js",
      ),
      path.resolve(
        path.dirname(process.execPath),
        "node_modules/npm/bin/npm-cli.js",
      ),
    ].find((p) => p && fs.existsSync(p));
    assert.ok(npm, "npm CLI is needed for lifecycle verification");
    fs.appendFileSync(source, "\nexport const changed = 5;");
    const red = spawnSync(process.execPath, [npm, "run", command], {
      cwd,
      encoding: "utf8",
    });
    assert.notEqual(red.status, 0);
    assert.match(red.stdout + red.stderr, /stale:/);
    assert.equal(fs.existsSync(path.join(cwd, "started")), false);
    buildShared(directory, { compiler });
    const green = spawnSync(process.execPath, [npm, "run", command], {
      cwd,
      encoding: "utf8",
    });
    assert.equal(green.status, 0, green.stdout + green.stderr);
    assert.equal(fs.readFileSync(path.join(cwd, "started"), "utf8"), "yes");
  }
  return definition.map(([name, check]) => ({
    name,
    run() {
      const directory = fs.mkdtempSync(
        path.join(os.tmpdir(), "bb-720-guard-case-"),
      );
      try {
        assert.ok(
          path.relative(root, directory).startsWith("..") ||
            path.isAbsolute(path.relative(root, directory)),
        );
        fs.writeFileSync(path.join(directory, "package.json"), "{}");
        fs.mkdirSync(path.join(directory, "shared/greatwork-engine"), {
          recursive: true,
        });
        fs.writeFileSync(
          path.join(directory, "shared/tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              target: "ES2019",
              module: "commonjs",
              lib: ["ES2019"],
              types: [],
              strict: true,
              declaration: true,
              rootDir: ".",
              outDir: "dist",
            },
            include: ["greatwork-engine/**/*.ts"],
          }),
        );
        fs.writeFileSync(
          path.join(directory, "shared/package.json"),
          JSON.stringify({
            name: "@brightboost/greatwork-engine",
            main: "dist/greatwork-engine/index.js",
            types: "dist/greatwork-engine/index.d.ts",
          }),
        );
        const source = path.join(directory, "shared/greatwork-engine/index.ts");
        fs.writeFileSync(source, "export const value = 1;\n");
        fs.writeFileSync(
          path.join(directory, "shared/greatwork-engine/types.ts"),
          "export interface Example { value: number; }\n",
        );
        buildShared(directory, { compiler });
        check({
          directory,
          source,
          emitted: path.join(
            directory,
            "shared/dist/greatwork-engine/index.js",
          ),
          declaration: path.join(
            directory,
            "shared/dist/greatwork-engine/index.d.ts",
          ),
        });
      } finally {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    },
  }));
}
