# Ticket #881 — Bound every dimension of the avatar multipart upload

**Author:** Claude Code (Opus 5)
**Date:** 2026-09-12
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

Stop a single authenticated avatar upload from carrying unbounded multipart input. The 300KB
`fileSize` limit bounded only the file bytes, so fields, parts, header pairs and field-name
nesting were all unbounded on a route that consumes exactly one part.

## Prompt

```text
#881 (Audit DEP-01): the avatar upload route uses an affected Multer release. Upgrade to an
unaffected compatible release and bound unused fields/parts. In an isolated environment,
verify ordinary small avatar uploads, rejected excess input and prompt error responses. Do
not test denial-of-service input against production.
```

## What Claude Code Did

- `backend/package.json` + `backend/package-lock.json`: multer `^2.0.2` → `^2.3.0`.
- `backend/src/routes/userAvatar.ts`: added `files`, `fields`, `parts`, `fieldNameSize`,
  `fieldSize` and `headerPairs` limits sized to the one part the client sends, and mapped
  `MulterError` codes to stable user-facing text, returning `code` alongside `error`.
- `backend/src/routes/__tests__/avatarUploadLimits.test.ts` (new): 9 cases through the mounted
  app with a real signed JWT; Prisma mocked so every rejection is shown to write nothing.
- Tests passed: yes (9/9; full unit suite 1766 passed, the only failure being the known
  Windows-only `verify-exit-codes` CI-09 `spawn /usr/bin/bash ENOENT`). Build clean: backend
  `tsc --noEmit`, ESLint and Prettier on changed files.

## What Worked

Running the new suite against main's route first, with 2.3.0 already installed, isolated the
evidence: the four accept-with-200 failures are attributable to the missing bounds rather than
to the library version, so the upgrade and the limits are each justified on their own.

## What Needed Editing

Two corrections came out of actually running things rather than reasoning about them:

- The ticket cites GHSA-72gw-mp4g-v24j as "fixed in 2.2.0". `npm audit` showed three further
  advisories open at 2.2.0 — GHSA-wc9g-mqfw-jrwm, GHSA-535w-7cp7-47q4 and
  GHSA-qvfw-j98x-7q72 — all requiring 2.3.0. Upgrading only to the version named in the ticket
  would have left the route on a flagged release.
- `parts: 1` rejected the healthy single-part upload. busboy emits `partsLimit` when the
  counter _reaches_ the limit (`if (++parts === partsLimit)`), unlike `files`/`fields`, which
  reject the part that would exceed them. The healthy-path case caught it; `parts: 2` is the
  value that admits exactly one part.

## Lessons

Write the healthy-path assertion before the abuse assertions. A limits change is easy to make
too tight, and only the healthy case fails when that happens — every abuse case still passes,
so a suite made of abuse cases alone would have shipped a broken upload button.

Treat a dependency version named in a ticket as the floor, not the target: re-derive it from
the advisory list at implementation time.

## Rating

4/5
