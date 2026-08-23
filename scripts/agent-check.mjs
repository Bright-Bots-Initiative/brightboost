#!/usr/bin/env node
/**
 * agent-check — verify adapter / skill / rule graph under docs/agents.
 * Exit 0 = clean, 1 = findings, 2 = internal / usage error.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(__dirname, "..");

const BOOTSTRAP =
  "Before work, read `docs/agents/overview.md`, everything under `docs/agents/rules`, and `docs/agents/skills/overview.md`. Use task-specific skills from `docs/agents/skills/**/SKILL.md`.";

const FIXED_ADAPTERS = [
  "AGENTS.md",
  "CLAUDE.md",
  ".cursor/rules/agent-context.mdc",
];

const ALLOWLIST_PATH = path.join(__dirname, "agent-check.allowlist.json");

/**
 * @typedef {{ code: string, path: string, message: string }} Finding
 */

function usageError(message) {
  process.stderr.write(`agent-check: ${message}\n`);
  process.exit(2);
}

function internalError(message) {
  process.stderr.write(`agent-check: ${message}\n`);
  process.exit(2);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ fix: boolean, json: boolean, root: string | null }} */
  const opts = { fix: false, json: false, root: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--fix") {
      opts.fix = true;
    } else if (arg === "--json") {
      opts.json = true;
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
 * Minimal YAML frontmatter parser for .mdc / SKILL.md.
 * @param {string} text
 * @returns {{ attrs: Record<string, string | boolean | string[]>, body: string } | null}
 */
function parseFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---")) return null;
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) return null;
  const raw = normalized.slice(3, end).replace(/^\r?\n/, "");
  const body = normalized.slice(end + 4).replace(/^\r?\n/, "");
  /** @type {Record<string, string | boolean | string[]>} */
  const attrs = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2].trim();
    if (value === "true") attrs[key] = true;
    else if (value === "false") attrs[key] = false;
    else if (value.startsWith("[") && value.endsWith("]")) {
      attrs[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      attrs[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return { attrs, body };
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
 * @param {RegExp} fileRe
 */
function listFiles(root, dirRel, fileRe) {
  const dir = joinRoot(root, dirRel);
  if (!exists(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isFile() && fileRe.test(name)) {
      out.push(path.posix.join(dirRel, name));
    }
  }
  return out.sort();
}

/**
 * @param {string} root
 * @param {string} dirRel
 */
function listSkillDirs(root, dirRel) {
  const dir = joinRoot(root, dirRel);
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/**
 * @param {string} markdown
 * @param {string} fromRel
 */
function extractRelativeLinks(markdown, fromRel) {
  const links = [];
  const re = /\[([^\]]*)\]\(([^)]+)\)|`([^`]+)`/g;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    const target = (m[2] || m[3] || "").trim();
    if (!target || target.startsWith("http") || target.startsWith("#"))
      continue;
    if (target.includes("*")) continue;
    const cleaned = target.replace(/\\/g, "/").split("#")[0];
    if (!cleaned) continue;
    const fromDir = path.posix.dirname(fromRel);
    const resolved = cleaned.startsWith(".")
      ? path.posix.normalize(path.posix.join(fromDir, cleaned))
      : cleaned.replace(/^\.\//, "");
    links.push(resolved);
  }
  return links;
}

/**
 * @param {string} root
 */
function loadAllowlist(root) {
  const allowlistFile = exists(ALLOWLIST_PATH)
    ? ALLOWLIST_PATH
    : joinRoot(root, "scripts/agent-check.allowlist.json");
  if (!exists(allowlistFile)) {
    return { trackedEnvFiles: [] };
  }
  return JSON.parse(readText(allowlistFile));
}

/**
 * @param {string} root
 */
function gitTrackedFiles(root) {
  const result = spawnSync("git", ["-C", root, "ls-files"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * @param {string} root
 * @param {boolean} fix
 */
function runChecks(root, fix) {
  /** @type {Finding[]} */
  const findings = [];
  /** @type {Record<string, unknown>} */
  const inventory = {
    adapters: [],
    rules: [],
    skills: [],
    claudeStubs: [],
    julesStubs: [],
  };

  const add = (code, relPath, message) => {
    findings.push({ code, path: relPath, message });
  };

  // --- AC-004 agent.md ---
  const agentMd = "docs/agents/agent.md";
  if (!exists(joinRoot(root, agentMd))) {
    add(
      "AC-004",
      agentMd,
      "Create docs/agents/agent.md as the adapter router target",
    );
  }

  // --- Fixed adapters AC-001..003, AC-005, AC-006 ---
  for (const rel of FIXED_ADAPTERS) {
    const full = joinRoot(root, rel);
    if (!exists(full)) {
      add("AC-001", rel, `Create adapter ${rel}`);
      continue;
    }
    /** @type {string[]} */ (inventory.adapters).push(rel);
    const text = readText(full);
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    if (lines.length > 40) {
      add(
        "AC-003",
        rel,
        `Keep adapter under 40 lines (currently ${lines.length}); move body into docs/agents`,
      );
    }
    if (!text.includes("docs/agents/agent.md")) {
      add("AC-002", rel, "Reference docs/agents/agent.md from this adapter");
    } else if (!text.includes(BOOTSTRAP)) {
      add(
        "AC-002",
        rel,
        "Include the verbatim bootstrap instruction naming docs/agents/agent.md",
      );
    }

    if (rel.endsWith(".mdc")) {
      const fm = parseFrontmatter(text);
      if (
        !fm ||
        fm.attrs.alwaysApply !== true ||
        !fm.attrs.description ||
        !fm.attrs.globs
      ) {
        add(
          "AC-005",
          rel,
          "Frontmatter must include description, globs, and alwaysApply: true",
        );
      }
    }

    if (rel === "CLAUDE.md") {
      const hasBareImport = /^@docs\/agents\/agent\.md\s*$/m.test(text);
      const fencedImport =
        /```[\s\S]*?@docs\/agents\/agent\.md[\s\S]*?```/.test(text);
      if (!hasBareImport || fencedImport) {
        add(
          "AC-006",
          rel,
          "CLAUDE.md must contain a bare (unfenced) @docs/agents/agent.md import",
        );
      }
    }
  }

  // --- Rules AC-007 / AC-008 ---
  const ruleFiles = listFiles(root, "docs/agents/rules", /\.md$/);
  inventory.rules = ruleFiles;
  /** @type {Set<string>} */
  const referencedRules = new Set();
  const scanFiles = [
    agentMd,
    "docs/agents/overview.md",
    ...ruleFiles,
    "docs/agents/skills/overview.md",
  ];
  for (const rel of scanFiles) {
    const full = joinRoot(root, rel);
    if (!exists(full)) continue;
    for (const link of extractRelativeLinks(readText(full), rel)) {
      if (link.startsWith("docs/agents/rules/") && link.endsWith(".md")) {
        referencedRules.add(link);
        if (!exists(joinRoot(root, link))) {
          add("AC-007", rel, `Referenced rule missing: ${link}`);
        }
      }
    }
  }
  const agentsDocs = [];
  const agentsRoot = joinRoot(root, "docs/agents");
  if (exists(agentsRoot)) {
    const walk = (dir, relBase) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const rel = path.posix.join(relBase, name);
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full, rel);
        else if (name.endsWith(".md") || name.endsWith(".mdc"))
          agentsDocs.push(rel);
      }
    };
    walk(agentsRoot, "docs/agents");
  }
  // Orphan detection: referenced from non-rule docs only (not the rule file itself)
  let refCorpus = "";
  for (const rel of agentsDocs) {
    if (rel.startsWith("docs/agents/rules/")) continue;
    refCorpus += readText(joinRoot(root, rel)) + "\n";
  }
  for (const rule of ruleFiles) {
    const base = path.posix.basename(rule);
    if (!refCorpus.includes(base) && !referencedRules.has(rule)) {
      add(
        "AC-008",
        rule,
        "Orphan rule file — reference it from docs/agents or remove it",
      );
    }
  }

  // --- Skills AC-009..013, AC-017 ---
  const skillNames = listSkillDirs(root, "docs/agents/skills");
  inventory.skills = skillNames;
  const overviewRel = "docs/agents/skills/overview.md";
  const overviewFull = joinRoot(root, overviewRel);
  const overviewText = exists(overviewFull) ? readText(overviewFull) : "";
  /** @type {Set<string>} */
  const indexed = new Set();
  for (const m of overviewText.matchAll(/`([a-z0-9-]+)`/g)) {
    indexed.add(m[1]);
  }

  for (const name of skillNames) {
    const skillRel = `docs/agents/skills/${name}/SKILL.md`;
    const skillFull = joinRoot(root, skillRel);
    if (!exists(skillFull)) {
      add(
        "AC-009",
        `docs/agents/skills/${name}`,
        "Add SKILL.md to this skill directory",
      );
      continue;
    }
    const text = readText(skillFull);
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    if (lines.length > 500) {
      add(
        "AC-017",
        skillRel,
        `Keep SKILL.md under 500 lines (currently ${lines.length})`,
      );
    }
    const fm = parseFrontmatter(text);
    if (!fm || !fm.attrs.name || !fm.attrs.description) {
      add("AC-010", skillRel, "Frontmatter must include name and description");
    } else if (String(fm.attrs.name) !== name) {
      add(
        "AC-011",
        skillRel,
        `Frontmatter name must equal directory name "${name}"`,
      );
    }
    if (!indexed.has(name)) {
      add("AC-012", skillRel, `Add this skill to ${overviewRel}`);
    }
  }
  for (const name of indexed) {
    if (!skillNames.includes(name)) {
      add(
        "AC-013",
        overviewRel,
        `Index lists missing skill "${name}" — add docs/agents/skills/${name}/SKILL.md or remove the row`,
      );
    }
  }

  // --- Claude stubs AC-014 ---
  const claudeSkillDirs = listSkillDirs(root, ".claude/skills");
  inventory.claudeStubs = claudeSkillDirs;
  for (const name of claudeSkillDirs) {
    const stubRel = `.claude/skills/${name}/SKILL.md`;
    const stubFull = joinRoot(root, stubRel);
    if (!exists(stubFull)) {
      add("AC-009", `.claude/skills/${name}`, "Add SKILL.md stub");
      continue;
    }
    const canonicalRel = `docs/agents/skills/${name}/SKILL.md`;
    const canonicalFull = joinRoot(root, canonicalRel);
    if (!exists(canonicalFull)) continue;
    const stubFm = parseFrontmatter(readText(stubFull));
    const canFm = parseFrontmatter(readText(canonicalFull));
    if (
      !stubFm ||
      !canFm ||
      stubFm.attrs.name !== canFm.attrs.name ||
      stubFm.attrs.description !== canFm.attrs.description
    ) {
      add(
        "AC-014",
        stubRel,
        `Stub frontmatter drifted from ${canonicalRel}; run agent:check --fix`,
      );
    }
  }

  // --- Jules stubs AC-015 ---
  const julesFiles = listFiles(root, ".jules", /\.md$/);
  inventory.julesStubs = julesFiles;
  for (const rel of julesFiles) {
    const text = readText(joinRoot(root, rel));
    if (!/docs\/agents\/learned\//.test(text)) {
      add(
        "AC-015",
        rel,
        "Jules stub must point at docs/agents/learned/<topic>.md",
      );
    }
  }

  // --- Links AC-016 ---
  for (const rel of agentsDocs) {
    if (!rel.endsWith(".md")) continue;
    const text = readText(joinRoot(root, rel));
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
      const fromDir = path.posix.dirname(rel);
      const resolved = cleaned.startsWith("/")
        ? cleaned.slice(1)
        : path.posix.normalize(
            cleaned.startsWith(".")
              ? path.posix.join(fromDir, cleaned)
              : path.posix.join(fromDir, cleaned),
          );
      // Only check relative links that stay under docs/agents
      if (!resolved.startsWith("docs/agents/") && !cleaned.startsWith(".")) {
        // bare path from docs/agents file — resolve relative to file dir
      }
      const candidate = path.posix.normalize(
        cleaned.startsWith(".")
          ? path.posix.join(fromDir, cleaned)
          : cleaned.includes("/")
            ? cleaned.startsWith("docs/")
              ? cleaned
              : path.posix.join(fromDir, cleaned)
            : path.posix.join(fromDir, cleaned),
      );
      if (!exists(joinRoot(root, candidate))) {
        add("AC-016", rel, `Broken relative link: ${target}`);
      }
    }
  }

  // --- AC-018 tracked env files ---
  const allowlist = loadAllowlist(root);
  const tracked = gitTrackedFiles(root);
  if (tracked) {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    /** @type {Map<string, { issue: number, expires: string }>} */
    const allowed = new Map();
    for (const entry of allowlist.trackedEnvFiles || []) {
      const issueNum = Number(entry.issue);
      if (issueNum === 0) {
        add(
          "AC-018",
          entry.path || "scripts/agent-check.allowlist.json",
          "Allowlist issue must not be 000; use a real tracking issue (754)",
        );
        continue;
      }
      if (entry.expires && entry.expires < todayStr) {
        add(
          "AC-018",
          entry.path,
          `Allowlist entry expired on ${entry.expires}; extend expiry or untrack`,
        );
      }
      if (entry.path)
        allowed.set(String(entry.path).replace(/\\/g, "/"), entry);
    }
    for (const file of tracked) {
      const norm = file.replace(/\\/g, "/");
      const base = path.posix.basename(norm);
      if (!base.startsWith(".env")) continue;
      if (base.endsWith(".example")) continue;
      if (!allowed.has(norm)) {
        add(
          "AC-018",
          norm,
          "Tracked .env* file is not allowlisted; untrack or add under issue 754",
        );
      }
    }
  }

  // --- --fix: regenerate .claude skill stubs and .jules routers ---
  if (fix) {
    for (const name of skillNames) {
      const canonicalRel = `docs/agents/skills/${name}/SKILL.md`;
      const canonicalFull = joinRoot(root, canonicalRel);
      if (!exists(canonicalFull)) continue;
      const canFm = parseFrontmatter(readText(canonicalFull));
      if (!canFm) continue;
      const stubDir = joinRoot(root, `.claude/skills/${name}`);
      fs.mkdirSync(stubDir, { recursive: true });
      const stubRel = `.claude/skills/${name}/SKILL.md`;
      const content =
        `---\nname: ${canFm.attrs.name}\ndescription: ${canFm.attrs.description}\n---\n\n` +
        `Canonical: \`docs/agents/skills/${name}/SKILL.md\`\n`;
      fs.writeFileSync(joinRoot(root, stubRel), content, "utf8");
    }
    for (const rel of julesFiles) {
      const text = readText(joinRoot(root, rel));
      const m = text.match(/docs\/agents\/learned\/[A-Za-z0-9_.-]+\.md/);
      if (!m) continue;
      const content = `See \`${m[0]}\`.\n`;
      fs.writeFileSync(joinRoot(root, rel), content, "utf8");
    }
    for (let i = findings.length - 1; i >= 0; i--) {
      if (findings[i].code === "AC-014" || findings[i].code === "AC-015") {
        findings.splice(i, 1);
      }
    }
  }

  return { findings, inventory };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const root = path.resolve(opts.root || DEFAULT_ROOT);
  if (!exists(root)) {
    process.stderr.write(`agent-check: --root does not exist: ${root}\n`);
    process.exit(2);
  }
  const st = fs.statSync(root);
  if (!st.isDirectory()) {
    process.stderr.write(`agent-check: --root is not a directory: ${root}\n`);
    process.exit(2);
  }

  let result;
  try {
    result = runChecks(root, opts.fix);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    internalError(message);
    return;
  }

  const { findings, inventory } = result;
  const ok = findings.length === 0;

  if (opts.json) {
    process.stdout.write(
      JSON.stringify({ ok, findings, inventory }, null, 2) + "\n",
    );
  } else {
    process.stdout.write("agent-check inventory\n");
    process.stdout.write(
      `  adapters: ${/** @type {string[]} */ (inventory.adapters).join(", ") || "(none)"}\n`,
    );
    process.stdout.write(
      `  rules: ${/** @type {string[]} */ (inventory.rules).join(", ") || "(none)"}\n`,
    );
    process.stdout.write(
      `  skills: ${/** @type {string[]} */ (inventory.skills).join(", ") || "(none)"}\n`,
    );
    if (findings.length === 0) {
      process.stdout.write("No findings.\n");
    } else {
      process.stdout.write(`Findings (${findings.length}):\n`);
      for (const f of findings) {
        process.stdout.write(`  ${f.code}  ${f.path}  ${f.message}\n`);
      }
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
