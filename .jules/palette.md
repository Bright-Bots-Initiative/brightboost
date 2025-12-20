## 2024-05-23 - Broken i18n Initialization
**Learning:** The project uses `VITE_ENABLE_I18N=true` but `i18n` is not initialized in `src/main.tsx` or similar, causing runtime errors when `useTranslation` hook is used. This prevents manual verification of components relying on i18n.
**Action:** When working on i18n-related components, rely on unit tests with mocked `react-i18next` until the infrastructure is fixed.
## 2024-05-23 - Accessibility in Navigation
**Learning:** Screen readers require explicit indicators for the currently active page in navigation menus. The `aria-current="page"` attribute is the standard way to achieve this.
**Action:** Always add `aria-current="page"` to the active item in any navigation component.
## 2024-05-23 - Accessible Form Validation Patterns
**Learning:** Standard form validation in this codebase (Student Login) was missing programmatic associations between inputs and errors.
**Action:** For all forms, ensure:
1.  Global error containers have `role="alert"` and `aria-live="polite"`.
2.  Input fields use `aria-invalid={!!error}`.
3.  Input fields link to error message IDs using `aria-describedby="error-id"`.
