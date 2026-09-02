/**
 * Biome Buddy — backend-free share snapshot (design addendum, Phase 6).
 *
 *   /biome-buddy/share#r=<base64url(JSON)>
 *
 * The fragment never reaches a server, a log, or an analytics beacon. The
 * payload is the RECIPE ONLY — schema version + closed-enum ids:
 *
 *   { v: 1, b: <biome>, t: [eyes, ears, nose, movement, covering],
 *     p: <pattern>, n: [adjective, noun] }
 *
 * It MUST NOT carry stats, names as text, or any identifier of a person,
 * device, group or session. On load the app decodes, enforces a hard length
 * cap, validates every enum through `validateRecipe`, rejects unknown fields,
 * and then RECOMPUTES stats / name / sprite from trusted model data. The URL
 * describes the recipe; the app derives the results — a tampered "stats"
 * field is not ignored, it is rejected.
 */
import {
  CATEGORIES,
  RECIPE_VERSION,
  validateRecipe,
  type BuddyRecipe,
  type RecipeError,
} from "./biomeBuddyModel";

export const SHARE_PATH = "/biome-buddy/share";
export const SHARE_PARAM = "r";
/** Remix entry: the game page reads the same param from its own hash. */
export const REMIX_PATH = "/biome-buddy";

/** A valid v1 payload encodes to ~150 chars; anything past this is not a
 *  Buddy. Checked BEFORE decoding so oversized junk costs nothing. */
export const SHARE_MAX_LENGTH = 400;

export type ShareError =
  | "empty"
  | "too_long"
  | "encoding"
  | "json"
  | "shape"
  | RecipeError;

export type ShareResult =
  | { ok: true; recipe: BuddyRecipe }
  | { ok: false; error: ShareError; detail?: string };

// ── base64url (ASCII payloads only — ids are ASCII by construction) ────────

const BASE64URL = /^[A-Za-z0-9_-]+$/;

function toBase64Url(ascii: string): string {
  return btoa(ascii).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(encoded: string): string | null {
  if (!BASE64URL.test(encoded)) return null;
  const padded =
    encoded.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (encoded.length % 4)) % 4);
  try {
    return atob(padded);
  } catch {
    return null;
  }
}

// ── Wire shape ──────────────────────────────────────────────────────────────

const WIRE_KEYS = new Set(["v", "b", "t", "p", "n"]);

/** Recipe → compact wire object. Always emits the current version. */
export function toWire(recipe: BuddyRecipe): {
  v: 1;
  b: string;
  t: string[];
  p: string;
  n: [string, string];
} {
  return {
    v: RECIPE_VERSION,
    b: recipe.biome,
    t: CATEGORIES.map((category) => recipe.traits[category]),
    p: recipe.pattern,
    n: [recipe.name.adjective, recipe.name.noun],
  };
}

/** Wire object → validated recipe (or a typed refusal). Strict at every
 *  level: unknown keys, wrong array lengths and non-string ids are refused
 *  before `validateRecipe` even sees them. */
export function fromWire(value: unknown): ShareResult {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  )
    return { ok: false, error: "shape" };
  const wire = value as Record<string, unknown>;
  for (const key of Object.keys(wire))
    if (!WIRE_KEYS.has(key))
      return { ok: false, error: "unknown_field", detail: key };
  if (wire.v !== RECIPE_VERSION)
    return { ok: false, error: "version", detail: String(wire.v) };
  if (typeof wire.b !== "string")
    return { ok: false, error: "biome", detail: String(wire.b) };
  const traitIds = wire.t;
  if (!Array.isArray(traitIds) || traitIds.length !== CATEGORIES.length)
    return { ok: false, error: "traits", detail: "count" };
  if (!traitIds.every((x) => typeof x === "string"))
    return { ok: false, error: "shape", detail: "non-string id" };
  if (typeof wire.p !== "string")
    return { ok: false, error: "pattern", detail: String(wire.p) };
  const nameIds = wire.n;
  if (
    !Array.isArray(nameIds) ||
    nameIds.length !== 2 ||
    !nameIds.every((x) => typeof x === "string")
  )
    return { ok: false, error: "name" };
  const traits: Record<string, unknown> = {};
  CATEGORIES.forEach((category, index) => {
    traits[category] = traitIds[index];
  });
  return validateRecipe({
    version: wire.v,
    biome: wire.b,
    traits,
    pattern: wire.p,
    name: { adjective: nameIds[0], noun: nameIds[1] },
  });
}

// ── Public codec ────────────────────────────────────────────────────────────

export function encodeShare(recipe: BuddyRecipe): string {
  return toBase64Url(JSON.stringify(toWire(recipe)));
}

export function decodeShare(encoded: string | null | undefined): ShareResult {
  if (typeof encoded !== "string" || encoded.length === 0)
    return { ok: false, error: "empty" };
  if (encoded.length > SHARE_MAX_LENGTH)
    return { ok: false, error: "too_long" };
  const json = fromBase64Url(encoded);
  if (json === null) return { ok: false, error: "encoding" };
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "json" };
  }
  return fromWire(parsed);
}

/** `#r=…` (also tolerates `#/r=…` and `#?r=…` from copy/paste mangling). */
export function readShareParam(hash: string): string | null {
  const stripped = hash.replace(/^#[/?]?/, "");
  const params = new URLSearchParams(stripped);
  const value = params.get(SHARE_PARAM);
  return value && value.length > 0 ? value : null;
}

export function shareFragment(recipe: BuddyRecipe): string {
  return `#${SHARE_PARAM}=${encodeShare(recipe)}`;
}

/** Absolute share URL for the current origin (the only thing Web Share /
 *  clipboard ever receives). */
export function buildShareUrl(origin: string, recipe: BuddyRecipe): string {
  return `${origin.replace(/\/$/, "")}${SHARE_PATH}${shareFragment(recipe)}`;
}

export function buildRemixUrl(recipe: BuddyRecipe): string {
  return `${REMIX_PATH}${shareFragment(recipe)}`;
}
