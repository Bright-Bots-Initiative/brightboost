# Classroom reliability and verification fixes

**Author:** Nathaniel Walker with Codex
**Date:** 2026-10-05
**Tickets:** #816, #884, #899, #903

## Prompt

> Work through these 4 tickets and implement.

The selected tickets repair the local bundle check, remove public Slack test
endpoints, distinguish failed class loads from empty accounts, and keep rejected
grade-band changes from appearing saved.

## Implementation and verification

- Share the existing 400 MiB CI deployment-footprint budget between local and
  hosted checks; prove the exact boundary and refusal of missing/empty builds.
- Remove the temporary notification router. Test both removed endpoints against
  the actual Express application with notification delivery mocked.
- Preserve confirmed class/home-group lists through refresh failures and expose
  translated recovery actions.
- Validate course HTTP responses and grade-band payloads; serialize selector
  writes and ignore responses from an unmounted class view.
- Capture failing regressions before implementation and run focused tests plus
  the repository parity command. The PR records final outcomes and environment
  limitations; no production data mutation or deployment is part of this work.
