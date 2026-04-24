# Contributing to Bright Boost

## Branch Workflow

1. **Never push directly to `main`.** All changes go through pull requests.
2. Create a feature branch from `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b your-name/short-description
   ```
   Example: `alice/fix-maze-maps-scoring` or `catarina/redesign-game-cards`

3. Make your changes, commit with clear messages:
   ```bash
   git add .
   git commit -m "fix: cap Maze Maps score at 100%"
   ```

4. Push your branch and open a PR:
   ```bash
   git push origin your-name/short-description
   ```
   Then open a Pull Request on GitHub.

5. Your PR needs at least **1 review** from a pod lead or Nathaniel before merging.

6. After approval, merge via GitHub (squash merge preferred).

## Commit Message Format

Use conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring (no behavior change)
- `docs:` — documentation only
- `style:` — formatting, no code change
- `test:` — adding or fixing tests
- `chore:` — maintenance, dependencies, config

## Code Review Checklist

Before approving a PR, reviewers check:
- [ ] Does it build? (`npm run build`)
- [ ] Does it pass lint? (`npm run lint`)
- [ ] Does it pass tests? (`npm run test`)
- [ ] Is there hardcoded English? (should use i18n keys)
- [ ] Is it mobile responsive?
- [ ] Does it match existing code patterns?
- [ ] If Claude Code was used, is the prompt logged in `prompts/`?

## Pod Leads

- **Build Pod Lead:** Alice Lin — reviews all Build Pod PRs
- **Experience Pod Lead:** Catarina Lucas Herrera — reviews all Experience Pod PRs
- **Cross-pod PRs:** Both leads review

## Getting Help

Stuck? Post in `#help` on Slack before spinning your wheels for more than 30 minutes.
