import { API_BASE, join } from "./api";

/**
 * Minimal fetch helper for the #872 home-access routes.
 *
 * `useApi` collapses every 403 into a generic "unavailable" message, but the
 * home-access routes answer denials with stable codes
 * (`reauthentication_required`, `invalid_current_password`, ...) that the UI
 * turns into specific copy. This helper preserves the code as the error
 * message and the HTTP status on the error object.
 */
export class HomeAccessRequestError extends Error {
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.name = "HomeAccessRequestError";
    this.status = status;
  }
}

export async function postHomeAccess<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>,
  token: string | null | undefined,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(join(API_BASE, endpoint), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: unknown };
  if (!res.ok) {
    const code =
      typeof data.error === "string" && data.error ? data.error : "generic";
    throw new HomeAccessRequestError(code, res.status);
  }
  return data as T;
}
