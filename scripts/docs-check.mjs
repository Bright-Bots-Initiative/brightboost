#!/usr/bin/env node
/**
 * docs-check — root allowlist, links, deleted-path refs, canonical markers.
 * Exit 0 = clean, 1 = findings, 2 = internal / usage error.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..");

const ROOT_ALLOWLIST = new Set([
  "README.md",
  "CONTRIBUTING.md",
  "SETUP.md",
  "DEPLOYMENT.md",
  "SECURITY.md",
  "AGENTS.md",
  "CLAUDE.md",
  "LICENSE.md",
]);

/** Paths deleted by #753 Part E — referencing them is DC-003. */
const DELETED_PATHS = new Set([
  "COMPLETION_SUMMARY.md",
  "FRONTEND_INTEGRATION_SUMMARY.md",
  "PR_UPDATE.md",
  "compatibility-report.md",
  "README_LOCAL.md",
  "TECHNICAL_QUICKSTART.md",
  "DEPLOYMENT_RAILWAY.md",
  "docs/dev-workflow.md",
  "docs/deploy.md",
  "docs/deploy/PROD_LOGIN_405_FIX.md",
  "docs/ci-workflow-cleanup.md",
  "docs/perf-diagnosis.md",
  "docs/perf-fix-summary.md",
  "docs/performance-improvement.md",
  "docs/phase0-diagnosis.md",
  "docs/phase0-implementation-report.md",
  "docs/set-2-games-audit.md",
  "docs/set-2-games-implementation.md",
  "docs/set-2-polish-gap-analysis.md",
  "docs/set-2-polish-implementation.md",
  "docs/pathways-pre-send-audit.md",
  "docs/k2-set2-expansion.md",
  "docs/azure/monitoring.md",
  "docs/azure/app-service-scale-down.md",
  "docs/azure/dashboard-alerts.md",
  "docs/azure/deploy-monitoring.md",
  "docs/azure/static-webapp-optimizations.md",
  "docs/ops/bundle-shrink-plan.md",
  "docs/github-branch-protection-setup.md",
]);

/**
 * @typedef {{ code: string, path: string, message: string }} Finding
 */

function usageError(message) {
  process.stderr.write(`docs-check: ${message}\n`);
  process.exit(2);
}

function internalError(message) {
  process.stderr.write(`docs-check: ${message}\n`);
  process.exit(2);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ json: boolean, root: string | null }} */
  const opts = { json: false, root: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      opts.json = true;
    } else if (arg === "--fix") {
      usageError("--fix is not supported for docs-check");
    } else if (arg === "--root") {
      const value = argv[++i];
      if (!value || value.startsWith("-")) {
        usageError("--root requires a path argument");
      }
      opts.root = value;
    } else if (arg.startsWith("-")) {
      usageError(`unknown flag: ${arg}`);
    } else {
      usageError(`unexpected argument: ${arg}`);
    }
  }
  return opts;
}

/**
 * @param {string} filePath
 */
function readText(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

/**
 * @param {string} filePath
 */
function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} root
 * @param {string} rel
 */
function joinRoot(root, rel) {
  return path.join(root, ...rel.split("/"));
}

/**
 * @param {string} root
 * @param {string} dirRel
 * @param {(rel: string) => void} visit
 */
function walkMarkdown(root, dirRel, visit) {
  const dir = dirRel ? joinRoot(root, dirRel) : root;
  if (!exists(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === ".git" ||
      name === "dist" ||
      name === "coverage" ||
      name === "unity-build"
    ) {
      continue;
    }
    const full = path.join(dir, name);
    const rel = dirRel ? path.posix.join(dirRel, name) : name;
    let st;
    try {
      st = fs.statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walkMarkdown(root, rel.replace(/\\/g, "/"), visit);
    } else if (name.endsWith(".md") || name.endsWith(".mdc")) {
      visit(rel.replace(/\\/g, "/"));
    }
  }
}

/**
 * @param {string} fromRel
 * @param {string} target
 */
