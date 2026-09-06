# Advanced specialties and BioTrail

**Author:** Codex, for the BrightBoost owner
**Date:** 2026-09-05
**Sprint:** Not specified
**Pod:** Experience / Build

## Intent

Build the next phase after Set 3: a choice among AI/ML, Quantum, and Biotech; modest specialty-specific UI changes; and the first advanced game. The owner will connect Great Works, Biome Buddy, and Stone Rhino to Set 3 later.

## Prompt

```text
Il connect them later. At this point I want to build out what happens next. When the kids successfully complete set 3 the app opens up to the advanced technology games and ask the user to choose their speciality either ai/ml, quantum or biotch. I want to build out the screen where they make that choice. Also that choice should change a bit of the ui/ux based on what they pick. The next game inspiration is Super Mario brothers 3. I want you to create the first advanced technology game based on that inspiration. Choose between the three advanced choices (ai/ml, quantum or biotch) for the one that most aligns.
```

## What Codex Did

- Chose Biotech for original biomimicry-themed platform exploration, branching islands, and tools that change traversal.
- Added a server-derived specialty status, confirmed choice screen, themed hubs and student shell, completion handoff, and gated BioTrail curriculum registration.
- Built four original platform fields, spring/glide tools, touch/keyboard controls, checkpoints, untimed exploration, a named local creation card, and reflection.
- Added English/Spanish content, development preview, design contract, and regression coverage. Preserved the unfinished Set 3 connections and production data.

## What Worked

Reusing the existing permanent specialization endpoint, canonical activity IDs, activity-completion pipeline, and centralized module access kept progression aligned with the platform. The design contract separates biomimicry from biological evolution.

## What Needed Editing

The shared Button does not support `asChild`; links use `buttonVariants`. Shared imports in backend tests must target the compiled workspace package. State cleanup must ignore late responses after a student changes accounts. Changed files were formatted to satisfy the repository's diff-scoped gate.

## Verification and limits

Targeted tests and production build passed, with deliberate guard falsification followed by a passing restoration. See the game design's verification section and PR for exact results. The existing bundle-size script has an unrelated ESM/CommonJS failure. Cloud browser policy blocks local preview URLs, so visual browser review remains pending. No database seed, production deployment, or merge was performed.

## Lessons

Keep review previews independent of student records, use confirmed server progression for unlocks, and preserve permanent-choice semantics visibly. Verify platform levels with actual physics and completion with a real component flow.

## Rating

Awaiting owner review.

## Owner refinement — 2026-09-06

```text
i like it just make sure there is more variance in between levels and a level where gliding is highly favorable and another where jumping us favorable. Also the color for ai/ml should be red
```

Made the four fields distinct in terrain and scenery, with spring-favored marsh ledges and glide-favored canopy crossings. Preserved viable alternative routes with both suits and corrected checkpoints/goal flags for raised surfaces. Added continuous physics route tests for all eight field/suit combinations and direct tool-advantage comparisons. Updated AI/ML to red and refreshed English/Spanish copy and the offline preview. An independent read-only review verified the traversal routes. Changes remain local pending explicit GitHub publishing authorization from the previous turn.
