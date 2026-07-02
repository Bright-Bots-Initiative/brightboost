# Prompt Writing Guide (for interns)

> Relocated from `CLAUDE.md` (2026-07-01) — this is people-facing guidance; `CLAUDE.md` stays focused
> on what a Claude Code session needs. Workflow rules live in `CONTRIBUTING.md`.

Before writing a Claude Code prompt, check:

1. **Did you read the relevant files first?** Don't ask Claude to fix something you haven't looked at.
2. **Is your intent clear in one sentence?** If you can't say what you want in one sentence, break the task up.
3. **Did you include context?** Reference specific file paths, function names, or error messages.
4. **Did you specify what NOT to change?** Claude Code works best with constraints.
5. **Did you include acceptance criteria?** How will you know it worked?

After Claude Code runs:

1. **Can you explain every line it wrote?** If not, don't ship it.
2. **Did you run the tests?** `npm run lint && npm run test && npm run typecheck`
3. **Did you test it in the browser?** Build output is not the same as working output.
4. **Did you log the prompt?** Add it to `prompts/` if it was significant.

## Task Spec Template

Use this structure for every task:

```
## Intent
[One sentence: what needs to be built/fixed]

## Context
[Why this matters for Bright Boost, who it affects, where it sits in the product]

## Relevant Areas
[Likely files, routes, components, services, schema, or tests]

## Current Behavior
[What the app does now]

## Desired Behavior
[What it should do after the change]

## Acceptance Tests
- [ ] specific behavior 1
- [ ] specific behavior 2
- [ ] specific behavior 3

## Edge Cases
- edge case 1
- edge case 2

## Constraints
- Preserve bilingual support
- Keep K–2 readability
- Avoid unrelated regressions
- Match current code patterns
- Do not change architecture unless necessary
```
