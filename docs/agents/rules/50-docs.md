# Documentation rules

- One **canonical** document per topic. Cross-link; do not duplicate bodies.
- Every canonical doc carries: `Canonical for: …` and `Last verified against code: YYYY-MM-DD`.
- Agent context lives under `docs/agents/`. Tool adapters are routers into `docs/agents/agent.md` only.
- Root markdown allowlist (enforcement via `docs:check`): keep root files minimal. Adding a new root Markdown file requires an explicit allowlist decision — prefer under `docs/`.
- PR bodies carry completion summaries. Do not land AI-generated architecture essays or planning ADRs in the product repo.
- Before deleting a doc, repair every inbound link.
- Imperative voice for agent instructions; tables for more than two parallel facts; no "simply" / "just" / "obviously".
- Name known-broken issues by number (`#646`, `#707`, `#754`).
