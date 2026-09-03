# Biome Buddy — reviewable prototype + shareable Buddy

**Author:** Nathaniel Walker (with Claude Code)
**Date:** 2026-09-02
**Sprint:** —
**Pod:** Build/Experience

## Intent

Turn the refined Biome Buddy design (`docs/games/biome-buddy-design.md`) into the first genuinely reviewable, frontend-only prototype: the complete v1 creative-learning loop on an unlinked route, a pure model with invariant tests, a deterministic SVG Buddy, a device-local gallery, and a NEW backend-free way to share the exact Buddy by URL (with "Make my own version" remixing a copy) — so a reviewer can experience the concept without an account and before any backend architecture is committed.

## Prompt

```
AUTHORIZE BIOME BUDDY REVIEWABLE PROTOTYPE + CATARINA SHARE EXPERIENCE
(Phase 0 re-ground against current main; Phase 1 preserve the v1 isolation
contract; Phase 2 build the complete v1 loop; Phase 3 pure model with
invariants; Phase 4 deterministic layered SVG sprite; Phase 5 device-local
gallery; Phase 6 shareable Buddy snapshot — /biome-buddy/share#r=<encoded
versioned recipe>, IDs only, strict validation, never trust stats from the
URL; Phase 7 shared result page with Make My Own Version / Build A New Buddy;
Phase 8 reviewer entry, no fake security; Phase 9 Share My Buddy via Web
Share API + copy fallback; Phase 10 en + es; Phase 11 responsive/a11y at
320–desktop; Phase 12 tests incl. falsifiers; Phase 13 fresh-context
adversarial review; Phase 14 do not graduate to backend yet.)
```

## What Claude Code Did

- Files created: `src/components/biomeBuddy/**` (model, content, share codec, storage, sprite, scene, stat bars, overlay, science card, share button, progress dots, locale hook, five screens, game, css, tests), `src/pages/BiomeBuddy.tsx`, `src/pages/BiomeBuddyShare.tsx`, `src/pages/BiomeBuddyReview.tsx`, `src/pages/__tests__/BiomeBuddyPages.test.tsx`, `docs/games/biome-buddy-design.md`.
- Files modified: `src/App.tsx` (three routes), `src/components/LanguageToggle.tsx` (optional `languages` prop), `src/locales/{en,es}/common.json` (`biomeBuddy.*`).
- Tests passed: yes (targeted 135/135; full unit suite recorded in the PR).
- Build clean: yes (typecheck, lint, prettier, `vite build`).

## What Worked

- Re-grounding first surfaced two things the design doc had wrong or stale: the migration-tree warning (#646 is closed) and the sprite/file names; and one thing the repo had that the doc didn't: the Safe Exploration Contract (principle 9), which the prototype now maps to explicitly.
- Keeping the model pure made the invariants exhaustively testable (7 680 builds) instead of sampled.
- Reading the share payload from the URL fragment (never the query string) kept it out of server logs by construction.

## What Needed Editing

- The first pass detected "reopened walkthrough" by object identity, which mis-fired; an explicit `fresh` flag fixed it.
- Focus return after a science card depended on the browser having focused the chip; the opener is now passed explicitly.
- A doc comment containing `locales/*/common.json` closed the block comment early (`*/`).

- The fresh-context adversarial review (Opus) returned CHANGES-REQUIRED on the first pass: seven science-content errors (gills taught as a smell organ, spiracles vs antennae, claws vs hooves, ladybugs as camouflage, skunks in two contradictory cards, spiders as insects, an eyeless Buddy gaining Sight in water), the 320px Choose layout, a no-movement dead end in Test & Learn, an unvalidated stored walkthrough that could crash the "Last test" chip, missing roving tabindex, `animate-pop` escaping reduced motion, and several vacuous tests. It took seven passes: the engineering (share codec, storage validator, attribution, i18n) was never breached; the science content took five passes because animal lists were being swapped for head nouns instead of re-read against their own card text. The seventh verdict is APPROVE behind SME sign-off, with ten content items handed to the SME.

## Lessons

- A second Claude session was active in the same checkout; moving to a dedicated worktree outside the repo (parallel-clones skill) avoided sharing a dirty tree.
- Windows pushes use `HUSKY=0` (#788); the parity gate runs in CI.

## Rating

4/5 — the loop, model and share format shipped in one pass; tuning the contribution matrix and the K–2 density still wants a human play-test with a child.
