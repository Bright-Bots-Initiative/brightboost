# Ticket #669 — Creation Write Rate Limits

**Author:** Codex
**Date:** 2026-08-13
**Sprint:** Closeout
**Pod:** Build

## Intent

Protect creation, update, and encouragement endpoints from write bursts without penalizing a classroom
whose students share one school network.

## Prompt

```text
Start and finish #669.
```

## What Claude Code Did

- Files created/modified: `backend/src/utils/security.ts`, `backend/src/routes/creations.ts`,
  `backend/src/routes/creations.test.ts`, and this prompt log
- Added separate authenticated-account limits for creating artifacts, updating artifacts, and giving
  boosts
- Added burst tests for all three write paths and a 30-classmate shared-IP test
- Tests passed: targeted backend suites passed 53/53; the full unit run passed 880 tests, with two
  unrelated local-sandbox failures in the existing CI process harness
- Build clean: yes; frontend/backend typechecks, lint, frontend build, and backend Railway build passed

## What Worked

Keying the limits to the authenticated account meets the abuse-prevention goal while preserving normal
classroom use behind a shared public IP. Separate buckets keep normal editing from consuming the adult
encouragement allowance.

## What Needed Editing

The issue suggested reusing an IP-based limiter. Repository usage showed that this would create a false
positive for classrooms, so the implementation was tuned to the authenticated user instead.

## Lessons

Rate limits should reflect the real unit of use. For authenticated classroom writes, an account is a
safer boundary than a network address.

## Rating

5/5
