/**
 * Session provenance hint for the UI (#872).
 *
 * The backend records how a session authenticated in the signed JWT's `auth`
 * claim (`password`, `class_code`, `class_code_pin`). The frontend reads it
 * only to decide which controls to *show*; every sensitive change is enforced
 * server-side, so a forged or missing claim cannot grant anything here.
 */
export type SessionAuth = "password" | "class_code" | "class_code_pin";

const SESSION_AUTH_VALUES: readonly SessionAuth[] = [
  "password",
  "class_code",
  "class_code_pin",
];

export function readSessionAuth(
  token: string | null | undefined,
): SessionAuth | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { auth?: unknown };
    const auth = payload?.auth;
    return typeof auth === "string" &&
      (SESSION_AUTH_VALUES as readonly string[]).includes(auth)
      ? (auth as SessionAuth)
      : null;
  } catch {
    return null;
  }
}
