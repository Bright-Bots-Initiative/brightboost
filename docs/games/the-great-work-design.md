# The Great Work · machine-creation studio (design doc)

> Status: **design v0.4, approved in concept.** This file is the repo-side carry-over of an AI-assisted
> draft and keeps that draft's own caveat: the **specifics (costs, footprint counts, part counts, tick
> budgets) are reviewed proposals, not ground truth** and are tunable during implementation. The rules
> marked authoritative here (the tick order, rotation-only matching, the area rule, the metrics
> firewall) are not tunable, and are called out as such where they appear.
> Lands against #676 (Set 3 "Mastery": creation-first) and #704 (The Great Work). Bar:
> `docs/design-principles.md`.
> Audience: K-2 primary, K-8 aware. A machine persists as a `Creation` of type `great_work_machine`,
> with its layout and tapes in the existing `content: Json`. Zero new Prisma models and zero migrations
> in Release 1. The simulation engine lives at `shared/greatwork-engine/`.

Scope tags used throughout: **[MVP]** Release 1 · **[P2]** Release 2 · **[P3]** Release 3.

---

## 1. Concept

A child decides what they want to make, then builds a machine that makes it on a repeating loop:
mechanical arms following a programmed instruction tape, plus passive glyphs that transform matter as
it crosses them. They run it, watch it produce the wrong thing or nothing at all, work out why, fix it,
and run it again. Then they name it, save it, revise it, and show it to the class. Build, run, watch it
fail, fix is literally the debug loop; an ordered tape is real sequencing, a machine looping until it
has made N products is a real loop, and diagnosing the wrong output is real debugging, all of it
wearing a machine costume instead of a code editor. A single product has many valid machines, so two
children making the same thing build visibly different ones. The studio ships first and the campaign is
a short tutorial that hands off to it, because "many right answers" only fully lands when the child
also chooses the question: handed a target, they are solving; picking the target, they are creating.

---

## Precedence: which source wins

This document is not the top of the stack, and it already says so three times without ever saying what
happens when two of those claims collide. Section 4.3 calls the reaction table "the single source of
truth for the game's chemistry"; sections 8.5 and 18.1 hand build mechanics to
`docs/architecture/shared-code.md`; section 19.1 hands the grade band to
`docs/architecture/grade-banding.md`. Each is right in isolation, and none of them says which document
an implementer follows when a section body, a register row and an architecture doc disagree. The
absence of that rule is the gap this section closes: without it two tickets can each cite this design
honestly, typecheck in isolation, and contradict each other at the seam where they meet.

The order, highest first:

| Rank | Source                                                                      | Governs                                                                                                               |
| ---- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1    | `docs/architecture/shared-code.md` and the landed S-2 shared-engine pattern | Where shared code lives, which consumer takes source and which takes emit, and the authoring constraints on `shared/` |
| 2    | The #704 decisions log                                                      | Anything it rules on, including the XP deferral and naming localization                                               |
| 3    | `docs/architecture/grade-banding.md`                                        | How a band reaches a game, and what a missing or invalid band falls back to                                           |
| 4    | This document's decisions register, R1 to R24 (section 23)                  | Product and mechanic decisions, always read together with the row's Status column                                     |
| 5    | This document's section bodies                                              | Everything else                                                                                                       |

Two things about reading that table.

Ranks 1 to 3 are inherited. Each of those three sources is already named as authoritative somewhere in
this document, and ordering them only writes down what was implicit. **Rank 4 above rank 5 is
derived.** No source material says that the register beats a section body; it is a judgement call made
here, on the grounds that a register row is a decision carrying a recorded status while a section body
is exposition that can fall out of date around it. It is written down precisely because it is a
judgement call: recorded, it can be overruled once and deliberately, instead of being re-decided
differently by every implementer who trips over a disagreement. If it is the wrong way round, change
this section rather than quietly following the other order.

Precedence resolves conflict, not detail. Underneath it the preamble's split still holds: the
specifics — costs, footprint counts, part counts, tick budgets — are reviewed proposals and are
tunable, while the rules called out as authoritative where they appear are not. Those are the tick
order (§8.2), rotation-only matching (§8.4), the area rule (§10) and the metrics firewall (§10). And a
superseded register row is kept rather than deleted, so "R19 says so" is never a citation on its own.
Read the Status column: the superseded text is still the text circulating in issue bodies, which is
exactly why it is still printed here.

---

## 2. Originality and IP (hard rules)

This game is mechanically inspired by an existing hex-grid alchemy-machine puzzle game written for
adults. The inspiration is acknowledged in design rationale and nowhere else. Read this section before
any asset, naming, or copy work.

Fair game, because it is the genre rather than anyone's expression: grabbing arms, passive
transformation glyphs, looping instruction tapes, cost / cycles / area metrics, and replay export.

Never copied: the inspiration's title or wordmark; its art in any form; its glyph icon designs and
sigil language; its atom art; its exact metal sequence (lead, tin, iron, copper, silver, gold); its UI
layout and colour scheme; any of its assets.

What that forbids concretely, during implementation and asset work:

- No third-party title appears in a component name, CSS class, route, game key, level key, asset
  filename, i18n key, test fixture name, or any user-facing string. Crediting the genre in a design
  comment or a PR body is fine; a component or an SVG named after another game is not.
- Glyph icons are drawn to our own glyph names (Simplify, Duplicate, Growth, Compression, Refinement,
  Affect, Realize, Unification, Destroy, Bond). They are not traced, re-lettered, or recoloured from
  another game's sigils.
- Atom art is drawn to our 17-element catalog (§4.1). Emoji are MVP placeholders so implementation is
  never art-blocked, and every element carries a distinct **shape** as well as a colour, because
  identity must never depend on colour alone.
- The ladder is Copper → Silver → Gold → Platinum → Emerald → Diamond. Do not "correct" it toward the
  classical planetary metals.
- No "for fans of ..." comparison appears in child-facing copy, store copy, or marketing.

Where we diverge on purpose: an original taxonomy (Essence plus four cardinals plus
Grass / Life / Death / Balance / Omni, a Copper-to-Diamond ladder, a generic Catalyst), original glyph
naming, no piston arms, a target designer, generated names, a group gallery, and creation-first
framing. The title _The Great Work_ is the historical alchemical concept, not anyone's asset. Chirality
(§8.4) we keep: it is a genre-standard rule, not an asset.

---

## 3. Design-principles alignment

The canonical core stance is that kids are creators, not consumers, and the test is _does a child walk
away with something they made?_ Our answer is a named, saved, shareable machine, persisted as a
`Creation`, which is the platform's literal implementation of that stance.

### 3.1 The Creative Learning Spiral, all five beats

Per `docs/design-principles.md §1`, an activity with only "Play" is incomplete; each stage has to be a
real, visible moment.

| Beat        | Canonical definition                                  | Concrete UI moment                                                                                                                                     | Scope                               |
| ----------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **Imagine** | Open prompt / blank-ish canvas: "what will you make?" | The target chooser: pick from the element palette or design a custom molecule. The last tutorial lesson asks it literally, "Make something. Anything." | [MVP]                               |
| **Create**  | The child builds or authors something of their own.   | Machine design: place glyphs, arms and dispensers on the hex board, then write each arm's instruction tape.                                            | [MVP]                               |
| **Play**    | They run it; outcomes are feedback, not failure.      | Run and Step, watching it execute, with the area overlay available (§10) and the curious-never-corrective copy of §9.                                  | [MVP]                               |
| **Share**   | They name it and show it, scoped appropriately.       | Name (generated, never typed), Save, then Share to the group gallery. Scope is the group, by platform design.                                          | [MVP]                               |
| **Reflect** | A gentle wondering prompt; remixing loops back.       | A post-run wondering prompt, then revise in place; remix closes the loop back to Imagine.                                                              | Prompt and revise [MVP]; remix [P2] |

### 3.2 The other principles

| Principle                                                                                 | Application                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2. Creators, not consumers                                                                | The studio is authoring, not answering. Choosing a target is designing a goal, not picking from a quiz.                                                                                 |
| 3. Low floor, high ceiling, wide walls, with the K-2 floor "never a blank, unguided void" | This changed the design: K-2 open mode never opens empty, it seeds a starter machine. The ceiling is multi-arm machines, tracks, the full glyph set, and self-designed targets.         |
| 4. Playground, not playpen; voice is curious, never corrective                            | Open mode has no fail state at all. Every failure string wonders rather than corrects (§9). Deliberately silly machines are savable and shareable.                                      |
| 5. Measure creation, not completion                                                       | What we log is machines built, iterations (runs plus revisions), machines shared, and remixes. Cycles, cost and area are never teacher-facing (§10).                                    |
| 6. Adult is a guide, not a proctor                                                        | The teacher view is the gallery of machines. `encouragements` is the adult's channel: a boost, not a grade.                                                                             |
| 7. Screen use, not screen time                                                            | Paired with an unplugged twin, Paper Machines: a printed hex board, element tokens, glyph cards, and a paper-strip arm that a partner runs one tick at a time.                          |
| 8. Localizable from day one                                                               | Every string keyed via i18next. Names are stored as stable token IDs and composed at read time, so a locale's pool can be added later with no migration and no stored name invalidated. |

On principle 5, one supersession. The draft proposed awarding XP for active (non-idle) studio time. The
#704 decisions log defers that: tracking stays (`Progress.timeSpentS` and the machine's own
`iterations` counter), but mutating `User.xp` is out of Release 1 pending a capped, server-verifiable
rule, because the meter is driven by a client heartbeat that a script can farm whatever the cap says.
Do not implement the active-time XP award.

---

## 4. The alchemy system

Every element is an atom; atoms bond into molecules (§6.3).

### 4.1 Element catalog

| Element  | Class      | Role                                     | Icon | Notes              |
| -------- | ---------- | ---------------------------------------- | ---- | ------------------ |
| Essence  | Base       | Neutral substance; fuel for duplication. | ◇    |                    |
| Fire     | Cardinal   | One of four primes.                      | 🔥   |                    |
| Water    | Cardinal   |                                          | 💧   |                    |
| Air      | Cardinal   |                                          | 💨   |                    |
| Earth    | Cardinal   |                                          | 🪨   |                    |
| Grass    | Derived    | Intermediate for the life/death branch.  | 🌱   | Water + Earth      |
| Life     | Derived    |                                          | 🌿   | Grass + Air        |
| Death    | Derived    |                                          | 💀   | Grass + Fire       |
| Balance  | Derived    | Rare terminal element; a marquee target. | ☯    | Death + Life → two |
| Omni     | Derived    | Quintessence.                            | ✨   | 4 cardinals        |
| Copper   | Ladder [1] | First rung.                              | 🟤   |                    |
| Silver   | Ladder [2] |                                          | ⚪   |                    |
| Gold     | Ladder [3] |                                          | 🟡   |                    |
| Platinum | Ladder [4] |                                          | ⬜   |                    |
| Emerald  | Ladder [5] |                                          | 🟢   | Ordinary rung      |
| Diamond  | Ladder [6] | Top rung.                                | 💎   | Ordinary rung      |
| Catalyst | Special    | Consumed to promote one rung.            | ⚗️   |                    |

Seventeen elements, and the count is load-bearing enough to assert in a test. Emoji are MVP
placeholders; per §2 every element must also carry a distinct shape, so identity never depends on
colour alone. This catalog is also the target palette the child chooses from.

### 4.2 The refinement ladder [n]

Copper(1) → Silver(2) → Gold(3) → Platinum(4) → Emerald(5) → Diamond(6)

Climbed by Compression (`[n] + [n] → [n+1]`) or Refinement (`[n] + Catalyst → [n+1]`). Gems behave as
ordinary rungs, with no special-casing. Promotion caps at Diamond: promoting a Diamond returns a
Diamond rather than erroring. This ladder is the arithmetic and counting spine of the game.

### 4.3 Reaction table, single source of truth

| Reaction       | Inputs                     | Outputs            | `capsAtDiamond` | Notes             |
| -------------- | -------------------------- | ------------------ | --------------- | ----------------- |
| Simplify       | 1 Cardinal                 | 1 Essence          | `false`         | Any cardinal      |
| Duplicate      | Essence + 1 Cardinal       | 2 of that Cardinal | `false`         | Essence consumed  |
| Growth         | Water + Earth              | Grass              | `false`         |                   |
| Affect (Death) | Grass + Fire               | Death              | `false`         |                   |
| Affect (Life)  | Grass + Air                | Life               | `false`         |                   |
| Realize        | Death + Life               | Balance + Balance  | `false`         | Two outputs       |
| Unification    | Fire + Water + Air + Earth | Omni               | `false`         | Four inputs       |
| Compression    | [n] + [n]                  | [n+1]              | `true`          | Same rung         |
| Refinement     | [n] + Catalyst             | [n+1]              | `true`          | Catalyst consumed |
| Destroy        | any 1 atom                 | ∅                  | `false`         | Disposal          |

Exactly ten rows, and this table is the single source of truth for the game's chemistry. It is encoded
once, in the engine, as a frozen constant, and never re-keyed by hand into the UI or the backend: the
frontend and the backend hold physically separate copies of the compiled engine, so a divergent
hand-written table is skew that nothing would detect. Encode inputs as predicates (a specific element,
an element class, a ladder rung bound as `n`, or "any"), not as expanded element lists. Five of the ten
rows are class-generic or rung-generic, and expanding them yields roughly thirty rows that drift from
this table the first time a row is tuned.

