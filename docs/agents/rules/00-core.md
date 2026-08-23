# Core rules

- Prefer the **minimal diff** that solves the task. Match adjacent patterns; reuse existing components, hooks, and utils. Do not invent architecture unasked.
- Resolve conflicts with the source-of-truth ladder in `docs/agents/overview.md` (code → package.json → schema → README → tests → active docs → legacy).
- **Push back** when a request would expand scope, weaken a guard, or contradict code. Surface the conflict; do not silently pick a side.
- `main` is protected: no direct pushes; require review; prefer squash merge and linear history.
- Branch as `your-name/short-description`. Use conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, …).
- Functional React components + hooks; TypeScript strict; no `any` unless commented why.
- Preserve educational intent and the K–2 bar (simple vocabulary, large targets, clarity over complexity).
- Log significant AI prompts in `prompts/` when shipping AI-assisted work (see repo `CONTRIBUTING.md` / prompts README).
