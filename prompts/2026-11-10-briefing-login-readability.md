# Briefing order and login contrast

**Date:** 2026-11-10
**Agent:** Codex
**Issues:** #638, #802

## Prompt

> implement

Accepted scope: implement the next four recommended tickets. This PR covers
briefing order (#638) and the cohort login contrast fix (#802).

## Changes and verification

- Move shared game controls before tips; preserve spacing and translated copy.
  LearningGameFrame already puts controls first and has no tips block.
- Lighten the cohort screen's different-code control and secondary divider.
  Tailwind's slate-400 on slate-950 measures 7.87:1; hover slate-300 is 13.59:1.
- Run the existing GameShell and localized classroom tests. Run the canonical
  verification runner; record local browser limitations and hosted CI in the PR.
