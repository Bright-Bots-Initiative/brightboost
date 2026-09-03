#!/usr/bin/env node
/**
 * railway-promote — binding exact-SHA promotion to a Railway environment
 * (BRAND_R0). Runs inside `.github/workflows/deploy-promote.yml` under the
 * GitHub environment whose protection rules gate the Railway credential.
 *
 * Inputs (environment variables; values are never printed):
 *   RAILWAY_TOKEN                 project token (header Project-Access-Token) or
 *                                 account/team token (Bearer) — see RAILWAY_TOKEN_TYPE
 *   RAILWAY_TOKEN_TYPE            "project" (default) | "account"
 *   RAILWAY_PROJECT_ID            target project
 *   CANONICAL_RAILWAY_PROJECT_ID  the one project allowed to serve production/staging
 *   RAILWAY_ENVIRONMENT_ID        target environment
 *   RAILWAY_SERVICE_ID_BACKEND    backend service id
 *   RAILWAY_SERVICE_ID_FRONTEND   frontend service id
 *   TARGET_ENV                    staging | production
 *   COMMIT_SHA                    exact 40-hex commit to deploy
 *   PUBLIC_URL                    public base URL to verify after deploy
 *   ORIGIN_FRONTEND_URL           optional origin URL (Railway domain) to verify too
 *   ORIGIN_BACKEND_URL            optional backend origin (its /health) to verify
 *   EXPECT_ANALYTICS              enabled | disabled — explicit expectation
 *   STAGING_PUBLIC_URL            production only: staging is re-proven at COMMIT_SHA first
 *   GITHUB_TOKEN / GITHUB_REPOSITORY / GITHUB_ACTOR  for the required-checks readback
 *   REQUIRED_CHECKS               comma list, default build-and-test,db-check,e2e-flows
 *   DEPLOY_TIMEOUT_MINUTES        default 25
 *   PROMOTE_SUMMARY_PATH          where to write the JSON record (default promote-summary.json)
 *
 * Exit 0 = deployed and strictly verified; 1 = a validation, deployment, or
 * verification property failed; 2 = usage / credential / internal error.
 *
 * Proof: scripts/__tests__/railway-promote.test.ts (pure validators, healthy
 * then sabotage). Live runs are recorded in docs/brand-refresh/release-0/evidence-register.md.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { checkDeployTarget, FINDING_CODES } from "./verify-deploy-target.mjs";

export const RAILWAY_ENDPOINT = "https://backboard.railway.com/graphql/v2";
export const DEFAULT_REQUIRED_CHECKS = [
  "build-and-test",
  "db-check",
  "e2e-flows",
];
export const SEED_FLAGS = ["RUN_SEED", "SEED_ALLOW_PRODUCTION", "SEED_RESET"];
export const TARGET_ENVS = ["staging", "production"];
export const SUCCESS_STATES = new Set(["SUCCESS"]);
export const FAILURE_STATES = new Set([
  "FAILED",
  "CRASHED",
  "REMOVED",
  "SKIPPED",
  "CANCELLED",
  "NEEDS_APPROVAL",
]);

export class UsageError extends Error {}
export class PromotionError extends Error {}

const SHA40 = /^[0-9a-f]{40}$/;

function clean(v) {
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : null;
}

/**
 * Pure: validate the inputs. Returns { ok, errors, config }. Never echoes
 * secret values; the token is only checked for presence.
 */
