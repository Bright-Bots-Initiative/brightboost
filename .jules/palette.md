## 2024-05-23 - Broken i18n Initialization

**Learning:** The project uses `VITE_ENABLE_I18N=true` but `i18n` is not initialized in `src/main.tsx` or similar, causing runtime errors when `useTranslation` hook is used. This prevents manual verification of components relying on i18n.
**Action:** When working on i18n-related components, rely on unit tests with mocked `react-i18next` until the infrastructure is fixed.

## 2024-05-23 - Accessibility in Navigation

**Learning:** Screen readers require explicit indicators for the currently active page in navigation menus. The `aria-current="page"` attribute is the standard way to achieve this.
**Action:** Always add `aria-current="page"` to the active item in any navigation component.

## 2025-05-21 - Input Error Accessibility

**Learning:** Standard inputs often lack programmatic association between the input field and its error message. This makes it impossible for screen reader users to know why a field is invalid.
**Action:** Use `aria-describedby` pointing to the error message ID and `aria-invalid="true"` on the input. Use `React.useId()` to generate stable, unique IDs for these associations.

## 2025-12-25 - Dynamic Alert Accessibility

**Learning:** Dynamically rendered error containers (like login failures) are not announced by screen readers unless they have `role="alert"` and `aria-live` attributes.
**Action:** Always add `role="alert"` and `aria-live="polite"` to conditional error message containers.

## 2025-01-20 - Password Visibility Patterns

**Learning:** Password fields without a visibility toggle are a significant usability hurdle and accessibility issue.
**Action:** Use `PasswordInput` component (`src/components/ui/password-input.tsx`) which handles the toggle state, icons, and accessibility attributes (ARIA labels, keyboard focus) automatically, ensuring consistency across Student and Teacher login flows.

## 2025-05-22 - Component Adoption\n\n**Learning:** Standardized components (like `PasswordInput`) are only effective if they are universally adopted. Legacy implementations (like in `StudentLogin.tsx`) miss out on new accessibility features (Caps Lock warning).\n**Action:** Prioritize refactoring legacy views to use standard components before adding new features to those components.
