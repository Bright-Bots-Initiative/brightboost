import { z } from "zod";

export const MOVES = ["tap", "spin", "block"] as const;
export const POSES = ["up", "wide", "low"] as const;
export const LIGHTS = ["triangle", "circle", "square"] as const;
export const CLUES = ["pose", "light"] as const;
export const STYLES = ["careful", "bold", "tricky"] as const;
export const NAMES = ["comet", "sprout", "pebble"] as const;
export const REFLECTIONS = ["examples", "clue", "change"] as const;
export const FINISHES = ["bow", "handshake", "dance"] as const;
export const MAX_CARDS = 24;
export const MAX_BYTES = 4096;
export const MAX_BEATS = 18;
export type Move = (typeof MOVES)[number];
export type Clue = (typeof CLUES)[number];
export type Signals = {
  pose: (typeof POSES)[number];
  light: (typeof LIGHTS)[number];
};
export type Floor = 0 | 1 | 2 | 3;
export const FLOORS = [
  { partner: "pip", clue: "pose", seed: 31 },
  { partner: "tally", clue: "light", seed: 53 },
  { partner: "juno", clue: "pose", seed: 79 },
  { partner: "shuffle", clue: "pose", seed: 97 },
] as const;

const cardSchema = z
  .object({
    id: z.number().int().min(1).max(9999),
    pose: z.enum(POSES),
    light: z.enum(LIGHTS),
    move: z.enum(MOVES),
    source: z.enum(["practice", "coach"]),
    sparked: z.boolean(),
  })
  .strict();
export type Card = z.infer<typeof cardSchema>;
const draftSchema = z
  .object({
    version: z.literal(1),
    floor: z.number().int().min(0).max(3),
    cleared: z.number().int().min(0).max(4),
    clue: z.enum(CLUES),
    cards: z
      .array(cardSchema)
      .max(MAX_CARDS)
      .refine((cards) => new Set(cards.map((c) => c.id)).size === cards.length),
    style: z.enum(STYLES),
    name: z.enum(NAMES),
    reflection: z.enum(REFLECTIONS).nullable(),
    finish: z.enum(FINISHES),
    revisions: z.number().int().min(0).max(10000),
  })
  .strict()
  .refine((d) => d.floor <= d.cleared && (d.floor !== 0 || d.clue === "pose"));
export type Draft = z.infer<typeof draftSchema>;

