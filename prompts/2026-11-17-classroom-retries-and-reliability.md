# K–2 practice, route loading and account integrity

**Date:** 2026-11-17

**Prompt:** “implement” (the four tickets just ranked by value versus effort).

- #622: Give K–2 learners two retries and show the answer before advancing in the four Set 1 games. Preserve challenge mode for grades 3–5.
- #906: Split role screens and games at matching routes, and enforce compressed route budgets in the production build.
- #883: Reject old sessions after a credential or authority change; retain ordinary profile sessions.
- #888: Claim a specialty and grant its abilities in one transaction, including for a first-time avatar.

Regression coverage exercises the games, the built dependency graph, and actual session and selection routes against disposable PostgreSQL.

**Follow-up, 2026-11-24:** Resolve the conflicts with main while preserving Qubit Cove as the featured game from #971. Keep the grades 3–5 Tank Trek option and its shared links, and verify which game each public entry actually loads.
