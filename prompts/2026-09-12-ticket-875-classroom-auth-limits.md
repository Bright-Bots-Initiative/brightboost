# Ticket #875 — Size class sign-in for a classroom and bound it per child

**Author:** Claude Code (Opus 5)
**Date:** 2026-09-12
**Sprint:** Audit remediation (tracker #870)
**Pod:** Build

## Intent

A class signs in from one school address. Roster lookup and class login shared `authLimiter`
(20 requests per address per 15 minutes, counting successes) at two requests per child, so the
eleventh child onwards was refused while holding valid credentials, and teacher `/login` drew
on the same 20.

## Prompt

```text
#875 (Audit SEC-05): the shared authentication limit is too small for a classroom. Separate
discovery from authentication, use account/class-aware failed-attempt limits with broader
abuse protection, and support the expected classroom size. Verify a whole class signing in
through one IP while repeated wrong credentials remain limited.
```

## What Claude Code Did

- `backend/src/utils/security.ts`: three new limiters — `classDiscoveryLimiter` and
  `classLoginIpLimiter` (60 failures per address) and `classLoginAccountLimiter` (8 failures
  per course + student). All three set `skipSuccessfulRequests`, so correct sign-ins cost
  nothing and only wrong answers consume budget.
- `backend/src/routes/classLogin.ts`: the lookup route takes the discovery limiter; the login
  route takes the address and per-child limiters in that order.
- `backend/src/routes/__tests__/classroomAuthLimits.test.ts` (new): 7 cases through the
  mounted app.
- Tests passed: yes (7/7). Build clean: backend `tsc --noEmit`, ESLint and Prettier on changed
  files.

## What Worked

`trust proxy` is already set to 1, so every request in the suite can carry its own
`X-Forwarded-For`. That made it possible to model the two abuse shapes separately and
honestly: thirty children behind _one_ address for the classroom case, and one child attacked
from _nine_ addresses for the per-child case — which is precisely the attack an address-keyed
limit cannot see.

The existing creation limiters already carried the reasoning ("a classroom commonly shares one
public IP, so IP-keyed limits would make 30 legitimate students consume the same bucket"), so
the fix followed a pattern the repo had already established rather than inventing one.

## What Needed Editing

- The first version lowered the limits under `NODE_ENV=test`, copying the creation limiters.
  That inverted the production ratio — 5 per address against 3 per child, where production is
  60 against 8 — and CL-5 failed: the classmate was refused because the _address_ budget ran
  out, not the child's. With bcrypt mocked the whole suite runs in under a second at the real
  numbers, so the override was removed. The ratio between the two budgets is part of the
  behaviour and a test-only configuration cannot prove it.
- The first fixture gave only half the roster a PIN and reused children between cases. A child
  with no PIN is admitted whatever PIN is sent, so "wrong PIN" cases silently returned 200;
  and because the per-child bucket is keyed by course and student rather than by address, it
  survived across cases. Each case now uses its own course id and sprays only PIN holders.

## Lessons

A per-account rate limit is deliberately blind to the address, which also means it is blind to
test boundaries. Give each case its own key namespace or the fourth test inherits the third's
budget.

When a limiter's correctness is a _relationship_ between two limits, do not let the test
environment change either one.

## Rating

4/5
