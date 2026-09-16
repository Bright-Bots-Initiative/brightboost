# Biome Buddy start and scenery fixes

Date: 2026-09-15

## User prompt

> when i click start viome buddies instead of choosing the envionment(elements) i just see something already made. also backfround is covered with text bubble

## Implementation

Make Start and Build a new Buddy open the four home choices explicitly. Keep
the existing draft intact while browsing, commit a fresh recipe on Select, and
remove the entry flag when leaving the chooser. Move the environment description
below the original SVG scenery. Preserve the existing model, bilingual copy,
remix path, saved gallery, and normal draft resume behavior.

## Validation

The existing page, game, and responsive suites passed before changes (39 tests).
Five new or updated assertions failed on the old behavior: the new-entry link,
cold Start, Start with a draft, cancellable home browsing, and text over the scene.
All 195 Biome Buddy feature/page tests pass after the fixes, including reload
and saved-gallery preservation. Full verification outcomes are recorded in the PR.