export function validateInputs(env) {
  const errors = [];
  const cfg = {
    tokenPresent: Boolean(clean(env.RAILWAY_TOKEN)),
    tokenType: clean(env.RAILWAY_TOKEN_TYPE) ?? "project",
    projectId: clean(env.RAILWAY_PROJECT_ID),
    canonicalProjectId: clean(env.CANONICAL_RAILWAY_PROJECT_ID),
    environmentId: clean(env.RAILWAY_ENVIRONMENT_ID),
    backendServiceId: clean(env.RAILWAY_SERVICE_ID_BACKEND),
    frontendServiceId: clean(env.RAILWAY_SERVICE_ID_FRONTEND),
    targetEnv: clean(env.TARGET_ENV)?.toLowerCase() ?? null,
    commitSha: clean(env.COMMIT_SHA)?.toLowerCase() ?? null,
    publicUrl: clean(env.PUBLIC_URL),
    originFrontendUrl: clean(env.ORIGIN_FRONTEND_URL),
    originBackendUrl: clean(env.ORIGIN_BACKEND_URL),
    expectAnalytics: clean(env.EXPECT_ANALYTICS)?.toLowerCase() ?? null,
    stagingPublicUrl: clean(env.STAGING_PUBLIC_URL),
    requiredChecks: (
      clean(env.REQUIRED_CHECKS) ?? DEFAULT_REQUIRED_CHECKS.join(",")
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    timeoutMinutes: Number(clean(env.DEPLOY_TIMEOUT_MINUTES) ?? 25),
    repo: clean(env.GITHUB_REPOSITORY),
    githubTokenPresent: Boolean(clean(env.GITHUB_TOKEN)),
    actor: clean(env.GITHUB_ACTOR),
  };
  if (!cfg.tokenPresent)
    errors.push(
      "RAILWAY_TOKEN is not available (environment secret missing or job not approved)",
    );
  if (!["project", "account"].includes(cfg.tokenType))
    errors.push("RAILWAY_TOKEN_TYPE must be project or account");
  if (!cfg.projectId) errors.push("RAILWAY_PROJECT_ID missing");
  if (!cfg.canonicalProjectId)
    errors.push("CANONICAL_RAILWAY_PROJECT_ID missing");
  if (
    cfg.projectId &&
    cfg.canonicalProjectId &&
    cfg.projectId !== cfg.canonicalProjectId
  ) {
    errors.push(
      `RAILWAY_PROJECT_ID is not the canonical production project (wrong Railway project)`,
    );
  }
  if (!cfg.environmentId) errors.push("RAILWAY_ENVIRONMENT_ID missing");
  if (!cfg.backendServiceId) errors.push("RAILWAY_SERVICE_ID_BACKEND missing");
  if (!cfg.frontendServiceId)
    errors.push("RAILWAY_SERVICE_ID_FRONTEND missing");
  if (!TARGET_ENVS.includes(cfg.targetEnv))
    errors.push(`TARGET_ENV must be one of ${TARGET_ENVS.join(", ")}`);
  if (!cfg.commitSha || !SHA40.test(cfg.commitSha))
    errors.push("COMMIT_SHA must be an exact 40-character hex SHA");
  if (!cfg.publicUrl) errors.push("PUBLIC_URL missing");
  if (!["enabled", "disabled"].includes(cfg.expectAnalytics))
    errors.push("EXPECT_ANALYTICS must be enabled or disabled");
  if (cfg.targetEnv === "production" && !cfg.stagingPublicUrl)
    errors.push(
      "STAGING_PUBLIC_URL is required for a production promotion (staging re-proof)",
    );
  if (!cfg.repo) errors.push("GITHUB_REPOSITORY missing");
  if (!cfg.githubTokenPresent) errors.push("GITHUB_TOKEN missing");
  if (!Number.isFinite(cfg.timeoutMinutes) || cfg.timeoutMinutes <= 0)
    errors.push("DEPLOY_TIMEOUT_MINUTES must be a positive number");
  return { ok: errors.length === 0, errors, config: cfg };
}

/** Pure: every required check must have a completed run with conclusion success. */
export function evaluateChecks(checkRuns, required) {
  const latest = new Map();
  for (const run of checkRuns ?? []) {
    const prev = latest.get(run.name);
    if (
      !prev ||
      String(run.completed_at ?? "") > String(prev.completed_at ?? "")
    )
      latest.set(run.name, run);
  }
  const missing = [];
  const failed = [];
  for (const name of required) {
    const run = latest.get(name);
    if (!run) missing.push(name);
    else if (run.status !== "completed" || run.conclusion !== "success")
      failed.push(`${name}=${run.conclusion ?? run.status}`);
  }
  return { ok: missing.length === 0 && failed.length === 0, missing, failed };
}

/** Pure: names of production seed flags present among the variable names. */
export function seedFlagsRequested(variableNames) {
  return (variableNames ?? []).filter((n) => SEED_FLAGS.includes(n));
}

/** Pure: Railway deployment status → pending | success | failure. */
export function classifyDeploymentStatus(status) {
  if (SUCCESS_STATES.has(status)) return "success";
  if (FAILURE_STATES.has(status)) return "failure";
  return "pending";
}

/** Pure: the Railway environment's name must classify as the target. */
export function environmentMatchesTarget(environmentName, targetEnv) {
  const name = String(environmentName ?? "")
    .trim()
    .toLowerCase();
  if (targetEnv === "production") return name === "production";
  if (targetEnv === "staging") return name.includes("staging");
  return false;
}

/** Pure: both deployments must carry the requested SHA. */
export function deploymentsConsistent(deployments, expectedSha) {
  const wrong = deployments.filter(
    (d) => String(d.sha ?? "").toLowerCase() !== expectedSha,
  );
  return {
    ok: wrong.length === 0,
    wrong: wrong.map((d) => `${d.service}:${d.sha ?? "unknown"}`),
  };
}

// ── Live adapters ───────────────────────────────────────────────────────────

function railwayHeaders(env) {
  const token = env.RAILWAY_TOKEN;
  const type = clean(env.RAILWAY_TOKEN_TYPE) ?? "project";
  return type === "account"
    ? { "content-type": "application/json", authorization: `Bearer ${token}` }
    : { "content-type": "application/json", "Project-Access-Token": token };
}

async function railwayGql(env, query, variables) {
  const res = await fetch(RAILWAY_ENDPOINT, {
    method: "POST",
    headers: railwayHeaders(env),
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.errors) {
    const msg = json.errors
      ? json.errors.map((e) => e.message).join("; ")
      : `HTTP ${res.status}`;
    throw new PromotionError(`Railway API: ${msg}`);
  }
  return json.data;
}

async function githubCheckRuns(env, cfg) {
  const res = await fetch(
    `https://api.github.com/repos/${cfg.repo}/commits/${cfg.commitSha}/check-runs?per_page=100`,
    {
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "user-agent": "brightboost-railway-promote",
      },
    },
  );
  if (!res.ok)
    throw new PromotionError(
      `GitHub check-runs readback failed: HTTP ${res.status}`,
    );
  const json = await res.json();
  return json.check_runs ?? [];
}

function gitShaOnMain(sha) {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], {
      stdio: "ignore",
    });
  } catch {
    return { exists: false, onMain: false };
  }
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", sha, "origin/main"], {
      stdio: "ignore",
    });
    return { exists: true, onMain: true };
  } catch {
    return { exists: true, onMain: false };
  }
}

