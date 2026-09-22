# Keyboard completion and session recovery (#880, #904)

**Date:** 2026-09-22
**Agent:** Codex

## User request

“Now 875, 881, 880 and 904”, followed by “Reconnect”. Issues #875 and #881
were already merged; resume the remaining two fixes.

## Changes

- Keep one focused jump button across hold/release; support Space, Enter,
  pointer capture and assistive activation. Cancel interrupted attempts without
  scoring. Explain keyboard input in EN/ES/VI/ZH-CN.
- Preserve the cached session on unavailable or malformed session checks;
  expose a manual, single-flight retry with a 10-second deadline. Only 401 or
  the API's `403 forbidden_invalid_token` clears credentials in storage and state.
- Fence asynchronous responses by attempt identity, including response-body
  parsing, login with the same token, logout, unmount and StrictMode cleanup.
- Localize retry feedback in all four languages.

## Regression evidence

On the original implementation, all five initial input tests failed at the
missing keyboard activation / replaced button assertions. On the original auth
provider, the healthy refresh passed and 16 outage, invalidation, timeout and
stale-response assertions failed. Both suites pass with the repairs.

The input suite completes the real playfield and jump retry using each keyboard
key and checks the final scoring payload. Auth tests use deferred responses to
exercise races and verify both React state and persisted credentials.

The canonical local verifier passed lint, both typechecks, schema drift and
repository guards, then hit this runtime's blocked network-interface syscall
when Vite started Storybook (`uv_interface_addresses`, CI-09). This is a failed
local verification run, not a green result. PR CI must validate browser, database
and integration checks; final validation receipts belong in the PR.
