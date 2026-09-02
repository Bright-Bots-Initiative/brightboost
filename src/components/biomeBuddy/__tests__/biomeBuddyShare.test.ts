/**
 * Share-link codec: the URL describes the recipe; the app derives the result.
 * Every refusal is asserted by its typed error code, never by "not ok".
 */
import { describe, expect, it } from "vitest";
import {
  BIOMES,
  TRAIT_OPTIONS,
  computeStats,
  recipeKey,
  starterRecipe,
  type BuddyRecipe,
} from "../biomeBuddyModel";
import {
  SHARE_MAX_LENGTH,
  buildRemixUrl,
  buildShareUrl,
  decodeShare,
  encodeShare,
  fromWire,
  readShareParam,
  shareFragment,
  toWire,
} from "../biomeBuddyShare";

const sample = (): BuddyRecipe => ({
  version: 1,
  biome: "air",
  traits: {
    eyes: "compound_eyes",
    ears: "hidden_ears",
    nose: "spiracles",
    movement: "wings",
    covering: "feathers",
  },
  pattern: "warning",
  name: { adjective: "bold", noun: "glider" },
});

/** base64url without padding — the only form the codec emits or accepts. */
function b64url(text: string): string {
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function tamper(
  recipe: BuddyRecipe,
  mutate: (wire: Record<string, unknown>) => void,
): string {
  const wire = toWire(recipe) as unknown as Record<string, unknown>;
  mutate(wire);
  return btoa(JSON.stringify(wire))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

describe("round trip", () => {
  it("encodes to a URL-safe string and decodes to the same recipe", () => {
    const encoded = encodeShare(sample());
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded.length).toBeLessThan(SHARE_MAX_LENGTH);
    const result = decodeShare(encoded);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.recipe).toEqual(sample());
  });

  it("round-trips EVERY option of every category and every biome", () => {
    for (const biome of BIOMES)
      for (const category of Object.keys(
        TRAIT_OPTIONS,
      ) as (keyof typeof TRAIT_OPTIONS)[])
        for (const option of TRAIT_OPTIONS[category]) {
          const recipe = starterRecipe(biome);
          (recipe.traits as Record<string, string>)[category] = option;
          const back = decodeShare(encodeShare(recipe));
          expect(back.ok).toBe(true);
          if (back.ok) expect(recipeKey(back.recipe)).toBe(recipeKey(recipe));
        }
  });

  it("is deterministic and the decoded recipe derives identical stats", () => {
    expect(encodeShare(sample())).toBe(encodeShare(sample()));
    const back = decodeShare(encodeShare(sample()));
    if (!back.ok) throw new Error("expected ok");
    expect(computeStats(back.recipe)).toEqual(computeStats(sample()));
  });

  it("payload contains ONLY schema version + closed-enum ids (no PII, no stats, no text)", () => {
    const wire = toWire(sample());
    expect(Object.keys(wire).sort()).toEqual(["b", "n", "p", "t", "v"]);
    const json = JSON.stringify(wire);
    expect(json).not.toMatch(/sight|hearing|smell|agility/);
    expect(json).not.toMatch(/@|user|student|group|token|email|Bold Glider/i);
    // decoded text is a flat JSON of short ascii tokens
    const enc = encodeShare(sample());
    const padded =
      enc.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - (enc.length % 4)) % 4);
    expect(atob(padded)).toMatch(/^\{"v":1,"b":"air","t":\[/);
  });
});

