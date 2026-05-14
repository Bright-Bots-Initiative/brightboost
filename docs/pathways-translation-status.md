# Pathways Translation Status

Last updated: 2026-05-13

This doc tracks the state of multilingual coverage for the Pathways product
layer. The K-2 / K-8 side has its own translation status; this doc is
Pathways-specific.

i18n infrastructure:
- Locale files: `src/locales/{en,es,vi,zh-CN}/pathways.json`
- Merged into the existing `translation` namespace in `src/i18n.ts`
- `fallbackLng: "en"` means missing keys in any locale gracefully fall back
  to English — the UI **never** shows raw key strings like
  `pathways.foo.bar`.

## Per-Locale Coverage

| Locale | UI Chrome | Modules (slides/quizzes) | Module Guides | FAQs | Worksheets | Facilitation Tips |
|---|---|---|---|---|---|---|
| en | ✅ complete | ✅ complete | ✅ complete (data file in TS) | ✅ complete (data file in TS) | ✅ complete (data file in TS) | ✅ complete (data file in TS) |
| es | ✅ complete | ⚠️ Module 1 (Cyber Foundations) only | ❌ falls back to en | ❌ falls back to en | ⚠️ section titles only | ⚠️ section titles only |
| vi | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en |
| zh-CN | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en | ❌ falls back to en |

Legend:
- ✅ complete: all visible keys exist in the locale file
- ⚠️ partial: tab titles and high-level chrome translated; deeper content
  in English fallback
- ❌ falls back to en: no keys in this locale; i18next returns the English
  value via `fallbackLng`

## What "UI Chrome" Covers

- `PathwaysLayout` — sidebar nav, mobile bottom nav, theme toggle labels
- `PathwaysHome` — hero, stats, sections
- `PathwaysAbout` — entire public landing page
- `TracksOverview` — track grid + names/taglines/descriptions
- `TrackDetail` — module timeline, status labels
- `ModulePlayer` — completion screen, back nav
- `PathwaysProfile` — stats, completed modules list
- `FacilitatorDashboard` — full dashboard + learner detail view
- `Resources` tabs — tab labels + UI chrome inside each tab

## What's NOT Yet Translated (and Where the English Lives)

The following content remains in English-only TypeScript data files. These
files are facilitator-facing and English is the partner-meeting language
for the current pilots, so they were deprioritized for translation. The
hook to fix them later is in place — see "Migration Path" below.

1. **`src/components/pathways/modules/CyberLaunchModules.tsx`** — Modules
   2-7 interior content (phishing scenarios, password ratings, log entries,
   career cards, capstone businesses). Module 1 (Cyber Foundations) IS
   wired to i18n and translated to Spanish as a proof-of-concept.

2. **`src/components/pathways/facilitator/data/moduleGuides.ts`** — all 7
   detailed module guides (11 sections each: what it teaches, why it
   matters, facilitator role, discussion questions, sticking points,
   extensions, real-world connection, vocabulary, red flags).

3. **`src/components/pathways/facilitator/data/faqs.ts`** — 38 FAQ entries
   across 3 categories (youth, parents, partners).

4. **`src/components/pathways/facilitator/data/worksheets.ts`** — 8
   printable worksheets. The print output itself is English; the tab UI
   chrome is i18n'd.

5. **`src/components/pathways/facilitator/data/facilitationTips.ts`** — 6
   sections of facilitation guidance.

## Migration Path for Deep Translation

When deep translation of the data files becomes a priority, the cleanest
path is:

1. **Per-data-file:** Add a sibling locale key in `pathways.json` that
   mirrors the data structure. For example, `pathways.moduleGuides.foundations.whatItTeaches`.
2. **At render time:** Components rendering this data already use
   `useTranslation()`. Wrap each rendered string with
   `t(\`pathways.moduleGuides.${guide.slug}.whatItTeaches\`, guide.whatItTeaches)`.
3. The second argument is the English fallback. Since the TS data still
   holds English, the fallback chain is correct even with partial coverage.

This approach was already applied to Module 1 (`CyberFoundations`) — see
that component for the pattern. The other modules and data files can be
incrementally migrated using the same shape.

## Sensitive Content Translation Notes

Some content has nuance that machine translation will mishandle. Items
flagged for native-speaker review when translation begins:

- **Trauma-informed and justice-impacted youth framing** (in
  `facilitationTips.ts`) — needs review by a clinician or program staff
  familiar with the population in each target language community.
- **"I have a record" FAQ responses** — legal nuance and tone matter.
  Inappropriate translation could give false hope or be unintentionally
  patronizing.
- **Partner outcome claims** — translated numbers should be checked
  against the source data still valid in each target market.

## Adding a New Locale (e.g., Haitian Creole)

1. Create `src/locales/ht/pathways.json` mirroring `en/pathways.json`.
2. Import in `src/i18n.ts` and add to `resources`. If lazy-loadable, add
   to the `ensureLocaleLoaded` switch instead.
3. Add to `SUPPORTED_LANGUAGES` in `src/i18n.ts`.
4. Update this doc.

Missing keys gracefully fall back to English; you can ship a partial file
and fill it in over time.
