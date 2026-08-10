---
name: i18n-strings
description: Add or translate user-facing copy when changing UI strings, locale JSON, or localized content helpers.
---

# i18n strings

Follow `docs/agents/rules/20-i18n.md` and `docs/i18n.md`. This skill is procedure only.

## Steps

1. Find existing keys near the component before inventing new ones.
2. Add keys to `en` and `es` at minimum (`src/locales/...`); add `vi` / `zh-CN` when practical.
3. Wire UI through `useTranslation()` — no hardcoded English in JSX.
4. For non-UI content data, use `pickLocale()` from `src/utils/localizedContent.ts`.
5. For DB-sourced names, use `translateContentName()` where that path already exists.
6. Uncertain translations: English value + `// TODO: translate`.

## Checklist

- [ ] Keys in en + es
- [ ] No new literal UI English
- [ ] Glossary terms live in locale JSON when applicable
