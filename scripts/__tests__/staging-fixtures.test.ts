/* @vitest-environment node */
import { describe, expect, it } from "vitest";
import {
  evaluateStagingTarget,
  PRODUCTION_DB_TOKENS,
} from "../staging-fixtures.mjs";

const STAGING_REF = "sduhifvagbznswdkjldw";
const PROD_REF = "rjpztbtkdwwdmnbbrqmm";
const staging = `postgresql://postgres.${STAGING_REF}:pw@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require`;

describe("staging-fixtures — target guard (bounded, never production)", () => {
  it("healthy: the staging pooler URL with the staging token is accepted", () => {
    expect(evaluateStagingTarget(staging, STAGING_REF)).toMatchObject({
      ok: true,
      database: "postgres",
    });
    expect(PRODUCTION_DB_TOKENS).toContain(PROD_REF);
  });

  it("SABOTAGE: the production database (by ref) is refused whatever token is supplied", () => {
    const prod = `postgresql://postgres.${PROD_REF}:pw@aws-0-us-west-2.pooler.supabase.com:5432/postgres`;
    expect(evaluateStagingTarget(prod, STAGING_REF)).toMatchObject({
      ok: false,
      code: 1,
    });
    expect(evaluateStagingTarget(prod, PROD_REF)).toMatchObject({
      ok: false,
      code: 1,
    });
    expect(
      evaluateStagingTarget(
        `postgresql://u:p@db.${PROD_REF}.supabase.co:5432/postgres`,
        STAGING_REF,
      ).ok,
    ).toBe(false);
  });

  it("SABOTAGE: an unknown host (token not in host or user) is refused", () => {
    expect(
      evaluateStagingTarget(
        "postgresql://postgres:pw@some-other-host.example.com:5432/postgres",
        STAGING_REF,
      ),
    ).toMatchObject({
      ok: false,
      code: 1,
    });
  });

  it("SABOTAGE: loopback is refused here (the local seed owns local databases)", () => {
    expect(
      evaluateStagingTarget(
        "postgresql://postgres:pw@localhost:5435/brightboost",
        "localhost",
      ).ok,
    ).toBe(false);
  });

  it("usage errors: missing URL, missing/short token, unparseable URL", () => {
    expect(evaluateStagingTarget("", STAGING_REF)).toMatchObject({
      ok: false,
      code: 2,
    });
    expect(evaluateStagingTarget(staging, "")).toMatchObject({
      ok: false,
      code: 2,
    });
    expect(evaluateStagingTarget(staging, "short")).toMatchObject({
      ok: false,
      code: 2,
    });
    expect(evaluateStagingTarget("not a url", STAGING_REF)).toMatchObject({
      ok: false,
      code: 2,
    });
  });
});
