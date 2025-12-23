## 2024-05-23 - Broken i18n Initialization

**Learning:** The project uses `VITE_ENABLE_I18N=true` but `i18n` is not initialized in `src/main.tsx` or similar, causing runtime errors when `useTranslation` hook is used. This prevents manual verification of components relying on i18n.
**Action:** When working on i18n-related components, rely on unit tests with mocked `react-i18next` until the infrastructure is fixed.

## 2024-05-23 - Accessibility in Navigation

**Learning:** Screen readers require explicit indicators for the currently active page in navigation menus. The `aria-current="page"` attribute is the standard way to achieve this.
**Action:** Always add `aria-current="page"` to the active item in any navigation component.

## 2025-05-21 - Input Error Accessibility

**Learning:** Standard inputs often lack programmatic association between the input field and its error message. This makes it impossible for screen reader users to know why a field is invalid.
**Action:** Use `aria-describedby` pointing to the error message ID and `aria-invalid="true"` on the input. Use `React.useId()` to generate stable, unique IDs for these associations.

## 2025-05-22 - Semantic Progress Bars

**Learning:** Visual progress bars implemented as nested `div`s with width percentages are invisible to screen readers, leaving users unaware of status or completion.
**Action:** Always wrap visual progress indicators with `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` to ensure the value is communicated programmatically.
