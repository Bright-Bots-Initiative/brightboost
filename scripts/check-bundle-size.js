import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// #816: preserve the enforced CI deployment-footprint budget. Compressed
// entry/route budgets are separate work (#908), not this directory-size gate.
const MAX_DIST_BYTES = 400 * 1024 * 1024;
const distPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : fileURLToPath(new URL("../dist", import.meta.url));

function directoryBytes(directory) {
  let bytes = 0;
  for (const entry of fs.readdirSync(directory)) {
    const target = path.join(directory, entry);
    const stat = fs.lstatSync(target);
    if (stat.isDirectory()) bytes += directoryBytes(target);
    else if (stat.isFile()) bytes += stat.size;
    else throw new Error(`Unsupported build entry: ${target}`);
  }
  return bytes;
}

try {
  if (process.argv.length > 3)
    throw new Error(
      "Usage: node scripts/check-bundle-size.js [build-directory]",
    );
  const bytes = directoryBytes(distPath);
  if (bytes === 0) {
    console.error(
      "BUNDLE_EMPTY: build directory contains no content; run npm run build first.",
    );
    process.exitCode = 1;
  } else if (bytes > MAX_DIST_BYTES) {
    console.error(
      `BUNDLE_TOO_LARGE: ${bytes} bytes exceeds ${MAX_DIST_BYTES} bytes (400 MiB).`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `BUNDLE_OK: ${bytes} bytes; limit ${MAX_DIST_BYTES} bytes (400 MiB).`,
    );
  }
} catch (error) {
  console.error(`BUNDLE_READ_ERROR: ${error.message}`);
  process.exitCode = 2;
}
