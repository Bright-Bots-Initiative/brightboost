> **Canonical for:** accessibility learnings (migrated from `.jules/palette.md`). Last verified against code: 2026-08-10.

# Accessibility learnings

## Active navigation

Screen readers need an explicit current-page indicator in nav.

**Action:** Set `aria-current="page"` on the active navigation item.

## Input errors

Inputs often lack a programmatic link to their error text.

**Action:** Use `aria-describedby` → error id, `aria-invalid="true"` on the field, and `React.useId()` for stable ids.

## Dynamic alerts

Conditionally rendered error containers are not announced unless live-region attributes are set.

**Action:** Add `role="alert"` and `aria-live="polite"` to dynamic error containers.

## Password visibility

Password fields without a visibility toggle hurt usability and a11y.

**Action:** Use shared `PasswordInput` (`src/components/ui/password-input.tsx`) for toggle state, icons, and ARIA.

## Adopt shared components

New a11y features on shared inputs help only if legacy screens adopt them.

**Action:** Prefer refactoring legacy views onto shared components before extending those components further.

## Interactive `div` focus

`div`s with `role="button"` / `tabIndex={0}` do not get default focus rings.

**Action:** Add explicit `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none` (or equivalent) on non-button interactive elements.

## Input label styling

Shared `Input` may hardcode label styles that conflict with themed pages.

**Action:** For strict custom themes, render `<label>` externally and use `Input` without its `label` prop.

## i18n and a11y verification

When i18n infrastructure is incomplete, rely on unit tests with mocked `react-i18next` for components that call `useTranslation` until the boot path is verified.
