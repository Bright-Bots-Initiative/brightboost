#!/usr/bin/env node
/**
 * verify-deploy-target — exact-SHA + environment-posture smoke for a deployed
 * Bright Boost host (BRAND_R0).
 *
 * Two modes.
 *
 * Compatibility mode (default) — the one-time bootstrap check of the
 * pre-BRAND_R0 production host: an undeclared production page is accepted,
 * `enabled-unlabeled` analytics is accepted, and only the page/health facts
 * that exist are compared.
 *
 * Strict mode (`--require-declared-env`) — the exit proof for staging and
 * production after BRAND_R0:
 *   - the page must declare the expected environment (`bb-app-env`) and
 *     backend health must report it (`declaredEnv`), production included;
 *   - frontend and backend effective environment and environment source must
 *     agree; no configuration mismatch may be present on either side;
 *   - the SHA must be known on both sides, equal to each other, and equal to
 *     `--expect-sha` (required in strict mode);
 *   - analytics must match `--expect-analytics enabled|disabled` (required);
 *     `refused` is always a failure and `enabled-unlabeled` fails strict;
 *   - production must not carry noindex; non-production must.
 *
 * Usage:
 *   node scripts/verify-deploy-target.mjs --url https://<host> --expect-env staging|production|preview \
 *        [--expect-sha <7-40 hex>] [--require-declared-env --expect-analytics enabled|disabled] [--json]
 *
 * Exit 0 = every property holds; 1 = findings (codes DT-0NN); 2 = usage or
 * internal error. Never conflate 1 and 2.
 *
 * Runner: `.github/workflows/deploy-verify.yml`, `.github/workflows/deploy-promote.yml`,
 * and the runbooks under docs/brand-refresh/release-0/. Proof:
 * scripts/__tests__/verify-deploy-target.test.ts (healthy-pass then sabotage).
 */
import { pathToFileURL } from "node:url";

export const FINDING_CODES = Object.freeze({
  "DT-000": "page unreachable or not HTML",
  "DT-001": "page declares the wrong environment",
  "DT-002": "page build SHA does not match the expected SHA",
  "DT-003": "non-production host is missing the noindex header",
  "DT-004": "production host carries a noindex header",
  "DT-005": "health endpoint unreachable or not ok",
  "DT-006": "health endpoint reports the wrong environment",
  "DT-007": "health endpoint SHA does not match the expected SHA",
  "DT-008": "analytics refused (environment/key mismatch)",
  "DT-009":
    "frontend and backend disagree on environment or environment source",
  "DT-010":
    "configuration mismatch present (declaration disagrees with Railway)",
  "DT-011": "analytics posture does not match the explicit expectation",
  "DT-012": "environment not explicitly declared (strict mode)",
  "DT-013": "frontend and backend report different SHAs",
});

export const EXPECTABLE_ENVS = Object.freeze([
  "production",
  "staging",
  "preview",
]);

export const EXPECTABLE_ANALYTICS = Object.freeze(["enabled", "disabled"]);

export class UsageError extends Error {}

const SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * Read a `<meta name=… content=…>` tag. An empty value, or a literal
 * `%VITE_X%` / `%BB_X%` placeholder (left when the build had no value),
 * counts as absent.
 * @param {string} html
 * @param {string} name
 * @returns {{ present: boolean, value: string | null }}
 */
export function readMeta(html, name) {
  const re = new RegExp(
    `<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)["']`,
    "i",
  );
  const match = re.exec(html);
  if (!match) return { present: false, value: null };
  const value = match[1].trim();
  if (!value || /^%[A-Z0-9_]+%$/.test(value))
    return { present: true, value: null };
  return { present: true, value };
}

/** Short and long SHAs match when one is a prefix of the other (min 7 hex chars). */
export function shaMatches(observed, expected) {
  if (!observed || !expected) return false;
  const o = String(observed).toLowerCase();
  const e = String(expected).toLowerCase();
  if (!SHA_RE.test(o) || !SHA_RE.test(e)) return false;
  return o.startsWith(e) || e.startsWith(o);
}

export function hasNoindex(headerValue) {
  return typeof headerValue === "string" && /noindex/i.test(headerValue);
}

async function fetchText(fetchImpl, url, timeoutMs, extraHeaders) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "*/*",
        "user-agent": "brightboost-verify-deploy-target",
        ...extraHeaders,
      },
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      text,
      headers: res.headers,
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      text: "",
      headers: new Headers(),
      error: err && err.message ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{
 *   baseUrl: string,
 *   expectEnv: string,
 *   expectSha?: string | null,
 *   strict?: boolean,
 *   expectAnalytics?: string | null,
 *   headers?: Record<string, string>,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 * }} opts
 */
