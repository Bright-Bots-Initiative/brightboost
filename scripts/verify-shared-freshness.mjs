/** #720: read-only exact emitted-file comparison. Never repairs before checking. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import {
  assertPlainTree,
  freshCompilation,
  listFiles,
} from "./lib/shared-compiler.mjs";

export function verifySharedFreshness(root, options = {}) {
  root = fs.realpathSync(root);
  const output = path.join(root, "shared", "dist");
  assertPlainTree(output, true);
  if (!fs.existsSync(output))
    return { ok: false, findings: ["missing:shared/dist"] };
  const fresh = freshCompilation(root, options);
  try {
    const disk = listFiles(output),
      actual = new Set(disk),
      expected = new Set(fresh.files),
      findings = [];
    for (const file of fresh.files) {
      if (!actual.has(file)) findings.push(`missing:${file}`);
      else if (
        !fs
          .readFileSync(path.join(output, file))
          .equals(fs.readFileSync(path.join(fresh.output, file)))
      )
        findings.push(`stale:${file}`);
    }
    for (const file of disk)
      if (!expected.has(file)) findings.push(`extra:${file}`);
    let backend = "not-installed";
    const requireBackend = createRequire(
      path.join(root, "backend/dist/src/freshness-check.cjs"),
    );
    let installedPackage;
    try {
      installedPackage = requireBackend.resolve(
        "@brightboost/greatwork-engine/package.json",
      );
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
    }
    if (!installedPackage) {
      if (options.requireBackend)
        findings.push("backend:package-not-installed");
    } else {
      backend = "checked";
      const installedDist = path.join(path.dirname(installedPackage), "dist");
      assertPlainTree(installedDist, true);
      if (!fs.existsSync(installedDist)) findings.push("backend:missing-dist");
      else {
        const installed = new Set(listFiles(installedDist));
        for (const file of fresh.files) {
          if (!installed.has(file)) findings.push(`backend:missing:${file}`);
          else if (
            !fs
              .readFileSync(path.join(installedDist, file))
              .equals(fs.readFileSync(path.join(fresh.output, file)))
          )
            findings.push(`backend:stale:${file}`);
        }
        for (const file of installed)
          if (!expected.has(file)) findings.push(`backend:extra:${file}`);
        try {
          const entry = fs.realpathSync(
            requireBackend.resolve("@brightboost/greatwork-engine"),
          );
          if (
            entry !==
            fs.realpathSync(
              path.join(installedDist, "greatwork-engine/index.js"),
            )
          )
            findings.push("backend:wrong-entry-point");
        } catch {
          findings.push("backend:unresolved-entry-point");
        }
      }
    }
    return {
      ok: findings.length === 0,
      files: fresh.files.length,
      backend,
      findings,
    };
  } finally {
    fresh.cleanup();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 2) {
    console.error("Usage: node scripts/verify-shared-freshness.mjs");
    process.exitCode = 2;
  } else {
    try {
      const root = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
      );
      const verdict = verifySharedFreshness(root, {
        requireBackend:
          path.resolve(process.cwd()) === path.join(root, "backend"),
      });
      console.log(JSON.stringify(verdict));
      if (!verdict.ok) {
        console.error(
          "Shared emit does not match source. Run npm run build:shared, then retry.",
        );
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(error.message);
      process.exitCode = 2;
    }
  }
}
