# 2026-07-27 — K–2 Adult Support foundation (Prepare Session repair + /parents + printable Quick Start)

## Context

External K–2 user feedback surfaced three top value/effort items for adults
supporting young learners:

1. The Launch Session dialog offers "Prepare Session" for **every** module,
   but prep data exists for only three active K–2 games (plus the archived
   Sequencing module) — teachers selecting any other module land on the prep
   page's "not found" dead end.
2. The public `/parents` route is a placeholder.
3. There is no printable quick-start guide for parents / program volunteers.

## Prompt (summary)

Build one focused PR:

- **Prepare Session**: data-driven availability via the existing
  `GET /teacher/prep` list endpoint; show the link only when the selected
  module has prep data; remove the archived `k2-stem-sequencing` entry from
  the prep catalog; a failed availability request degrades safely (link
  hidden, launch unaffected). Tests for supported / unsupported / archived.
  Do NOT author the seven missing per-game guides here.
- **`/parents`**: real responsive page; honest progression (Foundation
  available → Exploration after Foundation → Mastery in development, framed
  around Imagine → Create → Play → Share → Reflect); canonical set/game/strand
  names imported from `src/constants/stemSets.ts`; adults as guides, not
  proctors; CTAs to `/try`, `/student-login`, `/teacher/signup?intent=home`;
  leave the Students/Teachers/Organizations placeholders untouched.
- **`/parents/guide`**: public print-friendly K–2 Facilitator Quick Start
  (before / during / after + ready-to-use prompts + independence note),
  surfaced from both the parents page and Teacher Resources as ONE shared
  route (no duplicated content); accessible Print button, no auto-print;
  no read-aloud/audio claims (that limitation is tracked in #625).
- i18n-keyed copy (en + es authored; vi/zh-CN fall back to English pending
  human translation), `defaultValue` convention as in `/try`.

## Checks requested

lint, frontend + backend typecheck, unit tests (new route/dialog/catalog
tests included), production build, locale JSON validity.