export async function checkDeployTarget(opts) {
  const {
    baseUrl,
    expectEnv,
    expectSha = null,
    strict = false,
    expectAnalytics = null,
    headers = {},
    fetchImpl = globalThis.fetch,
    timeoutMs = 15_000,
  } = opts;
  if (!baseUrl || typeof baseUrl !== "string") {
    throw new UsageError("--url is required");
  }
  if (!EXPECTABLE_ENVS.includes(expectEnv)) {
    throw new UsageError(
      `--expect-env must be one of ${EXPECTABLE_ENVS.join(", ")} (got ${expectEnv ?? "nothing"})`,
    );
  }
  if (expectSha !== null && !SHA_RE.test(expectSha)) {
    throw new UsageError("--expect-sha must be a 7–40 character hex SHA");
  }
  if (strict && expectSha === null) {
    throw new UsageError("--require-declared-env needs --expect-sha");
  }
  if (strict && !EXPECTABLE_ANALYTICS.includes(expectAnalytics)) {
    throw new UsageError(
      `--require-declared-env needs --expect-analytics ${EXPECTABLE_ANALYTICS.join("|")}`,
    );
  }
  if (
    !strict &&
    expectAnalytics !== null &&
    !EXPECTABLE_ANALYTICS.includes(expectAnalytics)
  ) {
    throw new UsageError(
      `--expect-analytics must be one of ${EXPECTABLE_ANALYTICS.join(", ")}`,
    );
  }
  if (typeof fetchImpl !== "function") {
    throw new UsageError(
      "no fetch implementation available (Node 18+ required)",
    );
  }

  const base = baseUrl.replace(/\/+$/, "");
  const isProd = expectEnv === "production";
  /** @type {{ code: string, message: string }[]} */
  const findings = [];
  const add = (code, message) => findings.push({ code, message });

  const observed = {
    mode: strict ? "strict" : "compat",
    page: {
      status: 0,
      robots: null,
      declaredEnv: null,
      railwayEnv: null,
      effectiveEnv: null,
      envSource: null,
      mismatch: null,
      sha: null,
    },
    health: null,
  };

  // ── Page ────────────────────────────────────────────────────────────────
  const page = await fetchText(fetchImpl, `${base}/`, timeoutMs, headers);
  observed.page.status = page.status;
  observed.page.robots = page.headers.get("x-robots-tag");
  let pageOk = false;
  if (!page.ok || !/<html/i.test(page.text)) {
    add(
      "DT-000",
      `GET ${base}/ → ${page.status}${page.error ? ` (${page.error})` : ""}`,
    );
  } else {
    pageOk = true;
    const p = observed.page;
    p.declaredEnv = readMeta(page.text, "bb-app-env").value;
    p.railwayEnv = readMeta(page.text, "bb-railway-env").value;
    p.effectiveEnv = readMeta(page.text, "bb-env-effective").value;
    p.envSource = readMeta(page.text, "bb-env-source").value;
    p.mismatch = readMeta(page.text, "bb-env-mismatch").value;
    p.sha = readMeta(page.text, "bb-git-sha").value;

    if (strict) {
      if (p.declaredEnv !== expectEnv) {
        add(
          "DT-012",
          `page declares env=${p.declaredEnv ?? "undeclared"}, strict mode requires an explicit ${expectEnv} declaration (VITE_APP_ENV=${expectEnv})`,
        );
      }
      if (p.mismatch !== null && p.mismatch !== "none") {
        add(
          "DT-010",
          `page reports configuration mismatch=${p.mismatch} — VITE_APP_ENV disagrees with VITE_RAILWAY_ENVIRONMENT_NAME`,
        );
      }
      if (p.effectiveEnv !== null && p.effectiveEnv !== expectEnv) {
        add(
          "DT-001",
          `page effective env=${p.effectiveEnv}, expected ${expectEnv}`,
        );
      }
    } else if (isProd) {
      // Bootstrap compatibility: an undeclared production page is accepted; a
      // declared non-production value is not.
      const declared = p.effectiveEnv ?? p.declaredEnv;
      if (declared !== null && declared !== "production") {
        add("DT-001", `page declares env=${declared}, expected production`);
      }
    } else {
      const declared = p.effectiveEnv ?? p.declaredEnv;
      if (declared !== expectEnv) {
        add(
          "DT-001",
          `page declares env=${declared ?? "undeclared"}, expected ${expectEnv} — build the frontend with VITE_APP_ENV=${expectEnv}`,
        );
      }
    }

    if (expectSha && !shaMatches(p.sha, expectSha)) {
      add(
        "DT-002",
        `page build sha=${p.sha ?? "unknown"}, expected ${expectSha} — check VITE_GIT_SHA / RAILWAY_GIT_COMMIT_SHA reached the frontend build`,
      );
    }

    const robots = p.robots;
    if (isProd) {
      if (hasNoindex(robots))
        add("DT-004", `page carries X-Robots-Tag: ${robots}`);
    } else if (!hasNoindex(robots)) {
      add(
        "DT-003",
        `page X-Robots-Tag=${robots ?? "absent"} — set ROBOTS_TAG="noindex, nofollow" on the frontend service (nginx) or APP_ENV=${expectEnv} when Express serves the SPA`,
      );
    }
  }

  // ── Health (through the frontend proxy first, then the bare backend route) ─
  let health = null;
  for (const path of ["/api/health", "/health"]) {
    const res = await fetchText(
      fetchImpl,
      `${base}${path}`,
      timeoutMs,
      headers,
    );
    if (!res.ok) continue;
    try {
      const json = JSON.parse(res.text);
      if (json && typeof json === "object" && "status" in json) {
        health = { path, json, headers: res.headers };
        break;
      }
    } catch {
      // SPA fallback returned HTML — try the next path.
    }
  }

  if (!health) {
    add("DT-005", `no JSON health at ${base}/api/health or ${base}/health`);
  } else {
    const j = health.json;
    const robots = health.headers.get("x-robots-tag");
    observed.health = {
      path: health.path,
      env: j.env ?? null,
      envSource: j.envSource ?? null,
      declaredEnv: j.declaredEnv ?? null,
      railwayEnv: j.railwayEnv ?? null,
      mismatch: j.mismatch ?? null,
      sha: j.sha ?? null,
      noindex: j.noindex ?? null,
      analytics: j.analytics ?? null,
      robots,
    };

    if (j.status !== "ok") add("DT-005", `health status=${j.status}`);

    if (j.env === undefined) {
      add(
        "DT-006",
        "health does not report env — backend predates BRAND_R0 or is not this repository",
      );
    } else if (j.env !== expectEnv) {
      add(
        "DT-006",
        `health env=${j.env}, expected ${expectEnv} — set APP_ENV=${expectEnv} on the backend service`,
      );
    }

    if (strict) {
      if (j.declaredEnv !== expectEnv) {
        add(
          "DT-012",
          `health declaredEnv=${j.declaredEnv ?? "undeclared"}, strict mode requires APP_ENV=${expectEnv}`,
        );
      }
      if (j.mismatch !== undefined && j.mismatch !== "none") {
        add(
          "DT-010",
          `health reports configuration mismatch=${j.mismatch} — APP_ENV disagrees with RAILWAY_ENVIRONMENT_NAME`,
        );
      }
      if (j.mismatch === undefined) {
        add(
          "DT-010",
          "health does not report a mismatch field — backend predates the consistency contract",
        );
      }
    }

    if (expectSha) {
      const sha =
        typeof j.sha === "string" && j.sha !== "unknown" ? j.sha : null;
      if (!shaMatches(sha, expectSha)) {
        add(
          "DT-007",
          `health sha=${j.sha ?? "unknown"}, expected ${expectSha}`,
        );
      }
    }

    if (isProd) {
      if (hasNoindex(robots) || j.noindex === true) {
        add(
          "DT-004",
          `health carries noindex (header=${robots ?? "absent"}, noindex=${j.noindex})`,
        );
      }
    } else if (!hasNoindex(robots)) {
      add(
        "DT-003",
        `health X-Robots-Tag=${robots ?? "absent"} — set APP_ENV=${expectEnv} on the backend service`,
      );
    }

    if (j.analytics === "refused") {
      add(
        "DT-008",
        `health analytics=refused — fix POSTHOG_KEY / POSTHOG_KEY_ENV (and APP_ENV) for env=${expectEnv}`,
      );
    }
    if (expectAnalytics !== null && j.analytics !== "refused") {
      const actual = j.analytics ?? "unknown";
      const okStrict = actual === expectAnalytics;
      const okCompat =
        okStrict ||
        (expectAnalytics === "enabled" && actual === "enabled-unlabeled");
      if (strict ? !okStrict : !okCompat) {
        add(
          "DT-011",
          `health analytics=${actual}, expected ${expectAnalytics}${strict && actual === "enabled-unlabeled" ? " (label the key: POSTHOG_KEY_ENV / VITE_POSTHOG_KEY_ENV)" : ""}`,
        );
      }
    }

    // ── Cross-checks (strict): frontend and backend must agree ──
    if (strict && pageOk) {
      const p = observed.page;
      if (
        p.effectiveEnv !== null &&
        j.env !== undefined &&
        p.effectiveEnv !== j.env
      ) {
        add(
          "DT-009",
          `frontend effective env=${p.effectiveEnv} but backend env=${j.env}`,
        );
      }
      if (
        p.envSource !== null &&
        j.envSource !== undefined &&
        p.envSource !== j.envSource
      ) {
        add(
          "DT-009",
          `frontend env source=${p.envSource} but backend env source=${j.envSource} — both sides must be classified by the same signal`,
        );
      }
      const backendSha =
        typeof j.sha === "string" && j.sha !== "unknown" ? j.sha : null;
      if (p.sha && backendSha && !shaMatches(p.sha, backendSha)) {
        add("DT-013", `frontend sha=${p.sha} but backend sha=${backendSha}`);
      }
    }
  }

  return {
    ok: findings.length === 0,
    mode: observed.mode,
    baseUrl: base,
    expectEnv,
    expectSha,
    expectAnalytics,
    findings,
    observed,
  };
}