`capsAtDiamond` is a real per-row field on `ReactionDef` and not a note about two of the rows. The cap
is the §4.2 rule that promoting a Diamond returns a Diamond rather than erroring, and the only two
rows that promote are Compression and Refinement, so every other row carries `false` explicitly. Made
a field, it is exhaustively checkable — a test walks all ten rows and asserts the flag is set on
exactly those two — where a note in the Notes column is prose that the next tuning pass can drop
without anything noticing.

The table is encoded once, frozen, and asserted frozen. `Object.freeze` is shallow, and both of these
tables are arrays of objects that themselves hold arrays: freezing `REACTIONS` leaves every row, every
predicate and every slot list mutable, so freeze the nested entries too and assert `Object.isFrozen`
on a row rather than only on the collection. That matters more here than it would in a single-process
app, because the frontend and the backend hold physically separate copies of the compiled engine
(§18.2): a mutation applied to one copy at runtime is skew, and nothing else in the system would
detect it.

---

## 5. Glyphs (transformations)

A glyph is a fixed, passive tile. When the atoms it requires occupy its cells on a tick, it transforms
them. Glyphs do not move and are not programmed; all of the timing comes from the arms that feed them.

Footprints are **not** "one cell per input." A footprint is the hex cells the glyph occupies: inputs
plus outputs plus any consumable cell. A single cell can be both an input and an output, which is how
"converts in place" works.

| Glyph       | Rule                                      | Footprint (cells and shape)                                               | Cost (¤) | Scope |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------------- | -------- | ----- |
| Simplify    | Cardinal → Essence                        | 1: single hex; converts in place.                                         | 20       | [MVP] |
| Duplicate   | Essence + Cardinal → 2 Cardinal           | 2: adjacent pair, the Cardinal's hex plus the hex where the copy appears. | 20       | [MVP] |
| Growth      | Water + Earth → Grass                     | 3: two adjacent input hexes feeding a shared output hex (small "V").      | 20       | [MVP] |
| Compression | [n] + [n] → [n+1]                         | 3: two input hexes flanking a central output hex (short line).            | 20       | [MVP] |
| Refinement  | [n] + Catalyst → [n+1]                    | 2: metal hex plus adjacent Catalyst hex; metal promoted in place.         | 20       | [MVP] |
| Affect      | Grass + Fire → Death / Grass + Air → Life | 2: Grass hex plus adjacent reagent hex; product forms on the Grass hex.   | 20       | [MVP] |
| Realize     | Death + Life → Balance ×2                 | 4: compact diamond, two inputs and two outputs.                           | 30       | [MVP] |
| Unification | 4 Cardinals → Omni                        | 5: flower, a centre output hex ringed by four input hexes.                | 40       | [MVP] |
| Destroy     | any → ∅                                   | 1: single disposal hex.                                                   | 10       | [MVP] |

Costs are first-pass and tunable. Footprint counts are first-pass; the shapes are the design intent.

