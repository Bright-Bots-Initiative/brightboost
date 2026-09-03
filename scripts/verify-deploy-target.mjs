#!/usr/bin/env node
/**
 * verify-deploy-target — exact-SHA + environment-posture smoke for a deployed
 * Bright Boost host (BRAND_R0).
 *
 * Proves, against a live URL, that:
 *   - the page declares the expected environment (`<meta name="bb-app-env">`)
 *     and was built from the expected commit (`<meta name="bb-git-sha">`);
 *   - a non-production host answers with `X-Robots-Tag: noindex` on the page
 *     and on health, and a production host does NOT;
 *   - `/api/health` (or `/health`) is ok, reports the same environment and
 *     SHA, and did not refuse analytics for an environment/key mismatch.
 *
 * Usage:
 *   node scripts/verify-deploy-target.mjs --url https://<host> --expect-env staging|production|preview \
 *        [--expect-sha <7-40 hex>] [--json]
 *
 * Exit 0 = every property holds; 1 = findings (codes DT-0NN); 2 = usage or
 * internal error. Never conflate 1 and 2.
 *
 * Runner: `.github/workflows/deploy-verify.yml` (workflow_dispatch) and the
 * operator runbooks under docs/brand-refresh/release-0/. Proof:
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
  "DT-008":
    "health endpoint reports analytics refused (environment/key mismatch)",
});

export const EXPECTABLE_ENVS = Object.freeze([
  "production",
  "staging",
  "preview",
]);

export class UsageError extends Error {}

const SHA_RE = /^[0-9a-f]{7,40}$/i;

/**
 * Read a `<meta name=… content=…>` tag. A literal `%VITE_X%` (Vite leaves the
 * placeholder when the variable was absent at build time) counts as absent.
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

/** Short and long SHAs match when one is a prefix of the other (min 7 chars enforced upstream). */
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

async function fetchText(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        accept: "*/*",
        "user-agent": "brightboost-verify-deploy-target",
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
 * @param {{ baseUrl: string, expectEnv: string, expectSha?: string | null, fetchImpl?: typeof fetch, timeoutMs?: number }} opts
 */
export async function checkDeployTarget(opts) {
  const {
    baseUrl,
    expectEnv,
    expectSha = null,
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
    page: { status: 0, robots: null, metaEnv: null, metaSha: null },
    health: null,
  };

  // ── Page ────────────────────────────────────────────────────────────────
  const page = await fetchText(fetchImpl, `${base}/`, timeoutMs);
  observed.page.status = page.status;
  observed.page.robots = page.headers.get("x-robots-tag");
  if (!page.ok || !/<html/i.test(page.text)) {
    add(
      "DT-000",
      `GET ${base}/ → ${page.status}${page.error ? ` (${page.error})` : ""}`,
    );
  } else {
    const metaEnv = readMeta(page.text, "bb-app-env");
    const metaSha = readMeta(page.text, "bb-git-sha");
    observed.page.metaEnv = metaEnv.value;
    observed.page.metaSha = metaSha.value;

    if (isProd) {
      // An undeclared production build is accepted (today's production has no
      // VITE_APP_ENV); a declared non-production value is not.
      if (metaEnv.value !== null && metaEnv.value !== "production") {
        add(
          "DT-001",
          `page declares env=${metaEnv.value}, expected production`,
        );
      }
    } else if (metaEnv.value !== expectEnv) {
      add(
        "DT-001",
        `page declares env=${metaEnv.value ?? "undeclared"}, expected ${expectEnv} — build the frontend with VITE_APP_ENV=${expectEnv}`,
      );
    }

    if (expectSha && !shaMatches(metaSha.value, expectSha)) {
      add(
        "DT-002",
        `page build sha=${metaSha.value ?? "unknown"}, expected ${expectSha} — check VITE_GIT_SHA / RAILWAY_GIT_COMMIT_SHA reached the frontend build`,
      );
    }

    const robots = observed.page.robots;
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
    const res = await fetchText(fetchImpl, `${base}${path}`, timeoutMs);
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
        `health analytics=refused — fix POSTHOG_KEY / POSTHOG_KEY_ENV for env=${expectEnv}`,
      );
    }
  }

  return {
    ok: findings.length === 0,
    baseUrl: base,
    expectEnv,
    expectSha,
    findings,
    observed,
  };
}

function parseArgs(argv) {
  const opts = {
    url: null,
    expectEnv: null,
    expectSha: null,
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") opts.json = true;
    else if (arg === "--help" || arg === "-h") opts.help = true;
    else if (arg === "--url") opts.url = argv[++i] ?? null;
    else if (arg === "--expect-env") opts.expectEnv = argv[++i] ?? null;
    else if (arg === "--expect-sha") opts.expectSha = argv[++i] ?? null;
    else throw new UsageError(`unknown argument: ${arg}`);
  }
  if (opts.expectSha !== null && opts.expectSha.trim() === "")
    opts.expectSha = null;
  return opts;
}

const USAGE = `usage: node scripts/verify-deploy-target.mjs --url <base-url> --expect-env <production|staging|preview> [--expect-sha <sha>] [--json]`;

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
    process.stdout.write(
      `verify-deploy-target ${result.baseUrl} (expect env=${result.expectEnv}${result.expectSha ? ` sha=${result.expectSha}` : ""})\n`,
    );
    process.stdout.write(
      `  page:   status=${result.observed.page.status} env=${result.observed.page.metaEnv ?? "undeclared"} sha=${result.observed.page.metaSha ?? "unknown"} robots=${result.observed.page.robots ?? "absent"}\n`,
    );
    if (result.observed.health) {
      const h = result.observed.health;
      process.stdout.write(
        `  health: ${h.path} env=${h.env ?? "?"} sha=${h.sha ?? "?"} noindex=${h.noindex} analytics=${h.analytics ?? "?"} robots=${h.robots ?? "absent"}\n`,
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
