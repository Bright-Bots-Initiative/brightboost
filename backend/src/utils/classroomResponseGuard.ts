/**
 * #872: a K-2 classroom session (icon login, with or without a PIN) is
 * reachable by anyone who holds the class code. Once a family has bound a home
 * login to the account, `email` is half of that credential pair and
 * `parentEmail` is the guardian's address — neither may ever reach a
 * classroom session, whichever self-scoped endpoint happens to echo the user
 * row (profile, hydration, avatar changes, ...).
 *
 * Individual mappers still null the field explicitly; this guard is the
 * structural backstop so the next endpoint that returns a user row is covered
 * without a new point fix. It rewrites only JSON responses of classroom
 * sessions and only the two keys named below, at any depth.
 */
import type { NextFunction, Request, Response } from "express";
import { isClassroomSession } from "./auth";

const WITHHELD_KEYS = new Set(["email", "parentEmail"]);

export function withholdCredentialFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => withholdCredentialFields(v)) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = WITHHELD_KEYS.has(k) ? null : withholdCredentialFields(v);
    }
    return out as T;
  }
  return value;
}

export function classroomResponseGuard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isClassroomSession(req)) return next();
  const original = res.json.bind(res);
  res.json = ((body: unknown) =>
    original(withholdCredentialFields(body))) as Response["json"];
  next();
}
