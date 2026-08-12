/**
 * Core logic for verify-ci-step-presence.sh (W-11 / G-205).
 * Parses active workflow steps (YAML), not raw text — commented-out lines
 * must not count as present.
 *
 * Matching is job-scoped and exact per normalized run line (or exact uses:),
 * never a global substring search.
 *
 * Exit codes (process.exit when run as CLI):
 *   0 = healthy OK (+ sabotage OK when --sabotage-all)
 *   1 = property false
 *   2 = could not run
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export const EXIT_OK = 0;
export const EXIT_PROPERTY = 1;
export const EXIT_CANNOT_RUN = 2;

/**
 * Split a `run:` block into normalized command lines.
 * @param {string} runValue
 * @returns {string[]}
 */
export function normalizeRunLines(runValue) {
  return runValue
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));
}

/**
 * @param {Record<string, unknown>} step
 * @param {{ job: string, run?: string, uses?: string }} req
 */
export function stepSatisfies(step, req) {
  if (req.uses) {
    return (
      typeof step.uses === "string" && step.uses.trim() === req.uses.trim()
    );
  }
  if (typeof step.run !== "string") return false;
  return normalizeRunLines(step.run).includes(req.run.trim());
}

/**
 * @param {{ job: string, run?: string, uses?: string }} req
 */
export function reqLabel(req) {
  if (req.uses) return `${req.job} uses: ${req.uses}`;
  return `${req.job} run: ${req.run}`;
}

/**
 * @param {string} workflowText
 * @param {{ job: string, run?: string, uses?: string }[]} requiredSteps
 * @returns {{ ok: boolean, missing: string[], matches: { label: string, jobId: string, stepName: string }[] }}
 */
