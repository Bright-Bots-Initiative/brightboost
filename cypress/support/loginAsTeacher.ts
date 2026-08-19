/**
 * Pure helpers for programmatic teacher login (overview §8.2 / U2-04).
 * Cypress command wrapper lives in commands.ts.
 */

export type E2ECredName = "E2E_TEACHER_EMAIL" | "E2E_TEACHER_PASSWORD";

export type EnvGetter = (name: string) => unknown;

export function requireE2ECred(name: E2ECredName, get: EnvGetter): string {
  const raw = get(name);
  if (raw === undefined || raw === null || String(raw).trim() === "") {
    throw new Error(
      `[brightboost-e2e] Required env "${name}" is not set for loginAsTeacher.`,
    );
  }
  return String(raw).trim();
}

export type LoginSuccess = {
  token: string;
  user: Record<string, unknown>;
};

/**
 * Loud failure on non-2xx or missing token/user — includes response status (G-003 / §8.2).
 */
export function assertLoginSuccess(
  status: number,
  body: unknown,
): LoginSuccess {
  if (status < 200 || status >= 300) {
    throw new Error(
      `[brightboost-e2e] loginAsTeacher failed with status ${status}`,
    );
  }
  const record =
    body !== null && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  const token = record.token;
  const user = record.user;
  if (typeof token !== "string" || !token) {
    throw new Error(
      `[brightboost-e2e] loginAsTeacher: missing token/user in status ${status}`,
    );
  }
  if (user === null || typeof user !== "object") {
    throw new Error(
      `[brightboost-e2e] loginAsTeacher: missing token/user in status ${status}`,
    );
  }
  return { token, user: user as Record<string, unknown> };
}
