# Prompt log

How we capture what we asked Cursor (or Claude Code) to do on significant work — so the team can learn from each other.

## When to log

**Once per ticket, at the end** — when the feature is done and you're opening the PR. Not per commit, not per session.

## Format

One markdown file per ticket:

`YYYY-MM-DD-ticket-{id}-short-description.md`

Example: `2026-07-06-ticket-623-k2-instant-feedback-quiz.md`

Use the template in `prompts/_template.md`.

## What to include

Write in **your** voice (first person). Summarize how you directed the work across the ticket:

- What you were trying to ship
- The main prompts / directions you gave (paraphrased is fine)
- What shipped, what you had to fix by hand
- What you'd do differently

## What to skip

- Trivial one-liners (`rename this var`, `fix this typo`)
- Exploratory questions that never changed code
- Multiple files for the same ticket
