# Bound public context aggregation

**Date:** 2026-11-10
**Agent:** Codex
**Issue:** #887

## Prompt

> implement

Accepted scope: implement the next four recommended tickets. This PR covers the
public Task Ranker context aggregation endpoint (#887).

## Changes and verification

- Preserve the explicitly public aggregate-only contract and existing ratios.
- Return six scalar user counts instead of lists grouped by student ID.
- Share one pending refresh and a 60-second cache across all callers. Wait for
  the entire batch to settle, and throttle failed refreshes for five seconds.
- Limit each address to 60 requests per minute before database work. Caches
  and limits are process-local, matching the existing backend deployment model.
- Nine tests cover the healthy/empty contract, scalar queries, expiry, query/IP
  variation, concurrent misses, rate limiting, failure recovery, a partially
  failed pending batch, and the actual public server mount. The initial seven
  tests produced two healthy passes and five expected failures before the fix.