export function checkRequiredPresent(workflowText, requiredSteps) {
  let doc;
  try {
    doc = parseYaml(workflowText);
  } catch (err) {
    throw new Error(
      `YAML parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  if (!doc || typeof doc !== "object" || !("jobs" in doc)) {
    throw new Error("workflow YAML missing jobs");
  }
  const jobs = /** @type {Record<string, { steps?: unknown[] }>} */ (doc).jobs;
  if (!jobs || typeof jobs !== "object") {
    throw new Error("workflow YAML missing jobs");
  }

  /** @type {string[]} */
  const missing = [];
  /** @type {{ label: string, jobId: string, stepName: string }[]} */
  const matches = [];

  for (const req of requiredSteps) {
    const label = reqLabel(req);
    if (!(req.job in jobs)) {
      missing.push(label);
      continue;
    }
    const job = jobs[req.job];
    const steps = Array.isArray(job?.steps) ? job.steps : [];
    let hitName = null;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step || typeof step !== "object") continue;
      const s = /** @type {Record<string, unknown>} */ (step);
      if (stepSatisfies(s, req)) {
        hitName = typeof s.name === "string" ? s.name : `(step ${i})`;
        break;
      }
    }
    if (!hitName) {
      missing.push(label);
    } else {
      matches.push({ label, jobId: req.job, stepName: hitName });
    }
  }
  return { ok: missing.length === 0, missing, matches };
}

/**
 * Remove steps in req.job that satisfy req; return new YAML text.
 * @param {string} workflowText
 * @param {{ job: string, run?: string, uses?: string }} req
 * @returns {{ text: string, removedCount: number }}
 */
export function removeStepsMatching(workflowText, req) {
  const doc = parseYaml(workflowText);
  if (!doc || typeof doc !== "object" || !("jobs" in doc)) {
    return { text: workflowText, removedCount: 0 };
  }
  const jobs = /** @type {Record<string, { steps?: unknown[] }>} */ (doc).jobs;
  const job = jobs?.[req.job];
  if (!job || !Array.isArray(job.steps)) {
    return { text: stringifyYaml(doc), removedCount: 0 };
  }
  let removedCount = 0;
  job.steps = job.steps.filter((step) => {
    if (!step || typeof step !== "object") return true;
    const s = /** @type {Record<string, unknown>} */ (step);
    if (stepSatisfies(s, req)) {
      removedCount += 1;
      return false;
    }
    return true;
  });
  return { text: stringifyYaml(doc), removedCount };
}

/**
 * @param {string} manifestPath
 * @returns {{ job: string, run?: string, uses?: string }[]}
 */
export function loadRequiredSteps(manifestPath) {
  const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(raw.requiredSteps)) {
    throw new Error("manifest missing requiredSteps array");
  }
  return raw.requiredSteps.map((entry, i) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`requiredSteps[${i}] must be an object`);
    }
    const job = entry.job;
    if (typeof job !== "string" || !job.trim()) {
      throw new Error(`requiredSteps[${i}] missing job`);
    }
    const hasRun = typeof entry.run === "string";
    const hasUses = typeof entry.uses === "string";
    if (hasRun === hasUses) {
      throw new Error(
        `requiredSteps[${i}] must have exactly one of run or uses`,
      );
    }
    if (hasRun) {
      return { job: job.trim(), run: String(entry.run) };
    }
    return { job: job.trim(), uses: String(entry.uses) };
  });
}

function main(argv) {
  const mode = argv[0] || "check";
  const workflowPath = process.env.CI_STEP_PRESENCE_WORKFLOW;
  const manifestPath = process.env.CI_STEP_PRESENCE_MANIFEST;
  if (!workflowPath || !manifestPath) {
    console.error(
      "ERROR: CI_STEP_PRESENCE_WORKFLOW and CI_STEP_PRESENCE_MANIFEST required",
    );
    process.exit(EXIT_CANNOT_RUN);
  }

  let required;
  let workflowText;
  try {
    required = loadRequiredSteps(manifestPath);
    workflowText = readFileSync(workflowPath, "utf8");
  } catch (err) {
    console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(EXIT_CANNOT_RUN);
  }

  if (mode === "check") {
    let result;
    try {
      result = checkRequiredPresent(workflowText, required);
    } catch (err) {
      console.error(
        `ERROR: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(EXIT_CANNOT_RUN);
    }
    for (const m of result.matches) {
      console.log(
        `  present: ${m.label}  (job=${m.jobId} step="${m.stepName}")`,
      );
    }
    for (const miss of result.missing) {
      console.error(`[check] MISSING required step: ${miss}`);
    }
    process.exit(result.ok ? EXIT_OK : EXIT_PROPERTY);
  }

  if (mode === "sabotage-all") {
    // Phase-2 exhaustive: each entry removed in turn must make check fail.
    for (const req of required) {
      const label = reqLabel(req);
      const { text, removedCount } = removeStepsMatching(workflowText, req);
      if (removedCount === 0) {
        console.error(
          `FAIL: sabotage no-op — could not remove steps matching ${label}`,
        );
        process.exit(EXIT_CANNOT_RUN);
      }
      const tmp = path.join(
        tmpdir(),
        `ci-step-sabotage-${Date.now()}-${Math.random().toString(36).slice(2)}.yml`,
      );
      try {
        writeFileSync(tmp, text, "utf8");
        const result = checkRequiredPresent(text, required);
        if (result.ok) {
          console.error(
            `FAIL: after removing "${label}", check still passed — guard has no teeth`,
          );
          process.exit(EXIT_PROPERTY);
        }
        if (!result.missing.includes(label)) {
          console.error(
            `FAIL: after removing "${label}", missing list did not name it: ${result.missing.join(", ")}`,
          );
          process.exit(EXIT_PROPERTY);
        }
        console.log(`  sabotage OK: removed "${label}" → missing detected`);
      } finally {
        try {
          unlinkSync(tmp);
        } catch {
          /* ignore */
        }
      }
    }
    console.log(
      `PASS: exhaustive sabotage — ${required.length} manifest entries falsified`,
    );
    process.exit(EXIT_OK);
  }

  console.error(`ERROR: unknown mode ${mode}`);
  process.exit(EXIT_CANNOT_RUN);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv.slice(2));
}