export function parseDraft(raw: string | null): Draft | null {
  if (
    !raw ||
    raw.length > MAX_BYTES ||
    new TextEncoder().encode(raw).length > MAX_BYTES
  )
    return null;
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export function serializeDraft(draft: Draft): string {
  const raw = JSON.stringify(draft);
  if (!parseDraft(raw)) throw new Error("Invalid SparBots draft");
  return raw;
}
export const storageKey = (scope: string) => `brightboost:sparbots:v1:${scope}`;

/** Versioned integer mixer: every tie and tell is reproducible, never clock-based. */
function seeded(seed: number): number {
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}
export function counter(move: Move): Move {
  return MOVES[(MOVES.indexOf(move) + 2) % 3];
}
export function outcome(
  move: Move | null,
  partner: Move,
): "bot" | "partner" | "bump" {
  if (move === null) return "partner";
  if (move === partner) return "bump";
  return counter(partner) === move ? "bot" : "partner";
}

/** Pose and light cover all nine pairs; the distractor cannot predict the move. */
export function tell(
  floor: Floor,
  round: number,
  beat: number,
): Signals & { move: Move } {
  const phase = (beat + (FLOORS[floor].seed % 3)) % 9;
  const pose = phase % 3;
  const light = Math.floor(phase / 3);
  const feature = FLOORS[floor].clue === "pose" ? pose : light;
  const shift = floor === 3 && round > 0 ? 1 : 0;
  return {
    pose: POSES[pose],
    light: LIGHTS[light],
    move: MOVES[(feature + shift) % 3],
  };
}
/** Practice deliberately visits each relevant clue twice in six beats. */
export function practiceTell(floor: Floor, round: number, beat: number) {
  return tell(
    floor,
    round,
    floor === 1 ? (beat % 3) * 3 + Math.floor(beat / 3) : beat,
  );
}
export function referenceCards(floor: Floor, round = 0): Card[] {
  return [0, 1, 2].map((i) => {
    const signal = practiceTell(floor, round, i);
    return {
      id: i + 1,
      pose: signal.pose,
      light: signal.light,
      move: counter(signal.move),
      source: "practice",
      sparked: true,
    };
  });
}
export function starterCards(floor: Floor): Card[] {
  const cards = referenceCards(floor).slice(0, 2);
  return floor === 2
    ? cards.map((c) => ({ ...c, move: counter(c.move), sparked: false }))
    : cards;
}
export function newDraft(floor: Floor = 0, cleared = 0): Draft {
  return {
    version: 1,
    floor,
    cleared,
    cards: starterCards(floor),
    clue: "pose",
    style: "careful",
    name: "comet",
    reflection: null,
    finish: "bow",
    revisions: 0,
  };
}
export type Decision = {
  move: Move | null;
  matching: number[];
  voters: number[];
  confidence: "all" | "some" | "new";
  tied: boolean;
};
export function decide(
  cards: readonly Card[],
  clue: Clue,
  signal: Signals,
  seed: number,
): Decision {
  const matching = cards.filter((card) => card[clue] === signal[clue]);
  const candidates = matching.length ? matching : cards;
  if (!candidates.length)
    return {
      move: null,
      matching: [],
      voters: [],
      confidence: "new",
      tied: false,
    };
  const votes = MOVES.map(
    (move) => candidates.filter((card) => card.move === move).length,
  );
  const high = Math.max(...votes);
  const choices = MOVES.filter((_, i) => votes[i] === high);
  const move = choices[seeded(seed) % choices.length];
  return {
    move,
    matching: matching.map((c) => c.id),
    voters: candidates.filter((c) => c.move === move).map((c) => c.id),
    confidence: !matching.length
      ? "new"
      : high === matching.length
        ? "all"
        : "some",
    tied: choices.length > 1,
  };
}
export type Beat = {
  signal: Signals & { move: Move };
  decision: Decision;
  move: Move | null;
  outcome: ReturnType<typeof outcome>;
  coached: boolean;
};
export type Round = {
  index: number;
  bot: number;
  partner: number;
  beats: Beat[];
  coachUsed: boolean;
  result: "bot" | "partner" | "draw" | null;
};
export function newRound(index = 0): Round {
  return {
    index,
    bot: 0,
    partner: 0,
    beats: [],
    coachUsed: false,
    result: null,
  };
}
export function nextDecision(draft: Draft, round: Round): Decision {
  return decide(
    draft.cards,
    draft.clue,
    tell(draft.floor as Floor, round.index, round.beats.length),
    FLOORS[draft.floor].seed + round.index * 100 + round.beats.length,
  );
}
export function step(
  draft: Draft,
  round: Round,
  target: number,
  coach?: Move,
): Round {
  if (round.result) return round;
  const signal = tell(draft.floor as Floor, round.index, round.beats.length);
  const decision = nextDecision(draft, round);
  const coached =
    coach !== undefined && decision.confidence === "new" && !round.coachUsed;
  const move = coached ? coach : decision.move;
  const result = outcome(move, signal.move);
  const bot = round.bot + Number(result === "bot");
  const partner = round.partner + Number(result === "partner");
  const beats = [
    ...round.beats,
    { signal, decision, move, outcome: result, coached },
  ];
  return {
    index: round.index,
    bot,
    partner,
    beats,
    coachUsed: round.coachUsed || coached,
    result:
      bot >= target
        ? "bot"
        : partner >= target
          ? "partner"
          : beats.length >= MAX_BEATS
            ? "draw"
            : null,
  };
}
export function runRound(draft: Draft, index: number, target = 3): Round {
  let round = newRound(index);
  while (!round.result) round = step(draft, round, target);
  return round;
}
export function addCard(
  cards: Card[],
  signal: Signals & { move: Move },
  move: Move,
  source: Card["source"],
): Card[] {
  if (cards.length >= MAX_CARDS) return cards;
  // Reuse a free bounded ID instead of growing the identifier through rematches.
  const id = Array.from({ length: MAX_CARDS + 1 }, (_, i) => i + 1).find(
    (i) => !cards.some((c) => c.id === i),
  )!;
  return [
    ...cards,
    {
      id,
      pose: signal.pose,
      light: signal.light,
      move,
      source,
      sparked: outcome(move, signal.move) === "bot",
    },
  ];
}
