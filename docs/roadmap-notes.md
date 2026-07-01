# Roadmap Notes

> Design and roadmap notes — directional thinking grounded in the codebase, not commitments.

> **Canonical design principles:** [`design-principles.md`](design-principles.md). This roadmap doc is the *strategic / directional* source — where notes like the creator-substrate thread below explore how we get there. `design-principles.md` is the *canonical* statement of the principles those notes build toward (creators-not-consumers, the creative spiral, structured-early / open-later).

## Maze Maps as a creator-substrate — implications for Set 3 (2026-06-25)

**Context.** Maze Maps is currently a closed-content game: hand-authored `MazeMapConfig` literals, a fixed phase machine (tutorial/guided/main), a single correct path, and completion-gated full marks (finishing = 140/140 for everyone). It asks players to respond and complete, not to create — useful to be explicit about, since a long-term goal is moving some experiences toward kids/teachers making things, not only consuming them. (Note: the absence of a star/partial-score system here is intentional — Maze Maps is orb-collection + pattern-reading, not a par/efficiency puzzle like Tank Trek. See the design comment in `src/components/games/MazeMapsGame.tsx`.)

**What changed with PR #654 (closes #617).** Two things that matter beyond the G3-5 content:

- Map data became an **injected parameter** — `MazeMapsCore` now takes a `maps` prop, with the catalog selected via `getGradeBand(config)` (`MAPS_k2` vs the new `MAPS_G3_5` in `gradeBandContent.ts`).
- Authored maps are now **programmatically validated** — `MazeMapsBands.test.ts` (in-bounds coordinates, no start/goal/orb/safe-pad overlap with walls, closed sweeper loops, valid sweeper IDs and start indices, unique orb positions) and `MazeMapsSolvability.test.ts` (a BFS over the grid proving every orb and the goal is reachable from the start).

Together (map-data-as-input + automated "is this map valid and solvable" checks), this is much of the substrate you'd need for **teacher- or kid-authored maps** — the validation layer in particular is what would stop an author from creating an unsolvable level.

**Honest caveat — this lowers the cost but doesn't cross the line.** Still three fixed phase-bound maps (not arbitrary-length sequences), no authoring UI, no non-developer content format, and the win model is still single-path complete-all-objectives. The engine is a stepping stone, not a creation feature.

**Implication for the Set 3 net-new game.** Set 3 is the place to consciously build toward the creator side — divergent solutions or actual making, rather than complete-all-objectives. Two paths to weigh:

- **(a) Build on this parameterized maze engine** — let kids/teachers compose maps, validated by the existing solvability + integrity checks (a "make a level" loop). #654 lowered the cost of this.
- **(b) A fresh creation-first mechanic** — start clean.

This is the first concrete architectural foothold toward kid/teacher-authored content that's emerged from real code rather than planning.
