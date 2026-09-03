> **Canonical for:** BRAND_R0 accessibility and performance baseline. Last verified against code: 2026-09-03.

# Accessibility and performance baseline (BRAND_R0)

Reproducible procedures first; captured values where BRAND_R0 could capture them without a browser attached. Rows without a value are `PENDING_EXTERNAL_READ` for the operator with Chrome (final staging verification), not gaps in the procedure.

## Existing repository signals

| Signal                | Where                                                                                                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| axe integration       | `cypress-axe` is a devDependency; used only by the quarantined `cypress/e2e/legacy/classRoster.cy.ts` and `cypress/support/index.js`                                                                        |
| Reduced motion        | `prefers-reduced-motion` handled in `src/App.css`, `src/index.css`, `src/components/games/shared/game-effects.css`, `useReducedGameEffects.ts`, Waterworks + Echo Avenue CSS, Pathways `CelebrationContext` |
| Learned a11y notes    | `docs/agents/learned/accessibility.md`; contract in flight: #843 (PR #853)                                                                                                                                  |
| Known contrast defect | #802 ("Use a different code" link 4.24:1 at 14px)                                                                                                                                                           |
| Layout defect (games) | #639                                                                                                                                                                                                        |
| Bundle-size check     | `bundle-size-check.yml` (400 MB `dist` ceiling, reports only); `scripts/check-bundle-size.js` (2 MB warn / 5 MB fail, CommonJS in an ESM package — #816)                                                    |

## Procedures

### 1. Accessibility (axe) — per public route

```bash
# staging or local; CYPRESS_SWA_URL must be set (cypress.config.ts refuses otherwise)
CYPRESS_SWA_URL=https://<host> npx cypress run --spec "cypress/e2e/legacy/classRoster.cy.ts"   # existing axe example
```

BRAND_R1_DESIGN adds an axe spec over the public route list in `seo-content-baseline.md`; until then, record manual axe DevTools results per route (violations by impact) in the evidence register.

### 2. Reduced motion

Chrome DevTools → Rendering → _Emulate CSS media feature prefers-reduced-motion: reduce_. Expected on `/`: cloud drift and mascot bob stop; focus rings stay; content order unchanged. Record any element still animating.

### 3. Keyboard flow

Tab from the address bar on `/`: skip link (`skipToContent`) → nav → hero CTAs ("I'm a Teacher", "I'm a Student!") → secondary links → plan cards → audience cards → feedback tabs/textarea/submit → donation chips → footer. Every stop must show a visible focus ring; no trap; `Enter`/`Space` activate. Repeat on `/teacher-login`, `/student-login`, `/class-login`, `/try`.

### 4. Reflow

320 px wide, 400 % zoom: no horizontal scroll on public routes; maze board scales (#836). Record breakpoints that clip.

### 5. Performance (lab)

```bash
npx lighthouse https://<host>/ --preset=desktop --output=json --output-path=./lh-home-desktop.json
npx lighthouse https://<host>/ --output=json --output-path=./lh-home-mobile.json   # mobile default
```

Record: Performance score, LCP, TBT, CLS, total transfer. Run three times; keep the median.

### 6. Performance (field)

Real-user vitals already flow to PostHog (`$web_vitals`). Baseline captured 2026-09-03 (`query-web-vitals`, p75, 30 days): LCP `/student/modules` 925 ms, `/` 1761 ms; CLS `/` 0.0094, maze-maps activity 0.088 — all "good". Ten samples; INP/FCP not yet queried.

### 7. Bundle size

```bash
npm run build && du -sk dist && ls -la dist/assets | sort -k5 -n -r | head
```

Record total `dist` size and the five largest chunks. The BRAND_R0 measurement is recorded in [`baseline.md`](baseline.md) once the merge-candidate build runs.

## Captured values (2026-09-03)

| Row                      | Value                                     | Confidence / limitation                         |
| ------------------------ | ----------------------------------------- | ----------------------------------------------- |
| Field LCP / CLS          | see §6                                    | High for the samples; low sample count          |
| Lab Lighthouse           | `PENDING_EXTERNAL_READ` (needs a browser) | —                                               |
| axe violations per route | `PENDING_EXTERNAL_READ`                   | —                                               |
| Reduced motion           | `PENDING_EXTERNAL_READ`                   | code paths exist (see table above)              |
| Keyboard flow            | `PENDING_EXTERNAL_READ`                   | —                                               |
| Reflow 320 px            | `PENDING_EXTERNAL_READ`                   | #836 fixed the maze board                       |
| Bundle size              | recorded in `baseline.md`                 | measured on the BRAND_R0 branch, not production |
