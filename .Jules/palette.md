## 2024-05-23 - Accessible Circular Progress Indicators

**Learning:** For circular progress indicators (rings), using `role="img"` with an `aria-label` provides a basic experience, but `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` offers richer semantics. Screen readers can then announce it as a progress bar with a specific percentage, rather than just an image.
**Action:** Always prefer `role="progressbar"` for progress indicators. If the visual representation is complex (like an SVG ring), mark the SVG as `aria-hidden="true"` and put the role and values on the container.

## 2024-05-23 - Accessible Status Badges

**Learning:** Visual status indicators (like Locked/Unlocked icons + text) often lack explicit text for screen readers if the status is conveyed only by icon or color.
**Action:** Add `aria-label` to the container describing the full state (e.g., "Level 1: Unlocked") or use `sr-only` text to explicitly state the status. Mark purely decorative icons as `aria-hidden="true"`.

## 2024-05-24 - Dynamic ARIA Labels in Lists

**Learning:** In tables or lists, generic labels like "Edit" or "Delete" are confusing for screen reader users when navigating by form controls. They hear repeated "Edit" without context.
**Action:** When iterating over items (like rows in a table), append the item's name to the action button's `aria-label` (e.g., "Edit Algebra 101") to provide necessary context.

## 2024-05-24 - Contextual Replay Buttons

**Learning:** When a "Replay" button is placed next to a completed item (which might have its own "Done" status or button), the context can be lost for screen reader users if the button label is just "Replay". They might not know *which* item they are about to replay.
**Action:** Always include the item name in the `aria-label` for "Replay" or similar repetitive actions in a list (e.g., "Replay [Activity Name]").

## 2024-05-25 - Accessible Skeleton Loading

**Learning:** Visual-only loading skeletons are invisible to screen readers, leaving users in silence during load times.
**Action:** Wrap skeleton groups in a container with `role="status"`, `aria-busy="true"`, and an `aria-label` (e.g., "Loading modules"). Also include a visually hidden text element (using `sr-only`) as a fallback description.

## 2024-05-25 - Tooltips and Title Attributes

**Learning:** Using both a `title` attribute on a button and a custom Tooltip component results in double tooltips (system + custom) and potentially duplicate screen reader announcements.
**Action:** When integrating a custom Tooltip, conditionally remove the `title` attribute from the trigger element while ensuring `aria-label` is still present for accessibility.

## 2024-05-25 - Accessible Loading Buttons
**Learning:** When a button enters a loading state, replacing content with "Loading..." text can break layout for icon-only buttons (`size="icon"`). Also, screen readers benefit from `aria-busy="true"` to understand the state.
**Action:** Conditionally hide loading text for icon buttons and ensure `aria-busy` is toggled.
