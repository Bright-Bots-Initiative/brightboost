## 2024-05-23 - Accessible Circular Progress Indicators
**Learning:** For circular progress indicators (rings), using `role="img"` with an `aria-label` provides a basic experience, but `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` offers richer semantics. Screen readers can then announce it as a progress bar with a specific percentage, rather than just an image.
**Action:** Always prefer `role="progressbar"` for progress indicators. If the visual representation is complex (like an SVG ring), mark the SVG as `aria-hidden="true"` and put the role and values on the container.

## 2024-05-23 - Accessible Status Badges
**Learning:** Visual status indicators (like Locked/Unlocked icons + text) often lack explicit text for screen readers if the status is conveyed only by icon or color.
**Action:** Add `aria-label` to the container describing the full state (e.g., "Level 1: Unlocked") or use `sr-only` text to explicitly state the status. Mark purely decorative icons as `aria-hidden="true"`.