async function variableNames(env, cfg, serviceId) {
  const data = await railwayGql(
    env,
    `query($projectId: String!, $environmentId: String!, $serviceId: String!) {
       variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
     }`,
    { projectId: cfg.projectId, environmentId: cfg.environmentId, serviceId },
  );
  return Object.keys(data.variables ?? {});
}

async function environmentName(env, cfg) {
  const data = await railwayGql(
    env,
    `query($id: String!) { environment(id: $id) { id name projectId } }`,
    { id: cfg.environmentId },
  );
  return data.environment;
}

async function deployExact(env, cfg, serviceId) {
  const data = await railwayGql(
    env,
    `mutation($commitSha: String!, $environmentId: String!, $serviceId: String!) {
       serviceInstanceDeployV2(commitSha: $commitSha, environmentId: $environmentId, serviceId: $serviceId)
     }`,
    { commitSha: cfg.commitSha, environmentId: cfg.environmentId, serviceId },
  );
  return data.serviceInstanceDeployV2;
}

async function latestDeploymentFor(env, cfg, serviceId, notBefore) {
  const data = await railwayGql(
    env,
    `query($projectId: String!, $environmentId: String!, $serviceId: String!) {
       deployments(input: { projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId }, first: 5) {
         edges { node { id status createdAt meta } }
       }
     }`,
    { projectId: cfg.projectId, environmentId: cfg.environmentId, serviceId },
  );
  const nodes = (data.deployments?.edges ?? []).map((e) => e.node);
  return (
    nodes.find(
      (n) =>
        String(n.meta?.commitHash ?? "").toLowerCase() === cfg.commitSha &&
        n.createdAt >= notBefore,
    ) ?? null
  );
}