Storage and placement. A glyph is stored as `{ anchor, cellOffsets[], inputSlots[], outputSlots[] }`,
plus a consumable-slot list where a reaction eats a reagent (Refinement's Catalyst). `cellOffsets` are
offsets from the anchor in the glyph's own local space, with index 0 at the local origin, and the slot
lists are indexes into `cellOffsets` rather than coordinates, so one template works at any board
position. Directional footprints (the Growth "V", the Compression line, the Realize diamond) also need
a facing: the absolute cell for slot _i_ is the anchor plus the offset rotated by the glyph's facing.
Adding that facing to a placed glyph is a proposal, not a decision inherited from the draft, and it
needs a ruling before the glyph templates are frozen, because without it a V-shaped glyph can only ever
point one way.

The footprint table above gives cell counts and shapes. These are the slot indexes into each glyph's
own `cellOffsets`, in the same row order, and they are what an implementation actually encodes:

| Glyph       | `inputSlots`   | `outputSlots` | `consumeSlots` | Notes                                                         |
| ----------- | -------------- | ------------- | -------------- | ------------------------------------------------------------- |
| Simplify    | `[0]`          | `[0]`         | —              | Converts in place: one cell, both roles                       |
| Duplicate   | `[0, ?]`       | `[0, 1]`      | —              | The Essence input cell is unresolved; see below               |
| Growth      | `[1, 2]`       | `[0]`         | —              | Slot 0 is the shared output at the base of the "V"            |
| Compression | `[1, 2]`       | `[0]`         | —              | Slot 0 is the centre of the short line                        |
| Refinement  | `[0, 1]`       | `[0]`         | `[1]`          | Metal promoted in place on 0; the Catalyst on 1 is eaten      |
| Affect      | `[0, 1]`       | `[0]`         | —              | Product forms on the Grass hex, slot 0                        |
| Realize     | `[0, 1]`       | `[2, 3]`      | —              | Two in, two out on the compact diamond; no cell is shared     |
| Unification | `[1, 2, 3, 4]` | `[0]`         | —              | Slot 0 is the centre of the flower, ringed by the four inputs |
| Destroy     | `[0]`          | `[]`          | —              | An empty output list is correct, not a missing value          |

Three things this table settles.

A single cell appearing in both lists is the mechanism, not a mistake. It is the rule stated at the
top of this section, and it is visible four times here: Simplify, Duplicate, Refinement and Affect
all reuse a cell, three of them because they convert in place. Any acceptance criterion requiring
`inputSlots` and `outputSlots` to be disjoint is wrong, and would fail correct work on four of the
nine glyphs. The disjointness that placement validation does enforce is between _different parts'_
footprints — two glyphs, or a glyph and a dispenser or acceptor, may not share a cell — never within
one glyph's own slot lists.

Duplicate's second input is genuinely open. Its reaction takes Essence plus a Cardinal, but its
footprint is two cells described as the Cardinal's hex plus the hex where the copy appears, which
leaves the Essence with no declared cell. Either the footprint is three cells or the Essence is
consumed from one of the two, and the answer changes the glyph's cost line and its tutorial board in
T4. Settle it before the glyph templates are frozen; the `?` above is deliberate and must not be
guessed into a number.

`consumeSlots` is a third list beside inputs and outputs, not a subset flag on the input list. Only
Refinement uses it in Release 1. It exists because "consumed" and "read" are different fates for an
input atom: a consumed reagent's cell must be free afterwards, and a read input's cell may be written
by the same glyph in the same tick.

The bond glyphs of §6.3 are not in this table. They change bond topology rather than elements, so they
have no reaction inputs or outputs to index.
Glyphs, their inputs and their outputs may not overlap each other, so placement validation rejects two
footprints, or a glyph and a dispenser or acceptor, sharing a cell. Arms and tracks may pass over
glyphs freely, and a hex an arm merely swings across still counts toward area (§10).

Matching a footprint against the board, which is tick step 4 in §8.2. For each glyph, in declared part
order: compute the absolute input cells; every one of them must hold an atom or the glyph does not
fire; the multiset of those atoms' elements must satisfy the reaction's predicates as a multiset
assignment rather than positionally, so Unification's four cardinals fire in any arrangement, and every
rung-bound slot must bind the same rung; no input atom may already have been transformed this tick; and
every output cell must be free of any atom the glyph is not itself consuming, because a cell holds at
most one atom. Only then does it consume the inputs and emit the outputs.

All glyphs are available in the studio from the start. The tutorial introduces the first five in
sequence and the rest simply sit in the tray to be discovered. Tutorial and challenge levels carry a
per-level allow-list; the studio has none. Challenge levels teach glyphs, they never unlock them.

---

## 6. Machinery

### 6.1 Arms [MVP]

An arm anchors on a cell and reaches a fixed length to grab, hold, rotate and drop one atom, or a whole
bonded molecule. Two independent axes: grabber count and reach length. There are no extending or
retracting arms.

| Part       | Grabbers | Description                    | Cost (¤) | Scope |
| ---------- | -------- | ------------------------------ | -------- | ----- |
| Arm        | 1        | Single grabber. Floor default. | 20       | [MVP] |
| Double arm | 2        | 180° apart.                    | 30       | [P2]  |
| Triple arm | 3        | 120° apart.                    | 30       | [P2]  |
| Hex arm    | 6        | One per hex direction.         | 40       | [P2]  |

Reach is a fixed 1, 2 or 3 cells at any grabber count, costing +10¤ per cell beyond 1. Reach and
grabber count are static properties chosen at placement and never changed mid-run: there is no
change-reach affordance anywhere in the UI, and changing a reach means deleting the arm and placing a
new one, which re-costs it. A longer arm sweeps a wider arc, and every hex in that arc counts toward
area (§10), so reach is a genuine trade-off rather than a free upgrade. Grabbing and releasing operate
all grabbers at once.

One geometry question is open and blocks a scoring test. The draft gives grabber count and reach but
never says which hexes the body of a reach-2 or reach-3 arm occupies, nor which intermediate hexes a
60° sweep claims. The proposal on the table is every hex on the line from anchor to grabber tip, with a
rotation claiming the union of the start line, the end line, and the tip's swept arc. Freeze it in a
hand-computed fixture before asserting anything about area deltas.

### 6.2 Track [P2]

Connected cells, linear or looped. An arm standing on a track can `MOVE+` / `MOVE-` one cell along it.
5¤ per cell.

### 6.3 Bonds

| Glyph       | Rule                                | Footprint                           | Scope |
| ----------- | ----------------------------------- | ----------------------------------- | ----- |
| Single Bond | Bonds two adjacent unbonded atoms.  | 2: adjacent pair.                   | [MVP] |
| Triple Bond | Triple bond for specific molecules. | 3: triangular cluster.              | [P2]  |
| Unbond      | Removes a bond.                     | 2: adjacent pair spanning the bond. | [P2]  |

Bonds are what make a product a molecule rather than a loose atom, and bond topology is part of a
molecule's identity for matching (§8.4): the same atoms in the same places, bonded differently, are a
different molecule.

---

## 7. The instruction system

Each arm has an instruction tape, an ordered list executed one instruction per tick.

There is no branching, no conditionals, no variables, and no state a tape can read. All logic is
spatial arrangement and timing. That constraint is the point: it is what makes this a sequencing puzzle
instead of a visual programming language, and it is why two arms cooperating is a timing problem a
six-year-old can reason about by watching.

| Instruction              | Effect                                                                   | Scope |
| ------------------------ | ------------------------------------------------------------------------ | ----- |
| `GRAB`                   | Grab the atom at the grabber's cell (no-op if empty or already holding). | [MVP] |
| `DROP`                   | Release the held atom or molecule.                                       | [MVP] |
| `ROTATE_CW`              | Rotate the arm 60° clockwise about its anchor.                           | [MVP] |
| `ROTATE_CCW`             | Rotate 60° counter-clockwise.                                            | [MVP] |
| `WAIT`                   | Idle one tick.                                                           | [MVP] |
| `RESET`                  | Return the arm to its start state, then continue (§8.3).                 | [MVP] |
| `REPEAT`                 | Loop the tape from the start.                                            | [MVP] |
| `MOVE+` / `MOVE-`        | Move one cell along the track.                                           | [P2]  |
| `PIVOT_CW` / `PIVOT_CCW` | Rotate the held molecule about the grabber; the arm stays fixed.         | [P2]  |

The [P2] instructions are declared in the engine's instruction type from the start and left
unimplemented, so a tape carrying one is recognisably invalid rather than silently misread.

Tape UI: draggable chips on a horizontal timeline, one lane per arm. The K-2 floor is a three-slot tape
offering `GRAB` / `ROTATE_CW` / `DROP` only. The ceiling is unlimited multi-lane tapes.

---

## 8. The simulation engine (the deterministic core) [MVP]

Pure, deterministic, framework-free TypeScript with no rendering dependency, so the same module runs in
the browser for playback and headless in Node for verification and scoring. Identical inputs produce
identical outputs, tick for tick. This is non-negotiable, because server-authoritative scoring (§8.5)
and replay-based sharing both depend on it.

### 8.1 Board model

Hex grid, axial coordinates `{ q, r }`, integers only, with six standard neighbour offsets in a fixed
order that is itself the canonical direction index. A cell holds at most one atom; glyphs and arms may
coexist with atoms.

- Static: input dispensers, output acceptors, glyphs, tracks, arm anchors. Reach and grabber count are
  static properties of an arm.
- Dynamic: atoms (position, element, bonds) and arm state (angle, track index, held-atom reference).

No floating point and no pixel-space conversion belongs anywhere in the engine. Hex-to-pixel maths is
the renderer's job, and a `Math.sqrt` in the simulation is a determinism bug waiting to happen. Board
state is keyed by a canonical string key rather than by a bare number, because integer-like object keys
iterate in ascending numeric order regardless of insertion order, which would quietly make results
depend on coordinates instead of on declaration.

### 8.2 Tick loop (authoritative order, implement exactly)

These seven steps, in this order, are the contract. Implement them as seven named, separately testable
functions, and assert the call sequence in a test. Reordering them changes results.

1. **Input.** Each empty, eligible dispenser spawns its reagent. Cadence: at most one atom every two
   cycles.
2. **Instruction.** Read each arm's current instruction; apply all motions simultaneously.
3. **Collision.** Two atoms in one cell, or a molecule overlapping a static atom or wall, and the run
   errors (§9). Deterministic; no physics.
4. **Reaction.** For each glyph, if its required atoms occupy its cells, consume inputs and emit outputs
   per the reaction table (§4.3). Each atom undergoes at most one transformation per tick (except
   multi-bonding).
5. **Output.** A product molecule on an acceptor is consumed and recorded: target mode increments the
   match count, open mode logs whatever it was (§8.6).
6. **Tape advance.** Advance pointers, handling `RESET` and `REPEAT`.
7. **Win check.** Target mode only. Open mode has no win check.

Implementation notes that follow from that order rather than adding to it:

- Iterate dispensers, glyphs and acceptors in declared part-array index order, never by iterating a
  coordinate-keyed map. Contention between two glyphs competing for the same atom resolves to the lower
  declared index by rule, not by iteration accident.
- Step 1's eligibility is evaluated against the start-of-tick board, so two dispensers cannot observe
  each other's spawn, and the cadence derives from the integer tick counter, never from a wall clock.
  "One atom every two cycles" reads most naturally as a per-dispenser cooldown rather than a global
  even-tick gate; the two differ whenever a dispenser is blocked, so pick one, say which in a comment,
  and pin it in a fixture.
- "Apply all motions simultaneously" means double-buffer: snapshot every arm, compute all next states
  from the snapshot only, then commit together. No arm may observe another arm's post-move position.
  Sequential in-place mutation makes the result depend on array order and is the likeliest determinism
  bug in the file. Held molecules move with their arm, with the transitive drag computed from the
  snapshot bond graph.
- Step 3 is evaluated against committed post-move state. Several collisions can be simultaneous, so
  sort the candidates by `(tick, q, r, partId)` and report the first, or the error payload itself is
  nondeterministic. That key is a total order over distinct candidates — `partId` is the tie-break
  that stops the comparator ever returning zero for two different collisions — which is what makes the
  reported hex the same hex on every run, in the browser and in Node.
- Step 4's "at most one transformation per tick" is implemented as a per-tick set of transformed atom
  ids; a glyph fires only if none of its inputs is already in that set. Bond glyphs are the
  multi-bonding exemption. New atoms get fresh, monotonically increasing ids that are never reused, or
  bond graphs and product identity become order-dependent.
- Step 5's append order is the record: first-appearance tick and count both derive from it, so it has to
  be stable.
- Step 7 runs after step 5 in the same tick, so a machine that delivers on tick N reports `cycles = N`,
  not N+1. Pin that boundary in a test. It is exactly the kind of off-by-one that makes the server's
  score disagree with the animation the child just watched.
- `REPEAT` makes every tape an infinite loop by construction, and open mode has no win check, so a
  maximum tick count is mandatory. Reaching it is a result (`error: tick_limit`), never a thrown
  exception, so a machine built to run forever degrades gracefully instead of failing a request.

Area accumulates inside steps 1 to 5 and is never recomputed at the end (§10).

### 8.3 RESET semantics

`RESET` returns the arm to its initial angle and track position over the implied sub-steps, carrying
whatever it holds. Unit-test this first, before anything else in the tick loop: RESET timing is the
classic off-by-one source in this genre. The cases that matter are RESET as the first, middle and last
chip on a tape, and RESET while holding a molecule.

Its tick cost is genuinely unresolved and has to be answered before the tick loop is written rather than
guessed at during implementation. One instruction is one tick, but a RESET that unwinds three rotations
plausibly costs three. The suggested reading is `max(shortest rotation distance, track-index distance)`
ticks. Every `cycles` value depends on the answer, and so does client-server score agreement.

### 8.4 Molecules and output matching

A grabbed atom drags everything bonded to it transitively, and rotation or pivot transforms the whole
molecule rigidly.

The matching rule: a product matches up to rotation only. Reflections do not match, because molecules
are chiral. Canonicalise over the 6 rotations and match if any one is equal. Do not include reflections
in the canonical set. A future contributor who "fixes" a red mirror test by widening the canonical set
to twelve has silently reversed this rule, so assert the count of six in the matching tests with a
comment saying why.

Canonicalisation, in order: translate so the lexicographically smallest occupied cell sits at the
origin, so the key does not depend on where on the board the molecule happened to be built; then for
each of the six rotations, rotate, re-translate, sort the `(q, r, element)` tuples lexicographically,
and serialise, with bonds serialised as sorted unordered position pairs plus bond order; then return
the lexicographically smallest of the six strings.

The three axial transforms that order needs, written down once so nobody re-derives them: 60°
clockwise is `(q, r) -> (-r, q + r)`, 60° counter-clockwise is `(q, r) -> (q + r, -q)`, and the mirror
is `(q, r) -> (q, -q - r)`. Each is pinned by its own test, which applies it six times to a cell away
from the origin and asserts the result is the input again — six 60° steps are a full turn, and six
reflections are three round trips, so an identity that is off by a sign fails in that test rather than
at the far end of a canonicalisation where it looks like a matching bug.

Chirality needs a safety net, not an exception. Accidentally building the mirror image is the classic
way to lose an hour in this genre: the machine looks right and the output silently is not. Keeping the
rule means making the diagnosis instant. When a produced molecule matches the target under reflection
but not under rotation, the engine sets `mirrored: true` and the UI says so outright (§9). A mirrored
product is never also a solved one. The child still fixes it; they never have to discover it. That is
the difference between a hard rule and a cruel one.

The predicate is exactly
`canonicalize(reflectMolecule(p)) === canonicalize(t) && canonicalize(p) !== canonicalize(t)`. Reflect,
canonicalise over the same six rotations, and require that the unreflected product does not already
match, which is what keeps "never also a solved one" true in code rather than only in prose.
`reflectMolecule` touches positions only: it never rewrites an element and never rewrites a bond
order, because a reflection is a change of handedness and not a change of chemistry, and a reflection
that quietly edited the molecule would make the diagnosis wrong in the one place the child is being
asked to trust it.

### 8.5 Determinism and server authority

The engine returns `{ solved, cycles, cost, area, instructions, produced[], mirrored?, error? }`. That
field list is the contract with every consumer: do not add to it and do not rename within it.

The server re-runs every submitted machine and computes the authoritative score. Client numbers are
display-only. A submitted machine is untrusted input, so the server-side run is wrapped in a wall-clock
budget on top of the engine's own tick limit.

Two supersessions matter here, because the original draft reads otherwise:

- Server-authoritative scoring is Release 1, not Release 2. The draft's decisions register filed it
  under later phases; that row is stale. Re-running server-side is what makes the shared engine
  critical path, and it ships in the first release.
- The engine's placement and build mechanics. The draft specified plain TypeScript with relative
  imports, no aliases and no build output. The shared-code spike rejected that, and
  `docs/architecture/shared-code.md` is now authoritative: the frontend consumes engine source through
  the `@shared/*` alias, the backend consumes built output through the package name, and the shared
  build is wired into the backend's build and typecheck. The draft's file layout inside
  `shared/greatwork-engine/` still stands, and §8.7 states it; its build story does not. Do not
  restore it.

Because those two consumers hold physically different artifacts, a stale or divergent build is a silent
wrong-numbers failure rather than a crash. The engine's own suite therefore owns a freshness and parity
guard: recompile to a temporary directory and byte-compare against the committed build output, then run
every golden fixture through both the source import and the built artifact and assert the serialised
results are byte-equal.

### 8.6 Open-mode product report [MVP]

`produced[]` lists every distinct molecule delivered to an acceptor, with its count and its
first-appearance tick. In target mode it is a record; in open mode it is the entire point, because open
mode has no win condition and the report is what tells the child what they made. It powers the
generated title, the discovery log, and adopt-a-discovery, which turns "look what came out" into "now
make six of those". It is reporting only and changes nothing in the tick loop.

### 8.7 The engine's public surface

Everything below is the engine's exported API. It is stated here rather than left to the
implementation because four other tickets are written against it before a line of it exists, and
because two of those consumers hold physically different artifacts (§18.1): a type that is only
implied is a type that lands twice.

One tag convention. `[P]` marks a declaration that is a proposal rather than a decision inherited from
the reviewed draft, so a reviewer can see at a glance which lines they are being asked to approve and
which merely restate a settled rule. `[P2]` marks Release 2 surface that is declared from Release 1
and left unimplemented, so a tape carrying one is recognisably invalid rather than silently misread
(§7). Untagged declarations are specified elsewhere in this document, and the comment says where.

The type surface, in dependency order:

```ts
// board
export interface Axial {
  readonly q: number; // §8.1: integers only, never a float
  readonly r: number;
}
export type HexDir = 0 | 1 | 2 | 3 | 4 | 5; // indexes NEIGHBOURS; ROTATE steps by 1 (§7)
export type CellKey = string; // canonical "q,r" (§8.1: never a bare number key)

export interface Cell {
  // [P]
  readonly at: Axial;
  readonly atomId: AtomId | null;
  readonly glyphId: GlyphId | null;
  readonly staticId: PartId | null;
}
export interface Board {
  // [P]
  readonly cells: ReadonlyMap<CellKey, Cell>;
  readonly bounds: { minQ: number; maxQ: number; minR: number; maxR: number };
}

// chemistry (§4)
export type ElementId =
  | "essence"
  | "fire"
  | "water"
  | "air"
  | "earth" // the four cardinals
  | "grass"
  | "life"
  | "death"
  | "balance"
  | "omni" // the five derived
  | "copper"
  | "silver"
  | "gold"
  | "platinum"
  | "emerald"
  | "diamond" // ladder rungs 1 to 6
  | "catalyst"; // seventeen in total (§4.1), and the count is asserted
export type ElementClass =
  | "base"
  | "cardinal"
  | "derived"
  | "ladder"
  | "special";
export interface ElementDef {
  readonly id: ElementId;
  readonly cls: ElementClass;
  readonly icon: string;
  readonly shape: string; // §4.1 and §19.2: identity never depends on colour alone
  readonly rung?: 1 | 2 | 3 | 4 | 5 | 6; // §4.2, ladder members only
}

// matter
export type AtomId = number; // fresh, monotonic, never reused (§8.2 step 4)
export interface Atom {
  readonly id: AtomId;
  readonly element: ElementId;
  readonly at: Axial;
}
export type BondOrder = 1 | 3; // [P]; single is [MVP] and triple is [P2] per §6.3
export interface Bond {
  readonly a: AtomId;
  readonly b: AtomId;
  readonly order: BondOrder;
}
export interface Molecule {
  // one connected component, relative to its own canonical origin (§8.4)
  readonly atoms: ReadonlyArray<{
    readonly element: ElementId;
    readonly at: Axial;
  }>;
  readonly bonds: ReadonlyArray<{
    readonly a: number; // indexes into atoms, not AtomIds
    readonly b: number;
    readonly order: BondOrder;
  }>;
}

// glyphs (§5, §6.3)
export type GlyphKind =
  | "simplify"
  | "duplicate"
  | "growth"
  | "compression"
  | "refinement"
  | "affect"
  | "realize"
  | "unification"
  | "destroy" // the nine of §5
  | "bond_single"; // §6.3
export interface GlyphDef {
  readonly kind: GlyphKind;
  readonly cellOffsets: ReadonlyArray<Axial>; // glyph-local space, index 0 at the origin
  readonly inputSlots: ReadonlyArray<number>; // indexes into cellOffsets, never coordinates
  readonly outputSlots: ReadonlyArray<number>;
  readonly consumeSlots: ReadonlyArray<number>; // [P]; §5's "any consumable cell"
  readonly cost: number;
  readonly reactionId: ReactionId;
}
export type GlyphId = number;
export type PartId = number;
export interface Glyph {
  readonly id: GlyphId;
  readonly kind: GlyphKind;
  readonly anchor: Axial;
  readonly facing: HexDir; // [P]; the open placement-orientation call in §5
}

// reactions (§4.3)
export type ReactionId =
  | "simplify"
  | "duplicate"
  | "growth"
  | "affect_death"
  | "affect_life"
  | "realize"
  | "unification"
  | "compression"
  | "refinement"
  | "destroy"; // exactly ten, matching §4.3 row for row
export type InputPred =
  | { readonly kind: "element"; readonly element: ElementId }
  | { readonly kind: "class"; readonly cls: ElementClass }
  | { readonly kind: "ladder"; readonly bind: "n" } // Compression and Refinement
  | { readonly kind: "any" }; // Destroy: not an ElementClass, and typing it as one will not compile
export type OutputSpec =
  | { readonly kind: "element"; readonly element: ElementId }
  | { readonly kind: "promote"; readonly from: "n" }; // §4.2, caps at Diamond
export interface ReactionDef {
  readonly id: ReactionId;
  readonly inputs: ReadonlyArray<InputPred>;
  readonly outputs: ReadonlyArray<OutputSpec>;
  readonly capsAtDiamond: boolean; // true on compression and refinement only
}

// machinery (§6.1, §6.2, §7)
export type GrabberCount = 1 | 2 | 3 | 6;
export type Reach = 1 | 2 | 3; // static at placement; there is no change-reach affordance
export interface Arm {
  readonly id: PartId;
  readonly anchor: Axial;
  readonly grabbers: GrabberCount;
  readonly reach: Reach;
  readonly facing: HexDir;
  readonly trackIndex: number; // [P2], §6.2
  readonly held: ReadonlyArray<AtomId>; // all grabbers act at once (§6.1)
}
export type Instruction =
  | "GRAB"
  | "DROP"
  | "ROTATE_CW"
  | "ROTATE_CCW"
  | "WAIT"
  | "RESET"
  | "REPEAT"
  // [P2], declared from Release 1 and left unimplemented:
  | "MOVE_PLUS"
  | "MOVE_MINUS"
  | "PIVOT_CW"
  | "PIVOT_CCW";
export interface Tape {
  readonly armId: PartId;
  readonly chips: ReadonlyArray<Instruction>; // one chip per tick, one lane per arm (§7)
}

// engine input
export interface MachineSpec {
  readonly parts: ReadonlyArray<Part>;
  readonly tapes: ReadonlyArray<Tape>;
} // and nothing else; §16.2 fixes its relationship to the persisted envelope
export type Part =
  | {
      readonly kind: "arm";
      readonly id: PartId;
      readonly anchor: Axial;
      readonly grabbers: GrabberCount;
      readonly reach: Reach;
      readonly facing: HexDir;
    }
  | { readonly kind: "glyph"; readonly id: PartId; readonly glyph: Glyph }
  | {
      readonly kind: "dispenser";
      readonly id: PartId;
      readonly at: Axial;
      readonly element: ElementId;
    }
  | { readonly kind: "acceptor"; readonly id: PartId; readonly at: Axial }
  | {
      readonly kind: "track";
      readonly id: PartId;
      readonly cells: ReadonlyArray<Axial>;
    }; // [P2]

// Level definitions live in src/constants/greatWorkLevels.ts (§16.3); the TYPE lives here.
// This document specifies no level schema, so every field below is [P]. Do not read §16.2's
// payload example as one: those lines describe a saved machine's content, not a level.
export interface LevelSpec {
  readonly key: string; // T1 to T8 now, C1 to C12 later (§12)
  readonly mode: "target" | "open"; // §11.2
  readonly gradeBand: "k2" | "g3_5"; // §19.1: injected by the platform, never inferred here
  readonly targetProduct?: Molecule;
  readonly targetCount?: number; // §11.4 and R15: 3 for K-2 and the tutorial, 6 for grades 3-5
  readonly fixedParts: ReadonlyArray<Part>; // R11: levels fix inputs, the studio does not
  readonly allowedGlyphs?: ReadonlyArray<GlyphKind>; // §5's allow-list; absent in the studio
  readonly maxTicks: number; // mandatory: REPEAT makes every tape an infinite loop (§8.2)
}

// results
export type RunError =
  | { readonly kind: "collision"; readonly at: Axial; readonly tick: number } // §8.2 step 3
  | { readonly kind: "stall"; readonly tick: number } // §9
  | { readonly kind: "tick_limit"; readonly tick: number }; // [P]; a result, never a throw
export interface ProducedEntry {
  readonly canonical: string;
  readonly molecule: Molecule;
  readonly count: number;
  readonly firstTick: number; // §8.6: append order is the record
}
export type ProductReport = ReadonlyArray<ProducedEntry>;
export interface RunResult {
  // §8.5's field list verbatim: do not add to it and do not rename within it
  readonly solved: boolean;
  readonly cycles: number;
  readonly cost: number;
  readonly area: number;
  readonly instructions: number;
  readonly produced: ProductReport;
  readonly mirrored?: boolean; // §8.4 and R9
  readonly error?: RunError;
}
export interface TickResult {
  // [P]; the per-tick projection the build surface plays back
  readonly tick: number;
  readonly board: Board;
  readonly arms: ReadonlyArray<Arm>;
  readonly deliveredThisTick: ReadonlyArray<Molecule>;
  readonly areaClaimed: ReadonlySet<CellKey>; // the same set §10's overlay draws
  readonly error?: RunError;
}
```

The function surface, by module:

```ts
// index.ts
export function runMachine(level: LevelSpec, program: MachineSpec): RunResult;
export function runMachineTraced(
  level: LevelSpec,
  program: MachineSpec,
): Iterable<TickResult>; // [P]

// board.ts (§8.1)
export const NEIGHBOURS: readonly Axial[]; // six offsets, and their order is the direction index
export function neighbour(a: Axial, d: HexDir): Axial;
export function add(a: Axial, b: Axial): Axial;
export function key(a: Axial): CellKey;
export function rotate(a: Axial, steps: number): Axial; // 60° per step, about the origin
export function reflect(a: Axial): Axial; // used only by mirror detection (§8.4)

// reactions.ts (§4)
export const ELEMENTS: Readonly<Record<ElementId, ElementDef>>; // 17 entries
export const LADDER: readonly ElementId[]; // index + 1 is the rung; gems are ordinary rungs (R8)
export const REACTIONS: readonly ReactionDef[]; // exactly ten rows
export const GLYPHS: Readonly<Record<GlyphKind, GlyphDef>>;
export function promote(el: ElementId): ElementId; // caps at Diamond rather than erroring (§4.2)
export function resolveReaction(
  id: ReactionId,
  inputs: readonly ElementId[],
): readonly ElementId[] | null;

// matching.ts (§8.4)
export function canonicalize(m: Molecule): string; // the minimum over the six rotations only
export function matches(product: Molecule, target: Molecule): boolean;
export function isMirrorOf(product: Molecule, target: Molecule): boolean; // sets RunResult.mirrored

// scoring.ts (§10)
export function partCost(p: Part): number; // the §5 and §6.1 tables, +10¤ per reach cell beyond 1
export function totalCost(program: MachineSpec): number;
export function countInstructions(program: MachineSpec): number;

// tick.ts (§8.2) — internal, exported for tests
export function step(state: SimState): SimState; // exactly one tick, pure, input never mutated
```

`runMachineTraced` **must delegate to the same `step()` that `runMachine` uses and must never be a
second implementation.** Two loops over the same rules is the same failure as two copies of the engine
(§18.2), one board smaller: the child watches the traced run, the score comes from the untraced one,
and the two disagree with nothing turning red. The traced entry point exists to expose intermediate
state, not to re-derive it.

Eight files, and this is the layout section 8.5 is referring to when it says the draft's file layout
still stands:

```
shared/greatwork-engine/
  index.ts       public API: runMachine, runMachineTraced, and the re-exports
  types.ts       every type above
  board.ts       hex grid, axial coordinates, neighbours, rotate, reflect
  tick.ts        the §8.2 loop, as seven named functions plus step()
  reactions.ts   the §4.3 table, the element catalog, and the §5 glyph templates
  matching.ts    canonicalisation over six rotations (§8.4)
  scoring.ts     cycles, cost and area (§10)
  __tests__/     Vitest, with RESET timing and the reaction rows first (§8.3)
```

Build the files in that dependency order: `board.ts`, then `reactions.ts`, then `tick.ts` with RESET
first, then `matching.ts`, then `scoring.ts`. The layout is settled. The build story around it is not
this document's to settle and belongs to `docs/architecture/shared-code.md` (§18.1).

---

## 9. Failure modes: curious, never corrective

Every one of these is a run outcome, not an error dialog. The middle column is the design; the right
column is what we never ship.

| Situation                   | Say                                                                                                                                       | Never say                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Wrong product (target mode) | "It made Grass. You were going for Gold, want to see where it changed?"                                                                   | "Incorrect."                  |
| Mirror image (`mirrored`)   | "So close, it's built backwards, like a reflection. Try assembling it the other way round." Show the target and the product side by side. | "Invalid product."            |
| Collision                   | "Two pieces bumped into each other here."                                                                                                 | "Error."                      |
| Stall                       | "It ran, but nothing came out. What could it be missing?"                                                                                 | "Failed."                     |
| Open mode, any output       | "Your machine makes Grass!"                                                                                                               | (no wrong answer exists here) |

Never a stack trace, never a score penalty. The right-hand column is not decoration; it is the string
set to grep for in review.

---

## 10. Scoring and metrics

Completion is binary. Optimisation is optional and lives entirely in the Reflect layer, so a child who
wants to make their machine smaller or faster can, and a child who does not is not behind.

| Metric       | Definition                                                                                                         | Scope |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | ----- |
| Cycles       | Ticks to produce the required outputs.                                                                             | [MVP] |
| Cost         | Sum of ¤ for every placed part: arms, reach, tracks, glyphs. Inputs and outputs are free.                          | [MVP] |
| Area         | Every hex occupied by any part or atom by the time the final product completes, including hexes merely swung over. | [MVP] |
| Instructions | Total chips across all tapes.                                                                                      | [P2]  |

`instructions` is a [P2] surface, not a [P2] computation. The engine returns it from Release 1 because
it is part of the result contract (§8.5); Release 1 simply does not display it.

The area rule is counter-intuitive and load-bearing: a long arm swinging a molecule claims every hex it
passes through, including the intermediate hexes of a 60° sweep. That is what makes reach a trade-off
rather than a free upgrade, and it is how the game teaches compactness without ever using the word.
Accumulate the claimed hexes into a set as the run proceeds and expose that set per tick, because
Release 1 ships a "show area" overlay during playback so the claimed hexes are visible rather than
merely scored. Three things go into that set, and all three are required:

1. every static part's footprint at tick 0, so an unused glyph still costs area;
2. every atom's position on every tick it exists, not only where it ends up; and
3. every hex the body of an arm **and each of its grabbers** passes through during a 60° rotation,
   the intermediate sweep included and not just the start and end positions.

`area` is the size of that set, and the same set is what the overlay draws, so the number and the
picture can never disagree. Component 3 is the one that gets dropped, and it is the whole point: drop
it and a reach-3 arm costs the same area as a reach-1 arm, reach becomes a free upgrade, and the game
stops teaching compactness. Which hexes an arm body occupies is the open question recorded in §6.1;
what is not open is that the sweep counts, so freeze the geometry there first and this rule then reads
off it unchanged.

Personal bests reuse the existing per-student per-game record, keyed `"great_work"`, holding best
cycles, best cost, best area and per-target bests in its existing metadata field. No new table.
Histograms of the three metrics, grouped by product because only same-product machines are comparable,
are [P2] and are never a gate.

The firewall. Cycles, cost and area are in-game flavour for the child and nothing else. What we log for
adults is machines built, iterations, machines shared, and remixes, per principle 5. No teacher-facing
surface shows cycles, cost or area, and in the K-2 band metrics are hidden from the child's own UI as
well. A dashboard, export, or report that surfaces them is a principle violation, not a feature request.

---

## 11. Creator Studio

The studio is the centre of gravity of the product. Everything else in Release 1 exists to make it worth opening.

**Scope rule, stated once and honoured everywhere:** if Release 1 has to shrink, tutorial lessons go first, then challenge levels. The studio is never the cut. This is recorded in three places (the parent issue #704, this section, and #724's body) precisely so that a schedule squeeze cannot quietly reinterpret it. Whatever is trimmed is trimmed as absent data or configuration, never as a disabled control and never by widening a test.

### 11.1 The loop

Imagine (pick or design what to make) → Create (build) → Play (run it; it fails) → fix → Share (name, save, show) → Reflect (a wondering prompt; revise; remix loops back into Imagine).

The loop is implemented as a pure reducer, `studio/studioMachine.ts`, so every transition is testable without React. States:

| State     | Meaning                                                                    |
| --------- | -------------------------------------------------------------------------- |
| `SHELF`   | My Shelf: saved machines as cards. The entry screen.                       |
| `IMAGINE` | Palette, designer, or "just build".                                        |
| `BUILD`   | The builder is mounted. Mode derives from whether a target is set.         |
| `RUN`     | Transport active; the reducer is a spectator.                              |
| `RESULT`  | Result sheet: what it made, the reflect prompt, optional metrics, actions. |
| `NAMING`  | Name picker with reroll, as a modal over `RESULT`.                         |

Transitions worth pinning: `BUILD + RUN` increments `iterations`; `RUN + RESET` does not. `RESULT + FIX` returns to `BUILD` and persists nothing. `RESULT + ADOPT` is section 11.5. `RESULT + SAVE` is a `POST` on first save and a `PATCH` on every save after. `CLEAR_TARGET` is legal from any state and returns the machine to open mode with the program untouched.

### 11.2 Availability and the three ways in

The studio is open from the very beginning. Creation is never gated behind the tutorial, behind a level, or behind an unlocked glyph. All glyphs are available in the studio from the first session; challenge levels teach glyphs, they never unlock them.

On first entry a dismissible nudge appears: "New here? The lessons teach you the tools first, want to try those?" with _Show me the lessons_ and _I'll explore_. It is a suggestion, never a wall. It reappears at most once per session until the tutorial is done or it has been dismissed twice, and it is never implemented as a route guard. The dismissal counter is client-local state, and the once-per-session and dismissed-twice thresholds are data, not magic numbers inside a component.

There are three routes into a build, and exactly two persisted modes.

| Route           | What the kid does                                                                                     | Resulting mode | Fail state                 |
| --------------- | ----------------------------------------------------------------------------------------------------- | -------------- | -------------------------- |
| Palette         | Picks a product from the reachable-product palette.                                                   | `target`       | Normal run feedback        |
| Target designer | Assembles the molecule they want on a small hex pad, bonds it, sets a count.                          | `target`       | Normal run feedback        |
| Open            | Places inputs, glyphs and arms with no declared target and runs it. The engine reports what came out. | `open`         | None. Output is discovery. |

`content.mode` stays a binary `"target" | "open"`. The designer is a route into target mode, not a third value, and no code should introduce one. A fourth entry point, adopt-a-discovery, converts an existing `open` machine to `target` in place; it is covered in 11.5 because it belongs to the Play beat rather than the Imagine beat.

### 11.3 The palette is a closure, not a list

Any reachable product is selectable, with no per-band curation. The palette is computed as a closure over the reaction table given the glyphs currently available; it is never a hardcoded array. An unreachable target is a broken promise, and a hardcoded list is how that promise gets broken six months from now when a reaction changes.

```ts
export function reachableProducts(
  catalog: ElementCatalog,
  reactions: ReactionTable,
  availableGlyphs: GlyphKind[], // studio: all glyphs. Level: the per-level allow-list.
): Molecule[]; // pure BFS to fixpoint over the reaction table
```

Test it by falsification: remove Growth from `availableGlyphs` and assert Grass leaves the palette. A hardcoded array cannot pass that test, which is the reason to write it that way round.

### 11.4 Target designer and open mode

The target designer lets the kid place atoms on a small hex pad, bond them, and set a count; that molecule becomes the goal. It runs the same reachability check as the palette but warns gently rather than blocking: "You'd need a Growth glyph for this." The _Set as target_ control stays enabled. This is the strongest Imagine moment in the game and the real "set your own conditions" affordance. It is a 3-5 surface; K-2 gets the palette only.

Open mode has no target and no win check. The engine's produced list is the whole report, and there is no wrong answer to have.

In the K-2 band, open mode is never an empty board. It always seeds a starter machine: one arm, a dispenser, three instructions already on the tape, doing something small when run. The kid begins by changing something that already works. The 3-5 band gets the genuinely blank canvas. The starter ships as data beside the level constants, exported as `K2_STARTER_MACHINE`, and is verified headlessly by running it through the engine and asserting it produces something.

Default target count is 3 for K-2 and the tutorial, 6 for 3-5 and challenges, and is kid-adjustable.

### 11.5 Adopt-a-discovery

This is the single most important interaction in the studio. An open-mode accident can be adopted as a declared target: "Make this on purpose." The machine converts to target mode with that product as the goal. A mistake becomes an intention, the debug loop is now aimed at the kid's own stated goal, and the loop closes from Play straight back into Imagine.

Trigger: state `RESULT`, mode `open`, and a non-empty produced list. One affordance per distinct produced entry, ordered by first appearance tick so the first thing the machine ever made is offered first; beyond three entries, show three and a "something else it made" disclosure. Never auto-adopt. There is nothing to adopt after a stall or a collision, because nothing was produced.

The state change is exactly this:

```
mode:          "open"    -> "target"
targetProduct: undefined -> produced[i].molecule
targetCount:   undefined -> band default (3 K-2 / 6 grades 3-5), kid-adjustable
program:       UNCHANGED   <- this is the whole point
iterations:    UNCHANGED   <- adopting is not a run
studio state:  RESULT    -> BUILD
```

Adopt never forks and never double-creates. If the machine is already saved, it issues exactly one `PATCH` and zero `POST`s; if it is unsaved, which is the common path, it mutates local state and issues no request at all, and the next Save posts once.

It is reversible: the _Make:_ chip is tap-to-change-or-clear, and clearing returns the machine to open mode with the program still intact. Reversibility is what makes it safe to offer a six-year-old.

Two mechanical consequences to build for. First, the target matching and run feedback that were dormant in open mode switch on for the first time, on a machine the kid already watched succeed; the first post-adopt run will reproduce the product at least once, because the engine is deterministic, so the real work is the count. Do not celebrate at 1 of 3; celebrate at 3 of 3. Second, adopting can never itself set the mirrored flag, because the molecule is adopted as produced and matches itself under identity rotation. Assert that; it is the subtle way to get chirality wrong.

### 11.6 Name, save, revise

Naming is generated, never typed. Two adjectives and a noun drawn from curated pools: Brave Copper Engine, Sleepy Golden Kettle, Tiny Bubbling Forge. Reroll gives a new name until they like one. Reroll is the agency; the pools are the safety. There is no free text from kids anywhere in this game, which removes text moderation from the product entirely and matches the platform's keyboard-free K-2 posture (students sign in with an icon and a four-digit PIN). Section 13 specifies the token and pool scheme.

Save and share map directly onto the existing `CreationStatus` enum with no custom client state machine:

| Kid action                  | Status        | Meaning                                  |
| --------------------------- | ------------- | ---------------------------------------- |
| Save, still working         | `IN_PROGRESS` | Private draft, author only               |
| Share while still tinkering | `SHARED`      | Visible in the group gallery, unfinished |
| Share a finished machine    | `COMPLETE`    | Finished and visible to the group        |

Unfinished machines are savable and shareable. There is no `solved` gate on Name, Save, Duplicate or Share; a stalled machine with an empty produced list can be named, saved and shared. Writing `disabled={!solved}` on any of those buttons is the easiest way to violate this by accident, so it gets an explicit test.

Revise is open, change, save again, in place. Saving bumps `updatedAt` and increments `content.iterations`. There is no version history, which is exactly why Duplicate is Release 1 and not a later phase: with no history, Duplicate is the "save a copy before a risky change" safety net, and it is what makes destructive revision safe. Duplicate deep-copies the content, clears the creation id, resets `iterations`, draws a fresh name seed, and records the source id for later remix lineage. Export and import of machine JSON is a Release 2 item.

A duplicate title is never an error. Reuse the existing auto-suffixing helper so "Big Loop" becomes "Big Loop 2" rather than blocking a K-2 kid with a dialog.

### 11.7 The reflect prompt

After a run, one gentle wondering line appears on the result sheet: "What surprised you?", "What would you change first?" It rotates from a small pool, requires no input, and is never scored. The picker is context-aware and prioritised: mirrored first, then stall, then first-ever run, then solved, then a default. Exactly one prompt renders per result sheet.

### 11.8 What the studio measures

Machines built, iterations (runs plus revisions), machines shared, and later remixes. Never completion percentage. A kid who builds one machine and revises it eleven times is the success case, and the analytics have to say so. Cycles, cost and area are in-game flavour and never appear on an adult-facing surface.

### 11.9 Studio screens

My Shelf lists saved machines as cards (name, product icon, solved tick, last edited) and is the entry to revise. The build canvas carries the parts tray, the instruction timeline, and a _Make:_ chip showing the target, tappable to change or clear. The run bar carries Run, Step, Reset, a speed control, and the area-overlay toggle. The result sheet shows what it made, the wondering prompt, optional metrics, and the actions: Name and Save, Duplicate, Share.

---

## 12. Tutorial

Eight lessons, each introducing exactly one idea, and then it opens. The tutorial's only job is to teach the tools. It is not a gate: the studio is available alongside it from the first session, and a kid who never opens lesson 1 must still be able to reach a named, saved machine.

Level definitions live in code, in `src/constants/greatWorkLevels.ts`, following the established challenge-content precedent in `src/constants/ctfChallenges.ts`. Each entry defines its fixed inputs, target and count, per-level allow-list of glyphs and parts, board bounds and scaffolding. Adding a lesson is a pull request, not a migration. Tutorial and challenge levels carry an allow-list; the studio has none.

Inputs are fixed in levels and freely placed in the studio. Every T1 to T7 entry declares its dispensers, and no tutorial level permits kid-placed dispensers. Every T1 to T7 entry has a target count of 3.

| #   | Title          | Concept taught                            | Instructions and parts unlocked                                   | Board setup                                                        | Success condition                                                                                    |
| --- | -------------- | ----------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| T1  | First Move     | Grab, rotate, drop: an arm follows a tape | `GRAB`, `ROTATE_CW`, `DROP`; one 1-grabber reach-1 arm; no glyphs | Water dispenser, arm adjacent, acceptor one 60 degree step away    | 3 Water delivered                                                                                    |
| T2  | Turn It Around | Multiple rotations and orientation        | `ROTATE_CCW`; `WAIT` and `RESET` optional                         | Same arm; dispenser and acceptor two to three rotation steps apart | 3 of one cardinal, with a solution needing at least two rotate chips                                 |
| T3  | Break It Down  | A glyph transforms whatever crosses it    | Simplify glyph, fixed on the board; no new instruction            | Fire dispenser, Simplify on the carry path, acceptor               | 3 Essence, with the tape unchanged from T2. The unchanged tape is the whole lesson                   |
| T4  | Two From One   | One atom in, two atoms out                | Duplicate glyph                                                   | Fixed Essence and Fire dispensers, Duplicate, acceptor             | 3 Fire. Two activations produce four: the first "I overshot" moment, not a failure                   |
| T5  | Stick Together | A product made of two atoms               | Single Bond glyph                                                 | Two fixed dispensers, acceptor sized for a two-atom product        | 3 of the bonded molecule. A two-cell molecule is achiral on hex, so the mirror rule cannot bite here |
| T6  | Make Grass     | A reaction with more than one input       | Growth glyph                                                      | Water and Earth dispensers, acceptor                               | 3 Grass. Both atoms must be on the glyph on the same tick                                            |
| T7  | Double Up      | Two of a rung make the next rung up       | Compression glyph                                                 | Two Copper dispensers, acceptor                                    | 3 Silver, so 6 Copper, which makes dispenser cadence visible for the first time                      |
| T8  | Your Studio    | You pick what to make                     | None; the studio has no allow-list                                | No fixed board                                                     | No target, no count, no fail state, no win check                                                     |

Two authoring traps. The K-2 floor tape is three slots holding `GRAB`, `ROTATE_CW` and `DROP`, which leaves no room for a `REPEAT` chip, so either the tape loops implicitly or T1's tape is four slots; author T1 only after the engine settles tape-loop semantics. T2 needs grab, two rotates and a drop, so its tape is at least four slots and deliberately exceeds the floor. Where `RESET` is introduced is not fixed by design; T2 is the recommendation, since `REPEAT` without `RESET` drifts the arm's angle across loops.

### T8 is not a level

T8 is the hinge: the moment the game stops asking and starts offering. It opens the studio in open mode with a single prompt, "Make something. Anything." When the machine produces anything at all, the game names it and offers _Name it_, _Save it_, _Share it_. The kid leaves owning an object with a name.

Structurally it must not be a level definition. Its entry is a handoff marker with no target product, no target count and no allow-list, typed distinctly enough that the T1 to T7 solvability suite cannot iterate over it, and any code path running a win check against it is a bug. Its implementation belongs to the studio ticket, not the content ticket. This is the item most likely to get quietly turned back into a level, so it is worth an explicit test.

Every level T1 to T7 is verified solvable headlessly by running a committed reference program through the engine in Node and asserting it solves. A lesson with no passing reference program fails the build. Each lesson's allow-list is a superset of its predecessor's, and no lesson adds a new glyph and a new instruction in the same step.

---

## 13. Naming and copy

### 13.1 Why the naming scheme is what it is

Names are generated from stable token ids rather than typed, which removes text moderation from the product and lets a pre-reader name their machine by rerolling. The rendered string goes to `Creation.title`; the tokens go to `content.nameSeed`, so a name is composed at read time from seed plus locale and switching language re-renders it rather than freezing word order into the database.

### 13.2 Superseding the one-shared-pool design

An earlier draft of this design proposed one shared, untranslated word pool with each locale supplying only slot order, so that a Spanish user would see "Forge Brave Copper". **That design is superseded and must not be implemented.** The requirement is stable tokens plus curated per-locale pools, or an explicitly documented fallback. One reordered untranslated pool is insufficient.

The reason is not tidiness. The repository carries a live localization backlog: leaf-key counts in `src/locales/<lng>/common.json` currently run roughly 1969 for `en`, 1690 for `es`, 1526 for `vi` and 1488 for `zh-CN`, with several open issues tracking missing keys across creative-loop surfaces. New untranslated user-facing strings have a real, already-measured cost here, and a naming scheme that ships English words into four locales by design adds to a debt someone is already paying down.

### 13.3 Token scheme

Three pools per locale, one per slot, not one pool sampled twice. Two adjective slots drawn from a single pool produce "Brave Sleepy Engine"; the examples put temperament or size in slot 1 and material or texture in slot 2, and the pools must encode that.

```
adj1: "a1.brave"   "a1.sleepy"    "a1.tiny"
adj2: "a2.copper"  "a2.golden"    "a2.bubbling"
noun: "n.engine"   "n.kettle"     "n.forge"

nameSeed = { adj1: "a1.brave", adj2: "a2.copper", noun: "n.engine", poolLocale: "en" }
```

Every pool value matches `/^(a1|a2|n)\./` and resolves to a key under `games.greatWork.names.*` in the locale JSON. Rendered strings live in the locale files, where translators already work. Pool _membership_ lives in code. That separation is what makes a curated pool structurally different from a reordered English pool: a Spanish pool can contain tokens English lacks and omit ones that do not translate.

`poolLocale` is a fourth field beyond the originally declared seed shape. It is a payload change, not a migration, because the column is JSON, but it is an architecture call that belongs to the build lead rather than to the implementer.

### 13.4 Pool data shape

`src/constants/greatWorkNamePools.ts`:

```ts
export type NameSlot = "adj1" | "adj2" | "noun";

export interface LocaleNamePool {
  locale: string; // "en" | "es" | "vi" | "zh-CN"
  curated: boolean; // false means this is a fallback record, not a pool
  fallbackOf?: string; // required when curated === false
  template: NameSlot[]; // en: ["adj1","adj2","noun"]   es: ["noun","adj1","adj2"]
  slots: Record<NameSlot, string[]>; // token ids, never display strings
}

export const GREAT_WORK_NAME_POOLS: Record<string, LocaleNamePool>;
```

Slot order stays per-locale, and it does differ: one fixed seed renders as "Brave Copper Forge" in `en` and "Forge Brave Copper" in `es`. Slot order is a rendering detail, though, not a translation strategy, and it is not a substitute for a curated pool.

### 13.5 The fallback contract

The word _documented_ is load-bearing, because the obvious helper is silent by construction. The repository's `pickLocale` helper resolves `map[lang] ?? map.en ?? fallback`, which swallows a missing locale with no record anywhere. Calling it on the pools and stopping there is exactly the implementation this decision forbids.

The contract:

1. Resolve the locale: `User.preferredLanguage`, then `Course.defaultLanguage`, then `en`.
2. If that locale's registry entry is not `curated: true`, draw tokens from the `en` pool but keep the locale's own declared `template` slot order.
3. Record the fallback in the payload: `nameSeed.poolLocale` is the locale the tokens actually came from, so a later curation pass can find every name that needs re-rendering.
4. Document it in prose: a locale and curation table in a committed doc under `docs/`, naming which locales are curated and which fall back.
5. Never render an English token through a foreign template without step 3.

Release 1 ships curated `en` and `es`. `vi` and `zh-CN` have no curated pool and render the English pool under their own template, which is stated plainly in the table and in a comment beside the pools. Adding a curated pool later is a token-to-string map swap plus a registry entry: no migration, and no stored name invalidated. Every directory under `src/locales/` is either curated or carries a `curated: false` record with a non-empty `fallbackOf`; a locale absent from the registry fails the test.

Test curated pools by mechanism, not by output. Assert that each curated locale supplies its own `slots` rather than a reference to or copy of the English object, and that a locale switch causes the lookup to consult that locale's pool. Do not assert that a rendered Spanish name differs from the English one: cognates and loanwords render identically in several locales, and an output-difference assertion fails correct work.

Reroll draws a new seed on every press and never repeats the previous seed twice consecutively; the pools must admit at least two distinct renderable names for that guarantee to be satisfiable.

### 13.6 Copy conventions

All user-facing strings go through i18next under `games.greatWork.*`, in the single `translation` namespace, landing in `en` and `es` at minimum and mirrored into `vi` and `zh-CN` with the English value plus a translate marker, per `docs/i18n.md` and `docs/agents/rules/20-i18n.md`. Non-UI content data such as element names and level titles uses the localized-content helper rather than `t()`.

Existing keys are reused, not duplicated. `creations.status.*` already maps one to one onto `CreationStatus`, and `gallery.*` already covers by-line, boosts, empty state and untitled, so the gallery needs almost no new copy.

Two mechanical checks keep the voice honest. A key-extraction test walks the Great Work source directory and asserts every `t()` key resolves in `src/locales/en/common.json`, following the existing translation-integrity test for the Set 2 games. A copy lint over locale JSON values under `games.greatWork.*` asserts that no user-facing string contains "Incorrect", "Invalid", "Error", "Failed", "Wrong" or "Try again", reusing the banned-word regexes the quiz i18n parity test already ships. The engine's internal error field is not user-facing and is never rendered verbatim; it selects a key.

---

## 14. Sharing and the group gallery

Visibility is group-scoped only. There is no school-wide scope, no public scope, and therefore no approval queue. A shared machine is a `Creation` whose `courseId` is the kid's group, which may be a teacher class or a parent home group.

Sharing is immediate. The kid taps Share, the status moves to `SHARED` or `COMPLETE`, and it is in the gallery. There is no teacher gate, no pending state, no rejection path and no reviewer role. The scope is the safety: a group is the kid's own class or home group, and generated names mean there is no free text to moderate. Everything that passes validation is auto-approved.

Unsharing is a first-class action. A kid can move a machine back to `IN_PROGRESS` at any time. Freedom to share requires freedom to unshare. The status write never touches `content`, so unsharing preserves the machine exactly.

Every one of these transitions is the same author-only status update:

```
IN_PROGRESS -> SHARED      share while still tinkering
IN_PROGRESS -> COMPLETE    share a finished machine
SHARED      -> COMPLETE    finish something already shared
COMPLETE    -> SHARED      keep tinkering on a finished machine
SHARED      -> IN_PROGRESS unshare
COMPLETE    -> IN_PROGRESS unshare
```

`SHARED` is therefore always kid-initiated by construction, and adults have no endpoint that changes a kid's status. A peer, teacher or admin attempting a status change is refused as not the author.

Whether a Share tap lands on `SHARED` or `COMPLETE` is decided by the server's stored solved value, not by a client claim. The cheapest correct rule is to derive it from the stored last run and ignore a disagreeing client value, scoped to this creation type so the other creation types keep their current behaviour.

The gallery reads group-scoped and status-filtered, showing shared and complete rows plus the viewer's own drafts, and never leaks across groups. Cards show name, product and author first name only. Opening a card plays the machine, which costs one JSON blob and no video (section 15).

Encouragements reuse the platform's existing adult-only, text-free counter. A teacher or parent in the group can give a boost; a student cannot, and no kid-to-kid reaction path is added. That is a deliberate decision, not an omission, and it is a better fit than likes: the adult's channel here is encouragement, not grading. Per-user deduplication of boosts would require a join table and therefore a migration, so it stays out of Release 1.

The teacher's view is the gallery itself. It answers "what they made", not "who finished". No teacher-facing surface shows cycles, cost or area.

Two client-side details that are easy to miss. The gallery card thumbnail must never crash on a malformed or hand-inserted payload; it renders a fallback card instead, matching the contract the existing race-track thumbnail already documents. And the creation player must gain an explicit branch for this type before any card work, because its default fall-through currently mounts a different game entirely.

Card payload size is a real decision, not a styling one. The list response projects content only for the types that need a thumbnail, and adding this type wholesale ships every part and every tape for every card in a class gallery. Derive a small product-and-count summary server-side, or add a card-only projection.

Cross-group leaderboards are flagged, not planned. See section 20.

---

## 15. Replay

Replay is re-execution, not playback. A machine is fully captured by its parts and tapes; handing that same program back to the same deterministic engine reproduces the animation tick for tick. No frames are stored, no video is encoded, and no server-side rendering exists.

This is what makes gallery sharing cheap enough to be in Release 1: one JSON blob per shared machine, zero storage growth per view, zero server render cost, and no new infrastructure. It also means the speed control, step-through and area overlay built for the studio are reused unchanged by the gallery viewer; a peer watching someone else's machine gets the same transport the author had.

Determinism is the load-bearing property. Identical inputs must produce identical outputs, tick for tick, in the browser and in Node. If that ever stops being true, the peer's replay diverges from the card's numbers and from what the author watched happen, silently. Section 18 covers the one live way that can break.

Export of an animated clip is a Release 3 item, encoded on the client from the deterministic replay and rate-limited, with the server never rendering frames.

---

## 16. Data model: zero new Prisma models

The platform already has everything this game needs. Release 1 ships no migration.

### 16.1 Machines are Creation rows

A machine is a `Creation` row with `type: "great_work_machine"` and the payload in `content`. That type value is added to the existing code-level allowlist and validated per type, exactly the way `data_dash_challenge` and `race_track` already are. A second value, `great_work_challenge`, is reserved for kid-authored puzzles in Release 3 and is deliberately **not** added in Release 1.

The row supplies: `authorId` (the kid), `courseId` (group scope), `title` (the generated name), `content` (the payload), `status` (`CreationStatus`, the whole state machine), `encouragements`, and the timestamps. The gallery read is already indexed on course plus status, and the shelf read on author.

Metrics live in JSON rather than columns because Release 1 neither sorts nor filters on them: the gallery lists by group and status, both indexed, and personal bests live in their own indexed model. Promote a field to a real column when a feature needs to sort or filter on it, which is a later-phase conversation. The payload carries a version field so that promotion is a safe, versioned read.

### 16.2 Worked example of the `content` payload

Use `v` for the version key, not `schemaVersion`. Every existing creation type on main uses `v`, and all three content projections whitelist it; a fourth spelling is a gratuitous divergence.

```jsonc
{
  "v": 1,
  "mode": "target", // "target" | "open"
  "levelKey": null, // "T5" for a tutorial level; null for studio machines
  "targetProduct": {
    // absent or null in open mode
    "atoms": [
      { "id": "a0", "el": "grass", "q": 0, "r": 0 },
      { "id": "a1", "el": "grass", "q": 1, "r": 0 },
    ],
    "bonds": [{ "a": "a0", "b": "a1", "kind": "single" }],
  },
  "targetCount": 3, // 3 for K-2 and tutorial, 6 for grades 3-5 and challenges
  "program": {
    // this object, exactly, is the engine's MachineSpec
    "parts": [
      { "kind": "dispenser", "q": -2, "r": 0, "rot": 0, "el": "water" },
      { "kind": "glyph", "q": 0, "r": 0, "rot": 60, "glyph": "bond" },
      {
        "kind": "arm",
        "q": 1,
        "r": 0,
        "rot": 0,
        "grabbers": 1,
        "reach": 1,
        "armId": "arm1",
      },
      { "kind": "output", "q": 3, "r": -1, "rot": 0 },
    ],
    "tapes": [
      {
        "armId": "arm1",
        "chips": ["GRAB", "ROTATE_CW", "ROTATE_CW", "DROP", "RESET"],
      },
    ],
  },
  "nameSeed": {
    "adj1": "a1.brave",
    "adj2": "a2.copper",
    "noun": "n.forge",
    "poolLocale": "en",
  },
  "lastRun": {
    // SERVER-WRITTEN ONLY, never trusted from the client
    "solved": true,
    "produced": [{ "molecule": "grass2", "count": 3, "firstTick": 14 }],
    "cycles": 42,
    "cost": 130,
    "area": 19,
    "instructions": 5,
    "mirrored": false,
    "engineVersion": "1.0.0",
    "verifiedAt": "2026-08-20T12:00:00.000Z",
  },
  "iterations": 7, // runs plus revisions; the primary analytics number
  "parentCreationId": null, // remix lineage, Release 2, but reserve the key now
}
```

The envelope and the engine input are two different types joined by exactly one field: `content.program` _is_ the engine's `MachineSpec`, and nothing else in the envelope ever reaches the engine. The version key belongs to the persisted envelope only, never to `MachineSpec`. This is the most likely integration break between the engine ticket and the persistence ticket, because both typecheck in isolation and fail only where they meet, so pin it with a type-level assertion plus one round-trip test the moment the engine's public API exists.

Validation copies the strict-parse precedent already in the repository: zod `.strict()` at every object level so unknown keys are rejected rather than stored, then structural invariants, then a semantic check that runs the simulation. The structural invariants are: no two parts on the same hex; every tape's arm id matches exactly one arm part, with no duplicate arm ids; target mode implies a target product and count, open mode implies neither; and every part inside the level's and band's board bounds. All of it hangs off the single existing content gate that both create and edit already call, so an invalid payload can never reach the gallery.

Two behaviours of the existing route to design around. The title is recomputed on every edit, including a status-only edit, so the title derivation must never return null for a schema-valid payload or a share would wipe the machine's name. And the content read is fail-closed on unknown types, so until a projection for this type exists every machine reads back with null content and replay is impossible.

### 16.3 Everything else, reused

| Model                         | Use                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `Creation`                    | Machines now; kid-authored challenges in Release 3                              |
| `CreationStatus`              | The save and share state machine, unmodified                                    |
| `Course`                      | Group scope, `gradeBand`, `defaultLanguage`, class or home group kind           |
| `Progress`                    | Per-activity completion, `timeSpentS`, and the existing per-game telemetry slot |
| `Activity` (kind `INTERACT`)  | How the game mounts, through the standard activity player                       |
| `GamePersonalBest`            | Bests per student under game key `great_work`                                   |
| `ModuleVariant.contentConfig` | Per-band configuration, subject to the plumbing gap noted below                 |

Level definitions live in code, in `src/constants/greatWorkLevels.ts`, following the existing challenge-constants precedent. There is no level model and no level table.

Personal bests need care. The existing writer is higher-is-better and its score column cannot represent "no best yet" for a minimised metric, while cycles, cost and area are all lower-is-better. Write them only into the `meta` field as best cycles, best cost, best area and a per-target breakdown, and leave the score column at its default. That choice has one visible consequence: the student-scoped personal-bests route returns every game's row with no filter, so a `great_work` row appears there as soon as one exists. That is acceptable for a student-scoped route the student owns, on two conditions that the implementing pull request must state explicitly: existing clients tolerate an unknown game key rather than assuming a fixed set, and no adult-facing surface consumes that route, because cycles, cost and area inside `meta` would then breach the firewall. If either condition fails, filter or project rather than relying on clients to ignore the row.

One plumbing gap to record rather than design around: per-band configuration is specified to ride on `ModuleVariant.contentConfig`, but that field is not currently wired through to games. It appears once, on a catalog payload, and zero times in the frontend source. Release 1 therefore reads per-band overrides from the activity's own content JSON, and the variant-to-player plumbing is filed as separate unowned work.

---

## 17. Server-authoritative scoring

**This is Release 1, not a later phase.** An earlier register filed server-side verification under "Later phases"; that placement is superseded. Server-authoritative scoring is what makes the shared engine a critical-path dependency rather than a convenience, and it is the reason the engine ticket blocks everything.

### 17.1 The rule

On every save that changes content, the server re-runs the submitted program through the same engine the client ran, in one call, and overwrites the stored last-run block with its own values: solved, produced, cycles, cost, area, instructions, mirrored, plus the engine version and a verification timestamp. None of those are read from the request. A save that carries a fabricated last-run block is stored with the server's values, and a test asserts the fabricated numbers are absent from the row. The response returns the stored content so the client can replace its display-only numbers with the authoritative ones.

Client numbers are display-only, everywhere, always.

### 17.2 The trust boundary

The stored payload is attacker-controlled JSON on a route the kid legitimately owns. That is the whole reason the boundary exists. Without a server re-run, a crafted save could:

- claim solved with one cycle, zero cost and unit area on a machine that does nothing, poisoning personal bests and the later per-product histograms;
- claim it produced Diamond, which feeds the auto-title, the discovery log and adopt-a-discovery; or
- ship a last-run block inconsistent with its own program, so a gallery card advertises "makes Gold, 6 of them, in 12 cycles" and the peer's replay produces nothing.

That third case is the specific bug the shared-engine architecture exists to prevent: the server's authoritative score disagreeing with what the kid watched happen. Two engine copies drifting by one tick produce it silently.

The server refuses with a validation failure, never a server error, on: any strict-parse failure including unknown keys at any depth; any structural invariant violation; resource exhaustion; and an engine throw. A crash is a validation failure with a friendly message, never a leaked stack trace, and never a score penalty.

It explicitly does not refuse an unsolved machine, an open-mode machine with no target, or a machine that produces nothing. Those are all first-class states and they save with a 200.

Two guards the design does not yet size and that must be settled before implementation. First, a hard tick budget plus a wall-clock bound: the repeat instruction has no terminating condition, the engine runs in-process, and there is no tick cap anywhere in the design today. A machine that hits the cap resolves as unsolved with a friendly message and is saved, not rejected. Second, a per-user rate limit on the re-run path: the existing limiter is per-IP, and a shared classroom NAT makes per-IP simultaneously too loose per kid and too tight per class.

### 17.3 Active-time XP is deferred

**`User.xp` must not be mutated by any Great Work code path in Release 1.** This supersedes the earlier rule awarding 10 XP per 5 minutes of active studio time.

Tracking stays. `Progress.timeSpentS` accumulates active studio time with the 90-second idle pause (a run in progress counts as active, because watching the machine execute is the Play beat), and `content.iterations` counts runs and revisions. Both are written through the self-authorized, rate-limited checkpoint path, which touches no avatar and no XP. What is deferred is the award, pending a capped and server-verifiable rule. The cap was never the missing piece; verifiability is, because the meter is driven by a client heartbeat that a synthetic-input script can farm whatever the cap says.

The hazard is not in the code this game writes, it is in the code it might call. The platform's activity-completion endpoint awards a flat XP amount on first completion, and mounting as a standard interactive activity normally implies calling it. Great Work must not call that endpoint with an XP-bearing result in Release 1. Assert it: a test that no Great Work flow ever calls the avatar or user update with an XP key. Solving a target awards nothing extra in any case; solving is its own reward and must not out-earn tinkering.

---

## 18. Technical architecture

| Layer         | Choice                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Frontend      | React 18, TypeScript, Vite; Tailwind and shadcn/ui; Framer Motion. Lives in `src/components/games/greatWork/`, alongside the other React games and reached through the game registry |
| Rendering     | 2D `<canvas>` with `requestAnimationFrame` for the board and playback; React for tray, timeline and sheets                                                                           |
| Drag and drop | The dnd-kit stack already in the repository. Do not add a second one                                                                                                                 |
| Engine        | Pure TypeScript, zero rendering imports, shared by client and server                                                                                                                 |
| Backend       | Express 5 and TypeScript; routes and services in their existing locations                                                                                                            |
| Database      | Postgres via Prisma. No migration for Release 1                                                                                                                                      |
| i18n          | i18next, strings under `src/locales/<lng>/common.json`                                                                                                                               |
| Testing       | Vitest for engine and components, Cypress for end to end, Storybook for tray and timeline                                                                                            |

Reuse the existing creations API rather than building a parallel router for machines. The endpoints this game needs are described in the design as thin wrappers over creations, and a separate router is exactly where a wrapper drifts into a second copy of the child-safety gate: group membership, author-only writes, the single visibility predicate kept in two representations so they cannot diverge, and first-name-only author exposure all already live in one place. Create, edit, share, unshare and gallery read are all existing endpoints. Two things are genuinely new: a duplicate endpoint, and a levels endpoint that reads code constants and touches no creation row, which does justify a thin router of its own.

### 18.1 Engine placement

The engine ships at `shared/greatwork-engine/`, imported by two separately installed projects. It cannot be duplicated: two copies drifting by one tick means the server's authoritative score disagrees with the animation the kid watched, which is the one bug this architecture exists to prevent.

An earlier decision specified plain TypeScript with relative imports, no aliases and no build step. **That is superseded by what actually shipped.** The landed pattern is:

- The **frontend** consumes `shared/` as **source**, via the `@shared/*` path alias. The alias string is kept identical in the TypeScript config, the Vite config and the Vitest config.
- The **backend** consumes the **built** package **by name**: `@brightboost/greatwork-engine`, declared as a `file:../shared` dependency resolving to `shared/dist/greatwork-engine/index.js`.

**Never use a relative path from `backend/src/` into `shared/dist/`.** With the shared project's output directory and root directory settings, the emit lands one directory deeper than the source, so a relative specifier typechecks against source depth and then throws `MODULE_NOT_FOUND` at container start. There is already a regression test pinning that exact mistake by string.

`docs/architecture/shared-code.md` is authoritative on the build mechanics: which side consumes source and which consumes emit, which lifecycle hooks rebuild the shared output, the authoring constraints (ES2019, no DOM libraries, no Node built-ins, no top-level await, no import metadata, colocated tests excluded from the build), and the Docker copy behaviour that keeps `shared/` in the backend image. Read it before touching any of that; do not restate it in game code comments.

### 18.2 The `shared/dist` freshness hazard

The frontend runs source and the backend runs emit. If the emit is stale, both compile, both run, and they produce different numbers. There is no error, no exception and no failing test. The kid plays against build A, saves, and the server verifies against build B and writes the authoritative score from B; the peer then replays under A and the animation disagrees with the card.

This matters more, not less, once scoring is server-authoritative, because a stale emit no longer just shows the wrong number locally: it writes the wrong number into the row that everyone else reads, stamps it as verified, and feeds it to personal bests.

Today's protection is entirely lifecycle-hook ordering, with nothing asserting the hooks ran. Continuous integration happens to be safe because the backend install fires the rebuild before the test step; reorder those steps, or add a job that tests without a backend install, and the protection evaporates with nothing turning red. A clean checkout has no emit at all and fails loudly; a developer machine always has a leftover one and fails silently. That is the dangerous case.

Two obligations follow. The engine ticket owns a real freshness and parity guard, which must catch a stale emit even when the engine source has not changed. The persistence ticket owns the audit half: stamp the engine version into every stored last-run block from a constant the engine exports, and assert at startup that the imported version matches the source constant. There is already a working precedent in the repository asserting a built-output label from the backend side.

The highest-value single test in the whole feature follows from this split: import the engine from both specifiers in one file, run a fixture corpus of programs through both, and assert deep-equal results. That one test is simultaneously the client-versus-server determinism cross-check, a staleness canary, and the pin on the envelope-to-`MachineSpec` derivation. It does not discharge the engine ticket's guard, and it cannot be written until the engine's public API exists.

### 18.3 Platform integration

The game registers as an `Activity` of kind `INTERACT` inside the existing module, unit, lesson, activity hierarchy, and is launched by the standard activity player like every other game, resolving through the game registry by game key. It fills the reserved Set 3 slot, and whether its module slug ships gated or ungated is a deliberate recorded decision, not a default.

One first-paint trap: the grade band resolves asynchronously, so the first render always sees the K-2 default. Band configuration must be recomputed on every render from the band prop, never seeded into component state, or a grades 3-5 kid gets a permanently three-slot tape.

One test-harness gap to budget for: this is the repository's first `<canvas>` surface. The unit environment provides no 2D context, so the drawing functions must accept a context-shaped target that tests can satisfy with a recording fake and assert against a draw-call trace, and component tests mock the canvas component the way the existing drag-and-drop tests mock their library.

---

## 19. Accessibility, grade bands and localization

### 19.1 Grade bands

`docs/architecture/grade-banding.md` is the canonical contract and is not restated here. In short: the platform injects one normalized band, the game consumes it, and the game never fetches or infers it independently; a missing or invalid band falls back safely to K-2. The band originates from `Course.gradeBand`, and per-band configuration is specified to ride on `ModuleVariant.contentConfig`, subject to the plumbing gap recorded in section 16.3.

Use the `k2` and `g3_5` spelling. A different casing exists elsewhere in the schema for a different model; do not propagate it.

|           | K-2 floor                                                            | Grades 3-5 ceiling                                  |
| --------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| Tape      | Exactly 3 slots: `GRAB`, `ROTATE_CW`, `DROP`. No add-slot affordance | Full instruction set, multi-lane                    |
| Parts     | One 1-grabber reach-1 arm, dispensers, acceptors, glyphs             | All arms, reaches and tracks as they ship           |
| Open mode | Always a seeded starter machine, never a blank void                  | A genuinely blank canvas                            |
| Target    | Palette by icon, default count 3                                     | Palette plus self-designed targets, default count 6 |
| Metrics   | Hidden entirely                                                      | Optional, with histograms later                     |
| Reading   | Not required to succeed                                              | Assumed                                             |

Both configurations are built in the same code, as data, with no forked components. Only K-2 is live on the platform today, so ship K-2 correct with 3-5 ready to enable, and tune only K-2. The band review rule requires tests proving each supported band variant and the K-2 fallback; the band-config object is a plain resolved value and must survive a JSON round trip, which means unbounded limits are expressed as `null` and never as infinity.

The within-band 12-stage progression mechanism is unresolved. Placement and advancement are owned by a separate open decision (#772). Release 1 may author richer difficulty data, but it must not hard-code a stage ladder, claim adaptive placement, or introduce a competing learner-level concept. Keep the band config a resolved object that a later per-stage resolver can feed.

### 19.2 Accessibility

Drag-only interaction throughout. Large touch targets. Colour-blind safe: identity is always reinforced by shape and icon, never carried by colour alone, checkable in review by rendering the tray in greyscale. No reading required to succeed at the floor, which means every failure state needs a non-textual channel: the side-by-side comparison for a mirrored product, the collision hex highlighted, the area overlay for area.

A keyboard-navigable timeline is a build, not a checkbox. The drag library's default keyboard sensor translates by pixels, which is meaningless against discrete slots and hex cells, so the timeline supplies the sortable coordinate getter and the canvas gets either a snapping coordinate getter or a non-drag path: a focusable cell cursor, arrows to traverse, Enter to place. Nothing in the repository currently covers keyboard drag and drop, and the one existing test mocks the sensor away, so this needs its own test with the real sensors.

Audio is architecture now, content later: a keyed audio service with sound and music slots, a mute toggle and persisted volume, shipping with placeholders, following the existing keyed-audio precedent. Playback honours the reduced-effects preference, which means no easing or particles, not a disabled Step button. Control instructions are supplied for the shell, because the tray and timeline are the least self-evident controls in the catalogue.

Generated names mean a pre-reader can still name their machine, by rerolling until they like one.

### 19.3 Localization

Every UI string is keyed; nothing is baked into a build. English and Spanish are live, with Vietnamese and Simplified Chinese lazy-loaded and English as the fallback language. New copy lands in English and Spanish at minimum and is mirrored into the other two with the English value and a translate marker so the existing localization backlog issues can find it.

Naming localization follows section 13, including the curated-pool requirement and the documented fallback. A note on where translations go: there are two i18n systems in this repository, and the legacy hand-rolled one is not the target. Use the i18next instance and the `src/locales/` tree.

---

## 20. Releases

### 20.1 Release 1

No migrations. The build order, in dependency order:

1. Engine: board, atoms, arms, core instructions, the tick loop, rotation-only matching with the mirrored flag, area accounting, and the produced report. Unit-test reset timing and reactions first; reset is the classic off-by-one source.
2. Level constants plus tutorial T1 to T7.
3. Build UI: canvas playback, parts tray, instruction timeline, area overlay.
4. Glyphs, metrics, and server-authoritative scoring.
5. Creator Studio: open mode, then palette, then target designer, then mode switching, then adopt-a-discovery, including the K-2 seeded starter machine.
6. Creation integration: generated naming, Save, Revise, Duplicate, My Shelf, the status transitions, and the reflect prompt.
7. The T8 studio handoff.
8. Share to the group gallery, deterministic replay, unshare, encouragements display.

Two ordering rules govern this list. **The vertical slice ends at Share, not at Solve**: a machine that can be built and solved but not named, saved and shown to somebody has not delivered the thesis of the product. And **do not start challenge levels before steps 5 through 7 are playable end to end**; challenge content authored against a studio that does not yet exist is authored against a guess.

If the window forces a cut, the reduction comes out of tutorial lessons first (their constants can still ship even when the playable levels do not), then challenge levels, then the share and gallery step. The studio, the engine, the build UI, persistence and server-authoritative scoring are the slice. Never cut, under any framing: determinism, server-authoritative scoring, the K-2 seeded starter machine, adopt-a-discovery, Duplicate, unshare, generated naming, and the computed palette closure.

### 20.2 Release 2

Remix leads the release, because it is the loop-back into Imagine and peer remixes are a headline metric: open a peer's shared machine, copy it to your shelf, change it. Lineage is stored in the payload rather than as a column, and is promoted to an indexed column only if remix-tree queries become a feature. Alongside it: tracks and the move instructions; multi-grabber and long-reach arms plus pivot, which is mostly UI and cost display since the engine already models both axes; triple bond and unbond; challenge levels C1 to C12 as code constants, always optional and never a gate or an unlock path; per-product histograms, grouped by product because only same-product machines are comparable, and never a gate; export and import of machine JSON, which is the first untrusted input into the content validator and therefore a reason that validator has to be real in Release 1; recipe hints on the palette; and the printable unplugged twin.

### 20.3 Release 3

Kid-authored challenges, stored as a second creation type with the challenge config in content, following the pattern an existing creation type already uses: the author defines inputs, target and count, allowed glyphs and board bounds, then must supply a working reference solution, which the server verifies headlessly with the same engine. No verification, no publication; that is the gate and it is automatic, with a publish rate limit against verification spam. On success it publishes to the group gallery immediately, with no human review queue. Also in Release 3: animated clip export with a universally pasteable fallback format, encoded client-side from the deterministic replay and rate-limited, with the server never rendering frames. Export compression stays exploratory and is built only if export proves heavy in practice.

**Cross-group leaderboards need a product ruling before any implementation.** Group scoping is currently a hard architectural boundary: the group id on a creation is non-nullable, and the only gallery read index is group plus status, so no query shape crosses groups without a new index and a new visibility concept. Widening the scope also re-opens the moderation question that group scoping closed, since the safety argument for immediate, unreviewed sharing is precisely that the audience is the kid's own class or home group. Until a ruling exists this stays flagged, and nothing in Release 1 may ship a design that presumes it: the gallery is scoped to the group and never leaks across groups.

---

## 21. The unplugged twin

Paper Machines, a Release 2 printable resource.

A printed hex board, element tokens matching the in-game icons, glyph cards laid on the board, and an arm made from a paper strip with a pivot pin. Kids write an instruction tape on a paper strip, using grab, turn and drop as symbols, and then a partner runs the machine one tick at a time, moving the arm exactly as written.

The debug loop is identical to the screen version and the failure is delightfully visible: the machine does exactly what you wrote, not what you meant.

It ships as a row in the existing teacher resource library, as a printable worksheet with a Spanish body, using fields that already exist. It depends on the final icon set and pairs with lessons T1 to T3, which is a second reason to keep those three lessons in Release 1 even under a cut.

---

## 22. Implementation tickets

Critical path: #720, then #721 and #722 in parallel, then #724, then #725. #723 starts on day one alongside the engine because it depends on engine _types_ only.

| Ticket | Delivers                                                                                                                                                                                                                                                                | Depends on                    | Notes                                                                                                                                                                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #720   | The engine at `shared/greatwork-engine/`: board, tick loop, instructions, reaction table, glyph footprints, rotation-only matching with the mirrored flag, area accounting, scoring, and the public API. Also the emit freshness and parity guard                       | none                          | **The blocking foundation.** Nothing else in Release 1 starts until this public API is stable. It blocks harder than a normal engine ticket would, because scoring is server-authoritative: the server's numbers are the record, so the guard against a stale build is part of this ticket and not a follow-up |
| #723   | Content: tutorial levels T1 to T7, the element catalog presentation layer, name pools and locale templates, reflect prompts, and every user-facing string in English and Spanish                                                                                        | #720 (types only)             | Runs in parallel from day one. It is not on #724's critical path: the palette closes over the engine's reaction table, not over this ticket's content. Only one of its acceptance rows needs a running engine, the headless solvability proof for T1 to T7                                                     |
| #721   | The build surface: hex canvas, parts tray, instruction timeline, transport, area overlay, run-feedback copy. A controlled component with no network access                                                                                                              | #720                          | Built for three consumers: the studio, gallery replay, and a level player. It never imports the API layer, never touches creations, and never decides what a target is. That absence is the seam's own regression test                                                                                         |
| #722   | Persistence and the trust boundary: the creation type allowlist entry, the strict validator, the content projection, the duplicate endpoint, the server re-run and authoritative metrics write, the personal-bests writer, and the engine-version stamp                 | #720                          | Zero migrations. Do not start the verification service before #720's freshness guard lands: building the trust boundary on an unguarded build is the exact failure mode the ticket exists to prevent                                                                                                           |
| #724   | The Creator Studio: the loop reducer, open and target modes, the computed palette, the target designer, adopt-a-discovery, the K-2 seeded starter, naming with reroll, Save, Revise, Duplicate, My Shelf, the reflect prompt, the T8 handoff, and platform registration | #721, #722, content from #723 | The heart. Never the scope cut. Awards no XP                                                                                                                                                                                                                                                                   |
| #725   | Share to the group gallery and replay: the playable-type registration, the card thumbnail, the player branch, the card summary payload, unshare, and encouragements display                                                                                             | #722, #724                    | Almost all backend already exists; the work is client-side plus one payload-size decision. Its position in the protected slice is not yet settled                                                                                                                                                              |
| #726   | Release 2 tracking issue                                                                                                                                                                                                                                                | all of #720 to #725           | Split into implementation sub-issues when Release 2 is next up. Filing them now would be speculative                                                                                                                                                                                                           |
| #727   | Release 3 tracking issue                                                                                                                                                                                                                                                | #726                          | Same. Its cross-group leaderboard bullet is a product ruling, not a task to pick up as written                                                                                                                                                                                                                 |

---

## 23. Decisions register

Numbered decisions carried forward from the design review. Superseded entries are kept rather than deleted, because the superseded text still circulates in issue bodies.

### Studio and creation

| #   | Decision                                                                                                                                                                               | Status                                                                                                                                                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Any reachable product is selectable; no per-band curation. The palette is a closure over the reaction table, never a hardcoded list                                                    | Active                                                                                                                                                                                                                      |
| R2  | The studio is open from the start, with a dismissible nudge toward the lessons. Creation is never gated                                                                                | Active                                                                                                                                                                                                                      |
| R3  | All glyphs are available in the studio; kids set end-product conditions via the target designer. Challenges teach glyphs, they never unlock them                                       | Active. Note that R3 is a register entry, not "Release 3"; cutting the target designer is an explicit override of this decision, not a deferral it authorizes                                                               |
| R4  | Generated names: two adjectives plus a noun from curated pools, with reroll and no free text                                                                                           | **Amended.** The generation scheme stands. The clause specifying one shared untranslated pool with per-locale slot order is superseded by section 13: stable tokens plus curated per-locale pools, or a documented fallback |
| R5  | No version history. Revise in place; Duplicate is the safety net and is therefore Release 1                                                                                            | Active                                                                                                                                                                                                                      |
| R6  | Group scope only. Sharing is immediate, with no approval queue and no rejection path. Drafts and unfinished shares are first-class. Adult-only encouragements, no kid-to-kid reactions | Active                                                                                                                                                                                                                      |

### Engine

| #   | Decision                                                                                                                            | Status                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| R7  | Balance is a target element with no downstream mechanic                                                                             | Active                                                                                |
| R8  | Gems behave exactly like metal rungs; no special-casing                                                                             | Active                                                                                |
| R9  | Rotation-only matching. Molecules are chiral and mirrors do not match; the engine sets a mirrored flag and the UI names it outright | Active                                                                                |
| R10 | One atom per dispenser every two cycles                                                                                             | Active                                                                                |
| R11 | Studio: the kid places dispensers freely. Levels: inputs are fixed                                                                  | Active                                                                                |
| R12 | Plus 10 currency per cell of reach beyond 1                                                                                         | Active                                                                                |
| R13 | Area counts every hex occupied by any part or atom by completion, including hexes merely swung over. Ship the overlay               | Active. The overlay's hex set comes from the engine and is never recomputed in the UI |

### Scope and integration

| #   | Decision                                                                                                                                                               | Status                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R14 | Band from `Course.gradeBand`, config via `ModuleVariant.contentConfig`. K-2 ships correct, 3-5 ready                                                                   | Active, and now subordinate to `docs/architecture/grade-banding.md`, which is the canonical contract. Note the variant-config plumbing gap in section 16.3                                                                                                               |
| R15 | Target count: 3 for K-2 and the tutorial, 6 for grades 3-5 and challenges                                                                                              | Active                                                                                                                                                                                                                                                                   |
| R16 | Eight tutorial lessons                                                                                                                                                 | Active                                                                                                                                                                                                                                                                   |
| R17 | Machines are `Creation` rows of type `great_work_machine`, payload in `content`, `CreationStatus` as the state machine. Zero new models, zero migrations for Release 1 | Active                                                                                                                                                                                                                                                                   |
| R18 | Activity of kind `INTERACT`; XP on active studio time at 10 XP per 5 minutes, session-capped                                                                           | **Superseded.** The activity registration stands. The XP award is deferred: tracking stays through `Progress.timeSpentS` and `content.iterations`, and `User.xp` is not mutated in Release 1, pending a capped and server-verifiable rule. See section 17.3              |
| R19 | Engine at `shared/greatwork-engine/`, plain TypeScript, relative imports, no aliases, no new tooling                                                                   | **Superseded** by what shipped. The location stands. The frontend consumes source via `@shared/greatwork-engine`; the backend consumes the built package by name, `@brightboost/greatwork-engine`. `docs/architecture/shared-code.md` is authoritative. See section 18.1 |
| R24 | Level definitions live in code, not the database. Adding a lesson is a pull request, not a migration                                                                   | Active                                                                                                                                                                                                                                                                   |

### Later phases

| #   | Decision                                                                                                                                                            | Status                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R20 | Authored challenges require a working reference solution, server-verified headlessly, auto-published on pass, rate-limited to one publish per author per 15 minutes | Active, Release 3                                                                                                                                                                            |
| R21 | Server-side everything: re-run each machine, verify solvability, compute cycles, cost and area authoritatively. Client numbers are display-only                     | **Active and re-placed into Release 1.** The original register filed this under later phases; that placement is superseded. It is what makes the shared engine critical path. See section 17 |
| R22 | Animated clip export with a universal fallback format, encoded client-side, rate-limited. The server never renders frames                                           | Active, Release 3                                                                                                                                                                            |
| R23 | Audio: architecture now, content later. A keyed audio service with sound and music slots, a mute toggle and persisted volume, shipping with placeholders            | Active, Release 1 for the architecture                                                                                                                                                       |

### Open items requiring a ruling before the work they gate

Every row names one person who can settle it. An open item with no named decider is not tracked, it is deferred, and a list of eleven undeferred-looking questions with nobody on any of them is how a ruling gets made accidentally by whoever writes the file first. Handles are GitHub handles; where a row names a role as well, the role is what makes that person the right decider, not a second owner.

| #   | Ruling needed                                                                                                                                                                                                                                                                                | Owner                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | A concrete tick budget and wall-clock bound for server-side verification, plus the friendly copy for a machine that hits it. Needed before persistence implementation starts                                                                                                                 | @BrightBoost-Tech                                                                 |
| 2   | Ownership of the reaction table, glyph footprints and element catalog, between the engine ticket and the content ticket. Three sources disagree, and the constants land twice if this is unsettled at pull-request time. Recommendation: the engine owns the data, content owns presentation | @alitlin, before either file is written                                           |
| 3   | The gallery card payload shape: existing content projection, a server-derived summary field, or a card-only projection. Decide before card work                                                                                                                                              | @BrightBoost-Tech with the #725 implementer                                       |
| 4   | The version key spelling on the persisted envelope. Recommendation is `v`, matching all three existing creation types                                                                                                                                                                        | @jgoetzmann, as author of #722                                                    |
| 5   | Whether the metrics count of instructions is a Release 1 number or a later one; this document currently tags it both ways                                                                                                                                                                    | @jgoetzmann, as owner of this document                                            |
| 6   | Adding the pool-locale field to the stored name seed. A payload change, not a migration, but a data-model call                                                                                                                                                                               | @alitlin                                                                          |
| 7   | Which locales get curated name pools in Release 1. Recommendation: English and Spanish curated, with a declared fallback for the other two. The open half is the fallback experience, not the mechanism, which §13.5 already fixes                                                           | @Cat-a-rina, executed in #723                                                     |
| 8   | Whether the game mounts inside the standard game shell, whose results screen is a star-and-score surface that sits awkwardly against a design that never shows completion percentage. The repository has precedent both ways. This changes the top of the component tree                     | @Cat-a-rina as experience lead, with the #721 implementer                         |
| 9   | The registered game key and whether the module ships gated                                                                                                                                                                                                                                   | @BrightBoost-Tech, as owner of the Set 3 tracking issue #676                      |
| 10  | Whether the studio is reachable outside an activity, and if so how it obtains a group id for saving                                                                                                                                                                                          | @Cat-a-rina as experience lead, with platform                                     |
| 11  | The cross-group leaderboard scope ruling for Release 3, which must precede any schema design and re-opens the moderation question that group scoping closed                                                                                                                                  | @Cat-a-rina with whoever owns child-safety policy; must precede any schema design |

Two of these gate a file rather than a release. Item 2 has to land before either ticket writes its constants file, because the failure it prevents is two tables, not a wrong table. Item 1 has to land before the verification service is written, because a re-run path with no bound is the trust boundary's own denial-of-service. The rest can be settled in parallel with implementation as long as they are settled by the pull request that depends on them.

---

## 24. Review ownership

Jack (@jgoetzmann) leads the design and the implementation. Two reviewers split the document between them, and both are required on the eventual pull request; neither is advisory.

| Reviewer               | Lane         | Sections                                                                                                                                            |
| ---------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catarina (@Cat-a-rina) | Experience   | §9 failure-mode voice · §11 Creator Studio · §12 Tutorial, T8 in particular · §13 Naming and copy · §19 Accessibility, grade bands and localization |
| Alice (@alitlin)       | Architecture | §8 the simulation engine · §16 Data model · §18 Technical architecture, and §18.1 engine placement in particular                                    |

Two things this document does not say elsewhere, and has to.

**The architecture calls in §16 and §18.1 were made without Alice's input, and are explicitly overrulable.** That is not a formality. The zero-migration reuse of `Creation`, and the choice to hold metrics in the JSON payload rather than in columns, are both in that set: they are written as decisions and recorded as R17, and they should be presented to her as proposals anyway. §18.1 is a different case in the same lane — it has already been overruled once, by the shared-code decision that replaced R19, so bring her the landed state rather than this document's earlier version of it, and treat the source-versus-emit split that decision leaves open as hers to close.

**Two items are pre-flagged for Catarina and should reach her early rather than at pull-request time.** The first is the localization fallback _experience_: §13.5 settles the mechanism, and what it does not settle is how it feels to a child whose locale renders English tokens under a native slot order. That is a felt-quality question, not a technical one, and it is the half of the naming decision that engineering cannot answer. The second is §12's T8 framing together with §11.2's studio nudge copy — both are experience calls that happen to sit inside engineering tickets, which is exactly how they get shipped unreviewed. Add the target designer to her list if a schedule squeeze puts §11.4 at risk, because cutting it is an explicit override of R3 rather than a deferral R3 authorizes.
