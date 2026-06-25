// Phase 0 — Creation content allowlist + per-type validation hook.
//
// `Creation.content` is a free-form JSON blob at the DB layer, so the safety of
// the feature depends on validating it per `type` at write time. This module is
// the single place that decides (a) which creation types exist and (b) whether a
// given content payload is acceptable for that type.
//
// Step 1 (this file) ships the closed type allowlist + a minimal structural
// guard. Step 4 (Data Dash authoring) extends `validateCreationContent` with the
// real solvability check for "data_dash_challenge" (the hidden sort rule must
// actually partition the chosen cards and every chart question must have a
// correct answer) — see the marked extension point below.

export const CREATION_TYPES = ["data_dash_challenge"] as const;
export type CreationType = (typeof CREATION_TYPES)[number];

export function isCreationType(value: unknown): value is CreationType {
  return (
    typeof value === "string" &&
    (CREATION_TYPES as readonly string[]).includes(value)
  );
}

export type ContentValidation =
  | { ok: true }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}

/**
 * Validate a creation's `content` against the rules for its `type`.
 *
 * Keep this the ONLY gate on stored content — both POST (create) and PATCH
 * (edit) call it, so an invalid payload can never reach the group gallery.
 */
export function validateCreationContent(
  type: CreationType,
  content: unknown,
): ContentValidation {
  if (!isPlainObject(content)) {
    return { ok: false, error: "content must be a JSON object" };
  }

  switch (type) {
    case "data_dash_challenge":
      // STEP 4 EXTENSION POINT: replace this minimal guard with the full
      // Data Dash solvability check (rule partitions cards; every chart
      // question has a correct answer; question stems are from the locked
      // template set). Until then, only a non-empty object is accepted so the
      // model + CRUD can be reviewed without the authoring UI.
      return { ok: true };

    default:
      // Exhaustiveness guard — a new CreationType must declare its rules here.
      return { ok: false, error: `unsupported creation type: ${type}` };
  }
}
