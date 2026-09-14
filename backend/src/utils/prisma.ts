import { PrismaClient } from "@prisma/client";

/**
 * Interactive-transaction limits (#849, set with #877/#878).
 *
 * Two write paths run interactive transactions on the highest-traffic route:
 * the authoritative reward operation in complete-activity (ensure row, claim,
 * SELECT … FOR UPDATE on the Avatar row, base reward, level claim, ability
 * grants, re-read — about eight statements) and the personal-best
 * reconciliation (five statements). Each holds one pooled connection for its
 * whole duration.
 *
 * Measured on a real PostgreSQL (progressRewardsPool.db.test.ts, 2026-09-14):
 * one completion answers in ~66 ms end to end; 29 completions fired at once
 * on a two-connection pool finish in 242 ms wall, p95 223 ms — so a reward
 * transaction itself takes on the order of 15–20 ms locally, and stays far
 * below the 5 s `timeout` even at ten times that on the Supabase session
 * pooler.
 *
 * `maxWait` is how long a transaction waits for a pool connection before
 * failing with P2024. Prisma's default of 2 s is too short for the shape a
 * classroom produces: many learners finishing at once while one learner's
 * Avatar row is briefly locked, on a pool sized for a small service. With
 * the default, holding one Avatar row for 3 s made seven of eight queued
 * completions fail with P2024 (DB-849-2, RED); at 5 s they all wait the
 * lock out and succeed. Waiting is a queue for a connection, not a held
 * resource, so the longer bound costs nothing when the pool is healthy.
 *
 * Either limit surfaces as a JSON 500 from complete-activity (the whole
 * transaction rolls back and the client retries idempotently), and as a
 * distinct "pool/transaction limit" warning from the personal-best path.
 */
const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 5000,
    timeout: 5000,
  },
});

export default prisma;