function parseArgs(argv) {
  const opts = {
    url: null,
    expectEnv: null,
    expectSha: null,
    expectAnalytics: null,
    strict: false,
    headers: {},
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--require-declared-env" || arg === "--strict")
      opts.strict = true;
    else if (arg === "--url") opts.url = argv[++i] ?? null;
    else if (arg === "--expect-env") opts.expectEnv = argv[++i] ?? null;
    else if (arg === "--expect-sha") opts.expectSha = argv[++i] ?? null;
    else if (arg === "--expect-analytics")
      opts.expectAnalytics = argv[++i] ?? null;
    else if (arg === "--header") {
      const raw = argv[++i] ?? "";
      const idx = raw.indexOf(":");
      if (idx <= 0)
        throw new UsageError(`--header expects "Name: value" (got ${raw})`);
      opts.headers[raw.slice(0, idx).trim()] = raw.slice(idx + 1).trim();
    } else throw new UsageError(`unknown argument: ${arg}`);
  }
  if (opts.expectSha !== null && opts.expectSha.trim() === "")
    opts.expectSha = null;
  if (opts.expectAnalytics !== null && opts.expectAnalytics.trim() === "")
    opts.expectAnalytics = null;
  return opts;
}

const USAGE = `usage: node scripts/verify-deploy-target.mjs --url <base-url> --expect-env <production|staging|preview> [--expect-sha <sha>] [--require-declared-env --expect-analytics <enabled|disabled>] [--header "Name: value"] [--json]`;

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`verify-deploy-target: ${err.message}\n${USAGE}\n`);
    process.exit(2);
  }
  if (opts.help) {
    process.stdout.write(`${USAGE}\n`);
    process.exit(0);
  }

  let result;
  try {
    result = await checkDeployTarget({
      baseUrl: opts.url,
      expectEnv: opts.expectEnv,
      expectSha: opts.expectSha,
      strict: opts.strict,
      expectAnalytics: opts.expectAnalytics,
      headers: opts.headers,
    });
  } catch (err) {
    const prefix = err instanceof UsageError ? "" : "internal error: ";
    process.stderr.write(
      `verify-deploy-target: ${prefix}${err.message}\n${USAGE}\n`,
    );
    process.exit(2);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    const p = result.observed.page;
    process.stdout.write(
      `verify-deploy-target [${result.mode}] ${result.baseUrl} (expect env=${result.expectEnv}${result.expectSha ? ` sha=${result.expectSha}` : ""}${result.expectAnalytics ? ` analytics=${result.expectAnalytics}` : ""})\n`,
    );
    process.stdout.write(
      `  page:   status=${p.status} declared=${p.declaredEnv ?? "undeclared"} railway=${p.railwayEnv ?? "-"} effective=${p.effectiveEnv ?? "-"} source=${p.envSource ?? "-"} mismatch=${p.mismatch ?? "-"} sha=${p.sha ?? "unknown"} robots=${p.robots ?? "absent"}\n`,
    );
    if (result.observed.health) {
      const h = result.observed.health;
      process.stdout.write(
        `  health: ${h.path} env=${h.env ?? "?"} source=${h.envSource ?? "?"} declared=${h.declaredEnv ?? "undeclared"} railway=${h.railwayEnv ?? "-"} mismatch=${h.mismatch ?? "-"} sha=${h.sha ?? "?"} noindex=${h.noindex} analytics=${h.analytics ?? "?"} robots=${h.robots ?? "absent"}\n`,
      );
    } else {
      process.stdout.write("  health: unreachable\n");
    }
    if (result.ok) {
      process.stdout.write("PASS — every deploy-target property holds.\n");
    } else {
      process.stdout.write(`FAIL — ${result.findings.length} finding(s):\n`);
      for (const f of result.findings) {
        process.stdout.write(
          `  ${f.code}  ${FINDING_CODES[f.code]}\n         ${f.message}\n`,
        );
      }
    }
  }
  process.exit(result.ok ? 0 : 1);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
