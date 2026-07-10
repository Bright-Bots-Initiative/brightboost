/**
 * sound_duet content validator — the security boundary for Echo Avenue
 * creations (Set 3 · slot 3).
 *
 * STRICT-PARSED FROM DAY ONE: every object level uses zod `.strict()`, so
 * unknown/extra JSON keys are REJECTED, not stored — the same deliberate
 * divergence from the key-tolerant Data Dash validator (#668) that
 * raceTrack.ts made. Do not replicate that gap in new creation types.
 *
 * Validity guard: ≥1 recorded event, all events on the declared band's grid,
 * sound ids in the closed allowlist, per-layer event caps, and a
 * payload-size cap as defense-in-depth.
 *
 * Mirror note: SOUND_IDS and the band grid sizes duplicate
 * src/components/games/echoAvenue/echoAvenueModel.ts across the boundary
 * (the Data Dash card-pool pattern) — keep them in sync.
 */
import { z } from "zod";
import type { ContentValidation } from "./creationContent";

const SOUND_IDS = [
  "step",
  "stomp",
  "clap",
  "tap",
  "chime",
  "twinkle",
  "whoosh",
  "breeze",
] as const;

const MAX_EVENTS_PER_LAYER = 64;
export const MAX_DUET_PAYLOAD_CHARS = 8192;

// k2 = 4 pulses × 2 subdivisions = slots 0..7; g35 = 8 × 2 = 0..15
const GRID_SLOTS: Record<"k2" | "g35", number> = { k2: 8, g35: 16 };
const BAND_PULSES: Record<"k2" | "g35", number> = { k2: 4, g35: 8 };

const eventSchema = z
  .object({
    t: z.number().int().min(0).max(15),
    soundId: z.enum(SOUND_IDS),
  })
  .strict();

const soundDuetSchema = z
  .object({
    v: z.literal(1),
    name: z.string().min(1).max(24),
    band: z.enum(["k2", "g35"]),
    pulses: z.union([z.literal(4), z.literal(8)]),
    layers: z
      .object({
        lead: z.array(eventSchema).max(MAX_EVENTS_PER_LAYER),
        partner: z.array(eventSchema).max(MAX_EVENTS_PER_LAYER),
      })
      .strict(),
    spots: z.array(z.enum(["tunnel", "puddle"])).max(2),
  })
  .strict();

/** Defense-in-depth: the strict schema already bounds every field, but a cap
 *  on serialized size guards against anything the schema math missed. */
export function exceedsDuetPayloadCap(content: unknown): boolean {
  try {
    return JSON.stringify(content).length > MAX_DUET_PAYLOAD_CHARS;
  } catch {
    return true; // unserializable (cycles) → reject
  }
}

export function validateSoundDuet(content: unknown): ContentValidation {
  if (exceedsDuetPayloadCap(content)) {
    return { ok: false, error: "duet payload too large" };
  }
  const parsed = soundDuetSchema.safeParse(content);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue.path.join(".") || "content";
    return { ok: false, error: `${path}: ${issue.message}` };
  }
  const duet = parsed.data;

  if (duet.pulses !== BAND_PULSES[duet.band]) {
    return { ok: false, error: "pulses do not match the band's cycle" };
  }
  const slots = GRID_SLOTS[duet.band];
  const events = [...duet.layers.lead, ...duet.layers.partner];
  if (events.length === 0) {
    return { ok: false, error: "duet needs at least one recorded event" };
  }
  for (const ev of events) {
    if (ev.t >= slots) {
      return { ok: false, error: "event outside the cycle grid" };
    }
  }
  return { ok: true };
}

/** Server-authoritative title: the kid's token-built name (schema-bounded;
 *  tokens come from approved pools client-side — no free text reaches here
 *  that the 24-char schema cap doesn't already bound). */
export function deriveSoundDuetTitle(content: unknown): string | null {
  if (typeof content !== "object" || content === null) return null;
  const name = (content as { name?: unknown }).name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
