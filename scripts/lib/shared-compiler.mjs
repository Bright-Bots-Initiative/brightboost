/** #720: canonical shared compiler and disjoint temporary output.
 * This is build tooling, not part of the framework-free simulation package.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

export function selectCompiler(root, explicitCompiler) {
  if (explicitCompiler) return fs.realpathSync(explicitCompiler);
  // Root wins: do not let whichever package was installed last choose emit.
  for (const packageFile of ["package.json", "backend/package.json"]) {
    try {
      return createRequire(path.join(root, packageFile)).resolve(
        "typescript/lib/tsc.js",
      );
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error(
    "GW_COMPILER_MISSING: install the repository dependencies first",
  );
}

export function assertPlainTree(root, allowMissing = false) {
  if (!fs.existsSync(root)) {
    // existsSync follows symlinks; lstat must still reject a dangling symlink.
    try {
      fs.lstatSync(root);
    } catch (error) {
      if (error.code === "ENOENT" && allowMissing) return;
      throw error;
    }
  }
  const stat = fs.lstatSync(root);
  if (stat.isSymbolicLink() || !stat.isDirectory())
    throw new Error(`GW_UNSAFE_DIRECTORY: ${root}`);
  for (const entry of fs.readdirSync(root)) {
    const file = path.join(root, entry),
      st = fs.lstatSync(file);
    if (st.isSymbolicLink()) throw new Error(`GW_UNSAFE_LINK: ${file}`);
    if (st.isDirectory()) assertPlainTree(file);
    else if (!st.isFile() || st.nlink !== 1)
      throw new Error(`GW_UNSAFE_FILE: ${file}`);
  }
}

export function listFiles(root) {
  const files = [];
  function walk(dir, relative = "") {
    for (const entry of fs.readdirSync(dir).sort()) {
      const name = relative ? `${relative}/${entry}` : entry;
      const target = path.join(dir, entry),
        st = fs.lstatSync(target);
      if (st.isSymbolicLink()) throw new Error(`GW_UNSAFE_LINK: ${target}`);
      if (st.isDirectory()) walk(target, name);
      else if (st.isFile() && st.nlink === 1) files.push(name);
      else throw new Error(`GW_UNSAFE_FILE: ${target}`);
    }
  }
  walk(root);
  return files;
}

export function freshCompilation(root, options = {}) {
  root = fs.realpathSync(root);
  const shared = path.join(root, "shared");
  if (fs.lstatSync(shared).isSymbolicLink())
    throw new Error("GW_UNSAFE_SHARED_LINK");
  const compiler = selectCompiler(root, options.compiler);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "bb-engine-720-"));
  // Guard against unusual TMPDIR settings putting a sabotage tree in the checkout.
  const relative = path.relative(root, fs.realpathSync(temp));
  if (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  ) {
    fs.rmdirSync(temp);
    throw new Error("GW_TEMP_NOT_DISJOINT");
  }
  const output = path.join(temp, "dist");
  try {
    const result = spawnSync(
      process.execPath,
      [
        compiler,
        "-p",
        path.join(shared, "tsconfig.json"),
        "--outDir",
        output,
        "--pretty",
        "false",
        "--incremental",
        "false",
      ],
      {
        cwd: root,
        encoding: "utf8",
        timeout: 90000,
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    if (result.error || result.status !== 0) {
      throw new Error(
        `GW_COMPILE_FAILED: ${result.error?.message ?? result.stdout + result.stderr}`,
      );
    }
    assertPlainTree(output);
    const files = listFiles(output);
    if (
      !files.includes("greatwork-engine/index.js") ||
      !files.includes("greatwork-engine/index.d.ts")
    ) {
      throw new Error("GW_ENGINE_EMIT_MISSING");
    }
    return {
      output,
      files,
      compiler,
      cleanup: () => fs.rmSync(temp, { recursive: true, force: true }),
    };
  } catch (error) {
    fs.rmSync(temp, { recursive: true, force: true });
    throw error;
  }
}
