# Forward async route failures

**Date:** 2026-11-10
**Agent:** Codex
**Issue:** #848

## Prompt

> implement

Accepted scope: implement the next four recommended tickets. This PR covers
consistent error forwarding for the Express 4 backend (#848).

## Changes and verification

- Register express-async-errors before the server imports any router; preserve
  existing authentication, route-specific catches, and the global error body.
- Delegate late failures when response headers have already been sent.
- Test healthy responses then rejected database operations through the actual
  server in 15 route files, plus authentication, role, validation, status codes,
  and late-response handling. Before the hook, 10 route cases and two async
  status-code cases timed out; existing handled routes remained healthy.
- Run targeted regressions, backend typecheck, and the canonical parity runner.
  Record results and environment limitations in the PR.