describe("malformed input fails safely with a typed reason", () => {
  it.each([
    ["empty", "", "empty"],
    ["null", null, "empty"],
    ["undefined", undefined, "empty"],
    ["not base64url (spaces)", "abc def", "encoding"],
    ["not base64url (plus/slash)", "ab+cd/ef", "encoding"],
    ["base64 of non-JSON", b64url("hello there"), "json"],
    ["base64 of JSON array", b64url("[1,2,3]"), "shape"],
    ["base64 of JSON string", b64url('"just a string"'), "shape"],
    ["base64 of JSON null", b64url("null"), "shape"],
    [
      "padded base64 (never emitted) is refused as encoding",
      btoa("null"),
      "encoding",
    ],
  ])("%s → %s", (_label, input, error) => {
    const result = decodeShare(input as string);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(error);
  });

  it("oversized payload is refused before decoding", () => {
    const huge = "A".repeat(SHARE_MAX_LENGTH + 1);
    const result = decodeShare(huge);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("too_long");
    // exactly at the cap is still examined (and refused for content, not length)
    const atCap = decodeShare("A".repeat(SHARE_MAX_LENGTH));
    expect(atCap.ok).toBe(false);
    if (!atCap.ok) expect(atCap.error).not.toBe("too_long");
  });

  it.each([
    ["unknown version", (w: Record<string, unknown>) => (w.v = 2), "version"],
    ["unknown biome", (w: Record<string, unknown>) => (w.b = "lava"), "biome"],
    [
      "unknown category option",
      (w: Record<string, unknown>) => ((w.t as string[])[0] = "laser_eyes"),
      "trait_option",
    ],
    [
      "option of the wrong category",
      (w: Record<string, unknown>) => ((w.t as string[])[2] = "wings"),
      "trait_option",
    ],
    [
      "missing required category",
      (w: Record<string, unknown>) => (w.t = (w.t as string[]).slice(0, 4)),
      "traits",
    ],
    [
      "extra category",
      (w: Record<string, unknown>) =>
        (w.t = [...(w.t as string[]), "whiskers"]),
      "traits",
    ],
    [
      "traits not an array",
      (w: Record<string, unknown>) => (w.t = { eyes: "no_eyes" }),
      "traits",
    ],
    [
      "unknown field",
      (w: Record<string, unknown>) => (w.stats = { sight: 100 }),
      "unknown_field",
    ],
    [
      "unknown pattern",
      (w: Record<string, unknown>) => (w.p = "plaid"),
      "pattern",
    ],
    [
      "free-text name",
      (w: Record<string, unknown>) => (w.n = ["Catarina", "roamer"]),
      "name",
    ],
    [
      "name of wrong length",
      (w: Record<string, unknown>) => (w.n = ["bold"]),
      "name",
    ],
    [
      "numeric id",
      (w: Record<string, unknown>) => ((w.t as unknown[])[0] = 7),
      "shape",
    ],
    ["missing biome", (w: Record<string, unknown>) => delete w.b, "biome"],
  ])("tampered wire: %s → %s", (_label, mutate, error) => {
    const result = decodeShare(tamper(sample(), mutate));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe(error);
  });

  it("numeric 'stats' in the URL can never alter the derived result", () => {
    // 1. as an extra field: refused outright
    const withStats = decodeShare(
      tamper(sample(), (w) => (w.s = { sight: 100, agility: 100 })),
    );
    expect(withStats.ok).toBe(false);
    // 2. smuggled inside the traits array: refused as a non-string id
    const smuggled = decodeShare(
      tamper(sample(), (w) => ((w.t as unknown[])[4] = { agility: 100 })),
    );
    expect(smuggled.ok).toBe(false);
    // 3. a legitimate payload's stats come from the model, not the wire
    const legit = decodeShare(encodeShare(sample()));
    if (!legit.ok) throw new Error("expected ok");
    expect(computeStats(legit.recipe)).toEqual(computeStats(sample()));
    expect(
      (legit.recipe as unknown as Record<string, unknown>).stats,
    ).toBeUndefined();
  });

  it("fromWire refuses arrays, null, class instances and prototype-polluted objects", () => {
    expect(fromWire([]).ok).toBe(false);
    expect(fromWire(null).ok).toBe(false);
    expect(fromWire(new Date()).ok).toBe(false);
    const polluted = Object.create({ v: 1 });
    Object.assign(polluted, toWire(sample()));
    expect(fromWire(polluted).ok).toBe(false);
  });
});

describe("URL helpers", () => {
  it("builds an absolute share URL on the given origin with the fragment (never a query string)", () => {
    const url = buildShareUrl("https://example.org/", sample());
    expect(url.startsWith("https://example.org/biome-buddy/share#r=")).toBe(
      true,
    );
    expect(url).not.toContain("?");
    expect(readShareParam(new URL(url).hash)).toBe(encodeShare(sample()));
  });

  it("readShareParam tolerates copy/paste mangling and rejects empties", () => {
    const enc = encodeShare(sample());
    expect(readShareParam(`#r=${enc}`)).toBe(enc);
    expect(readShareParam(`#/r=${enc}`)).toBe(enc);
    expect(readShareParam(`#?r=${enc}`)).toBe(enc);
    expect(readShareParam(`#r=${enc}&x=1`)).toBe(enc);
    expect(readShareParam("#r=")).toBeNull();
    expect(readShareParam("")).toBeNull();
    expect(readShareParam("#foo=bar")).toBeNull();
  });

  it("remix URL points at the game page with the same fragment", () => {
    expect(buildRemixUrl(sample())).toBe(
      `/biome-buddy${shareFragment(sample())}`,
    );
  });
});
