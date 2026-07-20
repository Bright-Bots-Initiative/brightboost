# Set 3 · Game 1 — Track Maker & Rider (design doc)

> Status: **design — pending approval.** No game code is written yet.
> Lands against #676 (Set 3 "Mastery": creation-first set). Bar: `docs/design-principles.md`.
> Audience: K–2 primary (K–8 aware). Persists the kid's track as a `Creation` (`type: "race_track"`).

Set 3's identity is **mastery through making**: in Sets 1–2 kids *played* our games; in Set 3 they
*make the thing*. This is Set 3's first game — a build-your-own motorcycle track that the child then
rides. The arcade *feel* we're after is leaning a bike into curves and reading speed against the road.
That feel is the only inspiration: **no third-party name, logo, art, music, or likeness appears anywhere**
in this game — the concept, code, and copy are original.

---

## 1. Concept (one paragraph)

A child lays out a motorcycle track from a small palette of road pieces — straights, gentle curves,
sharp curves, boost pads, and a finish flag — then rides it. The bike drives itself; the only challenge
comes from **the track the child designed**: take a sharp curve too fast and the bike wobbles and
spins out — not a loss, but information about their own design. They edit, re-ride, name their track,
and share it to the group gallery, where classmates ride it too. The loop is *predict → build → ride →
see what your design does → tweak → share*.

---

## 2. Spiral mapping (every stage → a concrete UI moment)

Per `docs/design-principles.md §1`, the activity must move through **Imagine → Create → Play → Share →
Reflect** and loop back. Concrete moments:

| Stage | Concrete UI moment |
|-------|--------------------|
| **Imagine** | Opening card, icon-first, one line: *"What kind of track will you build — loopy, zoomy, twisty?"* A single "Start building" button. No blank void: a **starter segment** (start marker + one straight + finish flag) is already on the grid. |
| **Create** | Tap-to-place build grid. Palette (below) as large icon buttons; tap a piece, tap a cell to drop it; tap a placed piece to rotate, long-press/✕ to remove. Current track **name shown in the top bar**. A **"Show me ideas" pattern-book** button opens example shapes to browse and copy. |
| **Play** | Tap **"Ride!"** → the bike auto-advances along the path. **One input** (proposed: *press-and-hold to lean/slow through curves; release to speed up on straights*). Physics-lite: each piece has a safe-entry speed; too fast into a sharp curve → **wobble → spin-out → friendly beat**, bike backs up to just before that curve. **No lives, no game-over, no lost progress.** A spin-out is feedback on their design, never a fail state. |
| **Share** | Back on the build screen, **"Save"** stores the track in place; **"Share to gallery"** sets status → `SHARED`/`COMPLETE`. The track appears as a card in the existing group gallery (`GroupGallery.tsx`); classmates open it and **ride it** (read-only) via the creation player. |
| **Reflect** | After a ride, **one wondering question**, curious never corrective: *"Which part of your track was the trickiest to ride? What would you change?"* No score verdict, no "you passed." This is a **separate moment from Save/name** (see §4). |

Remixing a peer's track (open theirs → "Make my own version") loops back to **Imagine** — a stretch goal,
not v1.

**Who rides?** Proposed: **Boost** (the platform's existing robot mascot, already the on-screen character
in Boost Path Planner) rides the bike — keeps Set 3 visually consistent with the rest of the app. Open
question in §9.

---

## 3. Low floor, high ceiling, wide walls — the scaffolding (designed deliberately)

`docs/design-principles.md §3` is explicit: *"K–2 is more structured… The floor here is deliberately
supported — a starter template, a guided first step, a constrained set of choices — never a blank,
unguided void… Structure early, openness later. Both ends must exist."* This is the section built to
that bar. The following are stated as **requirements**, drawn from recent maker-game review lessons:

**3a. Guided K–2 start — a supported floor, not a blank canvas.**
- The grid opens with a **starter segment already placed**: `start → straight → finish`. The child is
  never staring at nothing; they extend a track that already rides.
- The palette is **constrained at first**: only `straight`, `gentle curve`, `finish` are available.
  `sharp curve` and `boost pad` are **locked** until the child has ridden a rideable track at least once.

**3b. Unlocks must announce themselves (scaffolding, not a silent change).**
- When a piece unlocks, it is **announced**: a small celebratory beat — *"You earned the Sharp Curve! Tap
  to try it."* — with the new palette button popping in (`bounce-in` from `game-effects.css`). A silently
  appearing button reads as a bug; an announced one reads as growth. This announce-beat is a hard
  requirement, not polish.

