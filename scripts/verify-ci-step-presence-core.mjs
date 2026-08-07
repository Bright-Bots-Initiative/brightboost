/**
 * Core logic for verify-ci-step-presence.sh (W-11 / G-205).
 * Parses active workflow steps (YAML), not raw text — commented-out lines
 * must not count as present.
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
 * @param {unknown} doc
 * @returns {{ jobId: string, stepIndex: number, name: string, values: string[] }[]}
 */
export function collectActiveStepCommands(doc) {
  /** @type {{ jobId: string, stepIndex: number, name: string, values: string[] }[]} */
  const out = [];
  if (!doc || typeof doc !== "object" || !("jobs" in doc)) return out;
  const jobs = /** @type {Record<string, unknown>} */ (doc).jobs;
  if (!jobs || typeof jobs !== "object") return out;

  for (const [jobId, job] of Object.entries(jobs)) {
    if (!job || typeof job !== "object") continue;
    const steps = /** @type {{ steps?: unknown }} */ (job).steps;
    if (!Array.isArray(steps)) continue;
    steps.forEach((step, stepIndex) => {
      if (!step || typeof step !== "object") return;
      const s = /** @type {Record<string, unknown>} */ (step);
      /** @type {string[]} */
      const values = [];
      if (typeof s.run === "string") values.push(s.run);
      if (typeof s.uses === "string") values.push(s.uses);
      if (values.length === 0) return;
      out.push({
        jobId,
        stepIndex,
        name: typeof s.name === "string" ? s.name : `(step ${stepIndex})`,
        values,
      });
    });
  }
  return out;
}

/**
 * @param {string} workflowText
 * @param {string[]} requiredSubstrings
 * @returns {{ ok: boolean, missing: string[], matches: { substring: string, jobId: string, stepName: string }[] }}
 */
export function checkRequiredPresent(workflowText, requiredSubstrings) {
  let doc;
  try {
    doc = parseYaml(workflowText);
  } catch (err) {
    throw new Error(
      `YAML parse failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  const active = collectActiveStepCommands(doc);
  /** @type {string[]} */
  const missing = [];
  /** @type {{ substring: string, jobId: string, stepName: string }[]} */
  const matches = [];

  for (const substring of requiredSubstrings) {
    const hit = active.find((step) =>
      step.values.some((v) => v.includes(substring)),
    );
    if (!hit) {
      missing.push(substring);
    } else {
      matches.push({
        substring,
        jobId: hit.jobId,
        stepName: hit.name,
      });
    }
  }
  return { ok: missing.length === 0, missing, matches };
}

/**
 * Remove every step whose run/uses contains substring; return new YAML text.
 * (A substring may appear in more than one job/step — e.g. frontend + backend
 * `npm run typecheck` — so sabotage must clear all matches.)
 * @param {string} workflowText
 * @param {string} substring
 * @returns {{ text: string, removed: boolean }}
 */
export function removeStepContaining(workflowText, substring) {
  const doc = parseYaml(workflowText);
  if (!doc || typeof doc !== "object" || !("jobs" in doc)) {
    return { text: workflowText, removed: false };
  }
  const jobs = /** @type {Record<string, { steps?: unknown[] }>} */ (doc).jobs;
  let removed = false;
  for (const job of Object.values(jobs || {})) {
    if (!job || !Array.isArray(job.steps)) continue;
    const next = job.steps.filter((step) => {
      if (!step || typeof step !== "object") return true;
      const s = /** @type {Record<string, unknown>} */ (step);
      const run = typeof s.run === "string" ? s.run : "";
      const uses = typeof s.uses === "string" ? s.uses : "";
      const hit = run.includes(substring) || uses.includes(substring);
      if (hit) removed = true;
      return !hit;
    });
    job.steps = next;
  }
  return { text: stringifyYaml(doc), removed };
}

/**
 * @param {string} manifestPath
 * @returns {string[]}
 */
export function loadRequiredSubstrings(manifestPath) {
  const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!Array.isArray(raw.requiredSubstrings)) {
    throw new Error("manifest missing requiredSubstrings array");
  }
  return raw.requiredSubstrings.map(String);
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
    required = loadRequiredSubstrings(manifestPath);
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
        `  present: ${m.substring}  (job=${m.jobId} step="${m.stepName}")`,
      );
    }
    for (const miss of result.missing) {
      console.error(`[check] MISSING required step substring: ${miss}`);
    }
    process.exit(result.ok ? EXIT_OK : EXIT_PROPERTY);
  }

  if (mode === "sabotage-all") {
    // Phase-2 exhaustive: each entry removed in turn must make check fail.
    for (const substring of required) {
      const { text, removed } = removeStepContaining(workflowText, substring);
      if (!removed) {
        console.error(
          `FAIL: could not remove step containing ${substring} from parsed workflow`,
        );
        process.exit(EXIT_PROPERTY);
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
            `FAIL: after removing "${substring}", check still passed — guard has no teeth`,
          );
          process.exit(EXIT_PROPERTY);
        }
        if (!result.missing.includes(substring)) {
          console.error(
            `FAIL: after removing "${substring}", missing list did not name it: ${result.missing.join(", ")}`,
          );
          process.exit(EXIT_PROPERTY);
        }
        console.log(`  sabotage OK: removed "${substring}" → missing detected`);
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