async function deploymentStatus(env, id) {
  const data = await railwayGql(
    env,
    `query($id: String!) { deployment(id: $id) { id status meta } }`,
    { id },
  );
  return data.deployment;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDeployment(env, cfg, serviceLabel, serviceId, startedAt) {
  const deadline = Date.now() + cfg.timeoutMinutes * 60_000;
  let deployment = null;
  while (Date.now() < deadline) {
    deployment = deployment
      ? await deploymentStatus(env, deployment.id)
      : await latestDeploymentFor(env, cfg, serviceId, startedAt);
    if (deployment) {
      const verdict = classifyDeploymentStatus(deployment.status);
      if (verdict === "success") return deployment;
      if (verdict === "failure")
        throw new PromotionError(
          `${serviceLabel} deployment ${deployment.id} ended ${deployment.status}`,
        );
    }
    await sleep(15_000);
  }
  throw new PromotionError(
    `${serviceLabel} deployment did not reach SUCCESS within ${cfg.timeoutMinutes} minutes`,
  );
}

async function strictVerify(url, cfg, label, expectAnalytics) {
  const r = await checkDeployTarget({
    baseUrl: url,
    expectEnv: cfg.targetEnv,
    expectSha: cfg.commitSha,
    strict: true,
    expectAnalytics,
  });
  return {
    label,
    url,
    ok: r.ok,
    findings: r.findings.map(
      (f) => `${f.code} ${FINDING_CODES[f.code]}: ${f.message}`,
    ),
    observed: r.observed,
  };
}

export async function main(env = process.env) {
  const startedAt = new Date().toISOString();
  const { ok, errors, config: cfg } = validateInputs(env);
  const record = {
    startedAt,
    targetEnv: cfg.targetEnv,
    commitSha: cfg.commitSha,
    actor: cfg.actor,
    steps: [],
  };
  const note = (step, detail) => {
    record.steps.push({ step, at: new Date().toISOString(), ...detail });
    console.log(`[promote] ${step}: ${JSON.stringify(detail)}`);
  };
  const finish = (code) => {
    record.finishedAt = new Date().toISOString();
    record.exitCode = code;
    const out = clean(env.PROMOTE_SUMMARY_PATH) ?? "promote-summary.json";
    fs.writeFileSync(out, JSON.stringify(record, null, 2));
    if (env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(
        env.GITHUB_STEP_SUMMARY,
        `\n### railway-promote → ${cfg.targetEnv} @ ${cfg.commitSha}\n\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`,
      );
    }
    return code;
  };

  if (!ok) {
    note("validate", { ok: false, errors });
    return finish(2);
  }
  note("validate", {
    ok: true,
    project: cfg.projectId,
    environment: cfg.environmentId,
  });

  try {
    const git = gitShaOnMain(cfg.commitSha);
    note("git", git);
    if (!git.exists)
      throw new PromotionError("COMMIT_SHA does not exist in this checkout");
    if (!git.onMain)
      throw new PromotionError("COMMIT_SHA is not reachable from origin/main");

    const checks = evaluateChecks(
      await githubCheckRuns(env, cfg),
      cfg.requiredChecks,
    );
    note("required-checks", checks);
    if (!checks.ok)
      throw new PromotionError(
        `required checks not green: missing=[${checks.missing}] failed=[${checks.failed}]`,
      );

    const environment = await environmentName(env, cfg);
    const envOk =
      environment &&
      environment.projectId === cfg.projectId &&
      environmentMatchesTarget(environment.name, cfg.targetEnv);
    note("environment", {
      name: environment?.name ?? null,
      projectMatches: environment?.projectId === cfg.projectId,
      targetMatches: envOk,
    });
    if (!envOk)
      throw new PromotionError(
        "RAILWAY_ENVIRONMENT_ID does not belong to the canonical project or does not classify as the target environment",
      );

    for (const [label, serviceId] of [
      ["backend", cfg.backendServiceId],
      ["frontend", cfg.frontendServiceId],
    ]) {
      const names = await variableNames(env, cfg, serviceId);
      const seeds = seedFlagsRequested(names);
      note(`variables:${label}`, { count: names.length, seedFlags: seeds });
      if (seeds.length)
        throw new PromotionError(
          `${label} service has production seed flags set: ${seeds.join(", ")} — refuse to deploy`,
        );
    }

    if (cfg.targetEnv === "production") {
      const staging = await strictVerify(
        cfg.stagingPublicUrl,
        { ...cfg, targetEnv: "staging" },
        "staging-reproof",
        env.STAGING_EXPECT_ANALYTICS?.toLowerCase() === "disabled"
          ? "disabled"
          : "enabled",
      );
      note("staging-reproof", staging);
      if (!staging.ok)
        throw new PromotionError(
          "staging does not pass strict verification at COMMIT_SHA — promote to staging first",
        );
    }

    const deployStart = new Date().toISOString();
    const deployed = [];
    for (const [label, serviceId] of [
      ["backend", cfg.backendServiceId],
      ["frontend", cfg.frontendServiceId],
    ]) {
      const id = await deployExact(env, cfg, serviceId);
      note(`deploy:${label}`, {
        requested: true,
        deploymentId: typeof id === "string" ? id : null,
      });
      const done = await waitForDeployment(
        env,
        cfg,
        label,
        serviceId,
        deployStart,
      );
      deployed.push({
        service: label,
        deploymentId: done.id,
        sha: done.meta?.commitHash ?? null,
        status: done.status,
      });
      note(`deployed:${label}`, deployed[deployed.length - 1]);
    }
    const consistent = deploymentsConsistent(deployed, cfg.commitSha);
    if (!consistent.ok)
      throw new PromotionError(
        `deployments carry different SHAs: ${consistent.wrong.join(", ")}`,
      );

    const verifications = [
      await strictVerify(cfg.publicUrl, cfg, "public", cfg.expectAnalytics),
    ];
    if (cfg.originFrontendUrl)
      verifications.push(
        await strictVerify(
          cfg.originFrontendUrl,
          cfg,
          "origin-frontend",
          cfg.expectAnalytics,
        ),
      );
    if (cfg.originBackendUrl)
      verifications.push(
        await strictVerify(
          cfg.originBackendUrl,
          cfg,
          "origin-backend",
          cfg.expectAnalytics,
        ),
      );
    for (const v of verifications) note(`verify:${v.label}`, v);
    if (verifications.some((v) => !v.ok))
      throw new PromotionError(
        "strict deploy verification failed after deployment — run the rollback runbook",
      );

    record.deployments = deployed;
    note("done", { ok: true });
    return finish(0);
  } catch (err) {
    const usage = err instanceof UsageError;
    note("error", {
      message: err.message,
      kind: usage
        ? "usage"
        : err instanceof PromotionError
          ? "promotion"
          : "internal",
    });
    return finish(usage ? 2 : 1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().then((code) => process.exit(code));
}