**3c. A pattern-book / manual of example shapes (low floor via examples, ceiling preserved).**
- A **"Show me ideas"** panel presents a handful of **example track shapes** (e.g. "The Big Loop," "The
  Zig-Zag," "The Speedway") the child can browse and **build from**. Examples show *possibility*, never
  dictate a single solution — the assembly is always theirs, so the ceiling stays open. This is the low
  floor delivered through worked examples rather than through removing choice.

**3d. Soft, escalating per-band targets (suggestions, never requirements).**
- Gentle, opt-in challenges that rise: *"Can you build a track with 2 curves the bike survives?"* →
  *"…with a boost pad before a straight?"* → *"…a track with a loop?"* Framed as *"try this"*, never
  gated. Meeting one earns a warm acknowledgement; ignoring it costs nothing.

**Ceiling & wide walls.** The grid, free piece placement, rotation, and (later) a larger `g3_5` grid with
more pieces give room to grow. Many valid tracks — loopy, long, minimal, tricky — are all "right." No one
correct track exists.

---

## 4. The save model (specified up front — not improvised)

Naming/saving and reflecting are **different beats**; conflating them confuses kids. Spec:

- **Explicit Save** saves the **current** track *in place*. First save = `POST /creations` (new row);
  every later save = `PATCH /creations/:id` on the **same row** (the backend PATCH is an in-place UPDATE,
  author-only). **Rename never forks a new draft** — renaming PATCHes the same row's title/name.
- **Autosave on navigate-away.** If the child leaves the build screen with unsaved changes, autosave
  fires (POST if new, PATCH if existing) so **nothing is lost**. A quiet "Saved ✓" beat, no modal.
- **Current track title is always visible** on the build screen (top bar), so "which track am I editing?"
  is never ambiguous.
- **Duplicate-name guard.** If the chosen name matches another of the child's tracks in the same course,
  **auto-suffix** a number ("Big Loop" → "Big Loop 2") — a non-blocking, K-2-friendly default rather than
  an error the child has to resolve. (Alternative: a gentle message. Open question §9.)
- **Naming UX (recommended): a structured name-kit, not free text.** The child taps an adjective chip +
  a noun chip (e.g. *Super* + *Loop* → "Super Loop"), optionally an emoji. This matches the existing
  creative-loop precedent (authoring uses *structured choices only, no free text* — see `CreateChallenge.tsx`),
  and it sidesteps the moderation cost of K-2 kids typing arbitrary text that classmates then see. The
  chosen name lives in `content.name` and is echoed by the server's `deriveCreationTitle("race_track", …)`
  so the server stays authoritative over the stored title. Rename = re-pick from the kit. (Free-text-with-filter
  is possible but carries a moderation cost — open question §9.)
- **Save/name is a build-screen action; Reflect is a post-ride wondering prompt.** They never share a
  screen or a button.

---

## 5. The mastery / STEM frame (what a 5–7-year-old actually learns)

By riding their own track, a child discovers **cause and effect** — more speed into a sharp curve makes
the bike spin out — which pushes them to **plan a sequence and lay out space** deliberately: put a straight
or a gentle curve before a sharp one so the ride survives. And because a spin-out is safe and re-editable,
they practice the core engineering habit of **iterate-and-improve**: the track is a hypothesis, the ride is
the test, the tweak is the revision.

---

## 6. Track validator spec (strict-parsed from day one)

Lives beside the Data Dash validator, in `backend/src/services/` (new `raceTrack.ts`), wired into the
`validateCreationContent` dispatch in `creationContent.ts`. **Content schema is strict-parsed with zod
`.strict()` on every object level from day one** — unknown/extra JSON keys are **rejected**, not stored.

> ⚠️ This deliberately **diverges** from the Data Dash validator, which is manual and (per #668) does
> **not** reject unknown keys — extra keys sail through and persist. The `race_track` validator must cite
> #668 in a code comment explaining why it uses `.strict()` and does not copy Data Dash's key-tolerance.

Proposed content shape (final field names settled in Phase B):

```jsonc
{
  "v": 1,
  "name": "Super Loop",                 // 1–24 chars, from the name-kit
  "grid": { "w": 8, "h": 8 },           // each 4..12 (size bounds)
  "pieces": [                            // 2..64 pieces
    { "x": 0, "y": 3, "type": "start",       "rot": 0 },
    { "x": 1, "y": 3, "type": "straight",    "rot": 0 },
    { "x": 2, "y": 3, "type": "gentleCurve", "rot": 90 },
    { "x": 2, "y": 4, "type": "finish",      "rot": 0 }
  ]
}
```

**Rideability / solvability guard** (analogous to Data Dash's solvability guard, adapted):
- exactly **one `start`** and **≥ 1 `finish`**;
- every piece **within grid bounds**; **no two pieces on the same cell**;
- the path is **connected start → finish** — walking each piece's entry/exit by its rotation reaches a
  finish (a broken/dangling track is rejected with a kid-friendly reason surfaced client-side);
- **size bounds** respected (min/max piece count, grid 4..12).

The frontend gets a mirror validator (`src/components/games/*Authoring.ts`) for instant author-time
feedback; the backend validator is the security boundary and re-checks on every save.

---

## 7. Slot, naming, and identifiers

**Slot.** Takes the **`set3-game-1`** placeholder in `STEM_SET_3_IDS` (`src/constants/stemSets.ts`).
Note a second Set 3 candidate — a **machine-programming game** — is in design by a teammate; it can take
`set3-game-2`, and slots 3–5 remain open. I only claim slot 1 and leave the rest untouched.

**Identifiers** (following the three-name convention — game key `snake`, activity ID `kebab`, module slug
`k2-stem-<kebab>`):

| Layer | Value |
|-------|-------|
| Activity ID (replaces `set3-game-1`) | `track-maker` |
| Game key (`gameRegistry.ts` + seed) | `track_maker` |
| Module slug (seed) | `k2-stem-track-maker` |
| Creation type (allowlist) | `race_track` |
| Component | `TrackMakerGame.tsx` |

**Original name proposals (you pick one before Phase B):**
1. **Boost Track Builder** — platform-consistent (Boost is the rider), says exactly what it is. *(my lean)*
2. **Loop & Lean** — evokes the curve-leaning feel; short, alliterative, original.
3. **Ramp Rider** — punchy, evokes boost pads/ramps and riding; original.

None reference any third-party title. Whichever you choose becomes the UI title; the internal identifiers
above stay stable regardless.

---

## 8. Principles self-audit (`docs/design-principles.md`)

| Principle | Verdict |
|-----------|---------|
| **1. Spiral is the spine** (Imagine→Create→Play→Share→Reflect) | ✅ All five stages mapped to concrete moments (§2), with Share via the real gallery and a distinct Reflect beat. |
| **2. Creators, not consumers** | ✅ The child *builds* the track; the entire challenge is their own design. They walk away with something they made and can share. |
| **3. Low floor, high ceiling, wide walls (banded)** | ✅ Supported floor: starter segment + constrained palette + pattern-book. Rising ceiling: unlocks, escalating soft targets, larger `g3_5` grid (later). Wide walls: many valid tracks (§3). |
| **4. Playground, not playpen** | ✅ Spin-outs are safe "mischief," re-editable, never a game-over. Voice is curious ("what would you change?"), never corrective. |
| **5. Measure creation, not completion** | ✅ Signals tracked: rides taken, tweaks made, tracks shared (`gameSpecific` telemetry). Stars reward creation depth (rideable track + iterations + soft targets), **not** speed. **No leaderboards, no kid-vs-kid times.** |
| **6. Adult is a guide, not a proctor** | ✅ Adults only *encourage* (existing "give a boost" counter). No grading of tracks. |
| **7. Screen use, not screen time** | ✅ Active making + iterating, not passive watching. |
| **8. Localizable from day one** | ✅ Every string keyed (`t()` + `defaultValue`); EN + ES written in v1; vi/zh-CN English placeholders. Content strings via `pickLocale`. |

**Platform wiring (no invention).** Built on `GameShell` exactly as existing games; completion reports the
standard five-field `GameResult` (`gameKey`, integer `score`/`total`, `streakMax`, `roundsCompleted`) →
`completeActivity` → XP/progress, byte-compatible with the existing contract. `score`/`total` measure
**creation milestones** (built a rideable track, rode it, met soft targets), keeping stars non-competitive.
Maker detail (rides, tweaks) rides in `gameSpecific` — but note the server currently **strips
`gameSpecific`** (#672), so v1 does **not** depend on its persistence; the durable artifact is the
`Creation` row. Set-completion/unlock mirrors the Set 1→Set 2 pattern (new `isSet2Complete`/`isSet3Locked`
helpers in `stemSets.ts`).

**Hard constraints honored.** Zero new Prisma migrations, zero `schema.prisma` changes — the track is a
`Creation` (`type: "race_track"`) with layout in the existing `content: Json`. `db-check` stays meaningful
(green); a red db-check on this PR would signal a real violation and stop the work.

---

## 9. Open questions (for you)

1. **Name** — pick 1 of the 3 in §7 (Boost Track Builder / Loop & Lean / Ramp Rider).
2. **Rider** — confirm **Boost** rides (platform-consistent), or prefer a generic unnamed bike/rider?
3. **Play input** — **press-and-hold-to-lean** (my proposal, maps to the leaning feel) vs. simpler
   **single-tap-to-brake**? Both are one-input and touch+mouse friendly.
4. **Naming UX** — **structured name-kit** (recommended; no free text, no moderation cost) vs.
   free-text-with-filter?
5. **Duplicate name** — **auto-suffix** (recommended) vs. gentle message?
6. **Peer rides recorded?** — Data Dash treats peer plays as *for fun, not progress*. Recommend the same
   for track rides (rides don't post progress). OK?
7. **Grade banding** — ship **K-2 first**, add the `g3_5` (bigger grid/more pieces) overlay in a later pass
   (mirroring how Rhyme & Ride staged its band)? Or band in v1?
8. **Visibility** (Phase C decision, flagged early) — when wired, make it student-visible immediately, or
   gate it until Set 3 has more games / leads sign off?

---

*Build order after approval: Phase B (component + unit-tested rules & strict validator) → Phase C
(integrate: `stemSets`, registry, seed both trees, `race_track` allowlist + gallery card) → Phase D
(verify + prove the no-schema constraint) → Phase E (PR against #676). No merge without your go.*
