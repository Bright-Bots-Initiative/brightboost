# Grade-Band Architecture Decision

**Author:** Codex
**Date:** 2026-08-13
**Sprint:** Internship closeout
**Pod:** Build/Experience

## Intent

Record the decision that closes #699 and distinguish the approved 12-stage personalization direction
from its still-open assessment and progression model.

## Prompt

```text
Alice agrees that the platform should inject one normalized grade band and each game should own its
response. Within each of K-2, 3-5, and 6-8, there should eventually be 12 difficulty variations. The
exact measurement and assessment model is still fluid.
```

## What Codex Did

- Added the canonical grade-band architecture boundary
- Recorded 12 ordered difficulty stages per band as the product target
- Explicitly documented that the current runtime supports only K-2 and grades 3-5
- Kept placement, assessment, persistence, and progression open for a separate decision
- Created #772 to own that decision without authorizing implementation
- Updated `CLAUDE.md` so future coding agents receive the same boundary

## Validation

- Prettier formatting
- Markdown link and diff checks
- Documentation-only change; no runtime tests required

## Lesson

A settled architectural boundary and an approved product direction can coexist with an intentionally
open measurement model, as long as the repository labels each one honestly.
