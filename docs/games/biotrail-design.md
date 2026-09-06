# BioTrail: Adaptation Islands

> **Canonical for:** the first advanced Biotech game and specialty-choice release. Last verified against code: 2026-09-06.

The owner selected the final three Set 3 games separately and will connect them later. This work preserves those placeholders and hidden-module gates. After all canonical Set 3 activities are completed, invite the learner to choose AI/ML, Quantum, or Biotech. Preview the visual theme before the existing permanent, server-validated choice. Keep school navigation and assignments in their familiar places.

## First advanced game

Biotech is the closest fit to the requested Super Mario Bros. 3 inspiration: a branching world map, platform traversal, and abilities that change how a landscape can be explored. BioTrail uses original characters, environments, mechanics, and art. Its subject is **biomimicry**: engineering tools inspired by living things. A suit changing tools is not an organism evolving during play. Biological adaptation occurs in populations across generations.

## Habitat variation

| Field           | Terrain and scenery                                       | Tool advantage                                                           |
| --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Sprout Meadow   | Broad grass platforms, low flower beds, short stream gaps | A gentle place to try either tool                                        |
| Ripple Marsh    | Reed beds, stone columns, three tall ledges               | Spring legs clear 110-pixel rises directly; wings use intermediate steps |
| Canopy Crossing | High tree branches, broad descending gaps, lower stumps   | Held wings take direct crossings; spring legs follow the lower route     |
| The Field Lab   | Greenhouse shelves, a long drop, uneven final steps       | Combines climbs and crossings, with different routes for each suit       |

Both suits can finish every field. The alternative routes keep experimentation reversible. Each start, checkpoint, and goal includes its platform height, so raised flags, checkpoint recovery, and completion all refer to the same surface. English and Spanish workshop and untimed observations explain each habitat's distinct challenge. AI/ML uses a red theme; Quantum remains violet and Biotech green.

## Safe Exploration Contract

- **Unknown:** which nature-inspired tool helps cross a particular habitat?
- **Control:** choose spring legs or gliding wings; author a suit name; choose a branch and revise between attempts.
- **Visible consequence:** jump height and falling speed change; a side-scrolling field test shows what the design can do.
- **Safe return:** generous checkpoints, unlimited retries, pause, return to workshop, and restart from a checkpoint. No lives, time pressure, or punitive score.
- **Variation:** deterministic levels. Player decisions vary the experience. No random access, assessment, XP, or ranking.
- **Scaffolding:** K–2 starts with a suggested tool and an assisted, untimed step-through option. Grades 3–5 predict, compare tools, and explain their changes. Both support keyboard and touch.
- **Spiral:** imagine a habitat explorer; create its tool choice; play a field test; name and print/show a local creation card; reflect on a revision; return to the workshop.
- **Adult:** pause or use assisted exploration, discuss the named build together, or make a paper suit as an unplugged twin. Existing classroom assignments stay visible.
- **Accessibility:** semantic map/workshop controls, persistent text instructions, large buttons, reduced motion, no audio dependency, an untimed alternative to platform controls, and polite notices only at meaningful events.
- **Privacy/bounds:** device-local drafts and completed islands are namespaced to the authenticated student; bounded, versioned validated records; no public publishing or peer feed. A successful local save is reported separately from platform completion.

## Release boundary

The game has a gated curriculum module and uses the existing activity-completion pipeline. The specialty theme reads server state, never a URL or local preference. A developer-only preview exercises the same screen/game without changing student records. Production release needs the normal reviewed merge and a curriculum-only seed through the repository's authorized process; never run the demo-account seed against production merely to install this module.

The completion receipt offers the specialty choice as its next action once the server confirms all five Set 3 activities. An invitation remains in the student shell until the learner chooses; existing assignments and navigation remain available. `/student/specialty` and `/student/advanced` render the choice or the saved specialty hub. The existing permanent-choice API is retained, with an explicit confirmation dialog. AI/ML and Quantum receive themed hubs with honest coming-soon states; this release implements the Biotech game only.

`prisma/seedAdvanced.cjs` and its backend mirror export a repeatable curriculum-only helper. It creates `advanced-biotech-biotrail` → `biotrail-field-lab` → `biotrail`, registered as `gameKey: biotrail`. No schema migration is needed. Do not mark Set 3 complete to demonstrate the feature: use the development-only `/dev/advanced` route or the separate offline preview.

## Localization and verification

New student-facing screen/game strings ship in English and Spanish. Vietnamese and Simplified Chinese contain English fallback text for the new namespaces. TODO: translate those namespaces before claiming those tracks are localized in those languages.

Automated checks cover canonical Set 3 unlocks, authenticated status, stale account responses, specialty confirmation and refresh persistence, mismatched specialty and forged completion requests, branching progression, deterministic traversal of all four fields, checkpoint recovery, bounded saved drafts, the untimed creative journey, retryable failed completion, and repeatable seed identities. Existing access, student layout, and reward regression suites remain green. A deliberate wrong-specialty bypass made its guard test fail; restoration passed.

The production build, TypeScript, and changed-file lint/format checks are part of validation. The existing bundle-size script cannot execute as shipped because it uses CommonJS `require` in this ESM repository. Browser visual verification remains outstanding: the cloud browser URL policy blocks the local preview. No production database or deployment was changed.
