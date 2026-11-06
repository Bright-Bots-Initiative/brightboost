/** #720: build with the same compiler as the freshness checker. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertPlainTree, freshCompilation } from "./lib/shared-compiler.mjs";

export function buildShared(root, options = {}) {
  root = fs.realpathSync(root);
  const destination = path.join(root, "shared", "dist");
  assertPlainTree(destination, true);
  const fresh = freshCompilation(root, options);
  try {
    // Only generated shared/dist is replaced, and only AFTER successful compilation.
    // A hard kill during copy leaves an incomplete emit that the read-only guard rejects.
    fs.rmSync(destination, { recursive: true, force: true });
    fs.cpSync(fresh.output, destination, {
      recursive: true,
      errorOnExist: true,
    });
    return { ok: true, files: fresh.files.length };
  } finally {
    fresh.cleanup();
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length !== 2) {
    console.error("Usage: node scripts/build-shared.mjs");
    process.exitCode = 2;
  } else {
    try {
      console.log(
        JSON.stringify(
          buildShared(
            path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
          ),
        ),
      );
    } catch (error) {
      console.error(error.message);
      process.exitCode = 2;
    }
  }
}