function resolveLink(fromRel, target) {
  const cleaned = target.replace(/\\/g, "/").split("#")[0];
  if (!cleaned) return null;
  const fromDir = path.posix.dirname(fromRel);
  if (cleaned.startsWith("/")) return cleaned.slice(1);
  if (cleaned.startsWith(".")) {
    return path.posix
      .normalize(path.posix.join(fromDir === "." ? "" : fromDir, cleaned))
      .replace(/^\.\//, "");
  }
  // bare relative — resolve against file dir first, also try as repo-root path
  const fromFile = path.posix
    .normalize(path.posix.join(fromDir === "." ? "" : fromDir, cleaned))
    .replace(/^\.\//, "");
  return fromFile;
}

/**
 * @param {string} root
 */
function runChecks(root) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Record<string, unknown>} */
  const inventory = { rootMarkdown: [], scanned: 0 };

  const add = (code, relPath, message) => {
    findings.push({ code, path: relPath, message });
  };

  for (const name of fs.readdirSync(root)) {
    const full = path.join(root, name);
    if (!fs.statSync(full).isFile()) continue;
    if (!name.endsWith(".md")) continue;
    /** @type {string[]} */ (inventory.rootMarkdown).push(name);
    if (!ROOT_ALLOWLIST.has(name)) {
      add(
        "DC-001",
        name,
        "Root markdown file is not on the allowlist; move under docs/ or remove",
      );
    }
  }

  /** @type {Map<string, string[]>} */
  const canonicalTopics = new Map();

  walkMarkdown(root, "", (rel) => {
    inventory.scanned = /** @type {number} */ (inventory.scanned) + 1;
    const text = readText(joinRoot(root, rel));

    const canonicalMatch =
      text.match(/\*\*Canonical for:\*\*\s*([^.|\n]+)/i) ||
      text.match(/Canonical for:\s*([^.|\n]+)/i);
    if (canonicalMatch) {
      const topic = canonicalMatch[1].trim().toLowerCase();
      if (!canonicalTopics.has(topic)) canonicalTopics.set(topic, []);
      canonicalTopics.get(topic).push(rel);
      if (!/Last verified/i.test(text)) {
        add("DC-004", rel, 'Canonical doc must include a "Last verified" line');
      }
    }

    const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
    let m;
    while ((m = linkRe.exec(text)) !== null) {
      const target = m[2].trim();
      if (
        !target ||
        target.startsWith("http") ||
        target.startsWith("#") ||
        target.startsWith("mailto:")
      ) {
        continue;
      }
      const cleaned = target.replace(/\\/g, "/").split("#")[0];
      if (!cleaned || cleaned.includes("*")) continue;

      const resolved = resolveLink(rel, cleaned);
      const candidates = new Set(
        [
          resolved,
          cleaned.replace(/^\.\//, ""),
          path.posix.basename(cleaned),
        ].filter(Boolean),
      );

      let isDeleted = false;
      for (const c of candidates) {
        if (DELETED_PATHS.has(c)) {
          add(
            "DC-003",
            rel,
            `References deleted path ${c}; update or remove the link`,
          );
          isDeleted = true;
          break;
        }
      }
      if (isDeleted) continue;

      const tryPaths = [resolved, cleaned.replace(/^\.\//, "")].filter(Boolean);
      const found = tryPaths.some((p) => exists(joinRoot(root, p)));
      if (!found) {
        add("DC-002", rel, `Broken relative link: ${target}`);
      }
    }
  });

  for (const [topic, paths] of canonicalTopics) {
    if (paths.length > 1) {
      for (const p of paths) {
        add(
          "DC-005",
          p,
          `Multiple docs claim Canonical for: ${topic} (${paths.join(", ")})`,
        );
      }
    }
  }

  return { findings, inventory };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = path.resolve(opts.root || DEFAULT_ROOT);
  if (!exists(root)) {
    process.stderr.write(`docs-check: --root does not exist: ${root}\n`);
    process.exit(2);
  }
  if (!fs.statSync(root).isDirectory()) {
    process.stderr.write(`docs-check: --root is not a directory: ${root}\n`);
    process.exit(2);
  }

  let result;
  try {
    result = runChecks(root);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    internalError(message);
    return;
  }

  const { findings, inventory } = result;
  const seen = new Set();
  const unique = [];
  for (const f of findings) {
    const key = `${f.code}|${f.path}|${f.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(f);
  }

  const ok = unique.length === 0;
  if (opts.json) {
    process.stdout.write(
      JSON.stringify({ ok, findings: unique, inventory }, null, 2) + "\n",
    );
  } else {
    process.stdout.write("docs-check inventory\n");
    process.stdout.write(
      `  root markdown: ${/** @type {string[]} */ (inventory.rootMarkdown).join(", ") || "(none)"}\n`,
    );
    process.stdout.write(`  scanned: ${inventory.scanned}\n`);
    if (unique.length === 0) {
      process.stdout.write("No findings.\n");
    } else {
      process.stdout.write(`Findings (${unique.length}):\n`);
      for (const f of unique) {
        process.stdout.write(`  ${f.code}  ${f.path}  ${f.message}\n`);
      }
    }
  }
  process.exit(ok ? 0 : 1);
}

main();
