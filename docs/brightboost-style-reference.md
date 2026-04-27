# Bright Boost Style Reference (Current-State Baseline)

This document captures the **current Bright Boost visual and structural system** from the codebase as the source of truth. It is intended to guide future homepage, SEO, donation, feedback, and user-counter updates **without redesigning the brand/UI**.

## 1) Current color palette (from `tailwind.config.ts`)

### Brand colors (`brightboost.*`)
- `brightboost.navy`: `#1C3D6C`
- `brightboost.blue`: `#46B1E6`
- `brightboost.lightblue`: `#8BD2ED`
- `brightboost.yellow`: `#FF9C81`
- `brightboost.green`: `#69D681`

### Semantic tokens (shadcn/Tailwind CSS variables)
- `border`, `input`, `ring`, `background`, `foreground`
- `primary`, `secondary`, `destructive`, `muted`, `accent`, `popover`, `card` (with `foreground` variants)

These semantic colors are mapped to CSS custom properties (HSL tokens in `index.css`) and should be preferred for generic UI primitives, while `brightboost.*` drives homepage/brand expressions.

## 2) Current font usage (`App.css`, `index.css`, Tailwind config)

### Tailwind font families
- `font-montserrat`: `Montserrat, system-ui, sans-serif`
- `font-sans`: `Montserrat, Inter, system-ui, sans-serif`

### CSS-defined font sources and defaults
- `App.css` imports Montserrat from Google Fonts and sets body to Montserrat.
- `index.css` defines local `@font-face` for Inter (`/fonts/Inter.woff2`) and root fallback stack.
- `GameBackground` applies `font-montserrat` at the page wrapper level for the landing experience.

### Practical usage rule
- Keep Montserrat as the dominant marketing/homepage voice.
- Keep Inter available for utility/body/form contexts already using the generic `sans` stack.
- Do not introduce new type families for homepage/marketing additions.

## 3) Existing button styles (`src/components/ui/button.tsx` + game button classes)

### Reusable UI Button component (`button.tsx`)
Base behavior:
- `inline-flex`, center aligned, `rounded-md`, `font-medium`
- transition + focus-ring accessibility (`focus:ring-2`, `focus:ring-offset-2`)
- loading state with spinner and `aria-busy`
- disabled style: `opacity-50 cursor-not-allowed`

Supported variants:
- `default` (`bg-primary` / semantic)
- `primary` (blue)
- `secondary` (gray)
- `danger` (red)
- `success` (green)
- `outline`
- `ghost`

Supported sizes:
- `default`, `sm`, `md`, `lg`, `icon`

### Game/marketing utility classes (`App.css`)
- `.game-button`: rounded-full, brand-blue background, bold white text, hover scale and shadow
- `.button-shadow`: pressed-depth effect (4px drop that collapses on `:active`)
- `.ui-lift`: elevated card/button effect with hover lift

### Practical usage rule
- For app/product UI, use `<Button>` variants and sizes.
- For hero/CTA styling that matches current landing personality, layer `button-shadow` + existing Tailwind utilities as seen on `Index.tsx`.

## 4) Existing card styles (`src/components/ui/card.tsx` + homepage tiles)

### Reusable Card primitive (`card.tsx`)
- Card base: `bg-white p-6 rounded-lg shadow-md`
- Header spacing: `mb-4`
- Title: `text-xl font-semibold`
- Footer: `mt-4 pt-4 border-t`

### Game card utility (`App.css`)
- `.game-card`: `bg-white`, `rounded-xl`, `shadow-lg`, `border-2 border-brightboost-lightblue`, hover scale and shadow increase

### Homepage feature tile pattern (`Index.tsx`)
- `bg-white/80`
- `backdrop-blur`
- `rounded-xl`
- `p-3`
- `shadow-sm`
- compact icon + short text stack

### Practical usage rule
- Keep card surfaces bright, white/translucent, and soft-rounded.
- Retain light shadows and subtle hover motion; avoid dark, flat, or hard-edged card redesigns.

## 5) Current homepage visual patterns (`src/pages/Index.tsx`)

- Sky-themed environment via `GameBackground`:
  - vertical gradient (`lightblue -> white`)
  - sun glow accent
  - slow drifting cloud layers with bobbing motion
- Hero typography:
  - large bold navy heading (`text-5xl` to `md:text-7xl`)
  - supportive subtitle/tagline in navy with reduced opacity for secondary line
- Feature highlight grid:
  - 2x2 on mobile, 4-up on desktop
  - icon-led, concise copy
- CTA hierarchy:
  - Primary teacher CTA: solid Bright Boost blue
  - Secondary student CTA: purple→pink gradient (current intentional accent)
- Supplemental conversion links:
  - Pathways link
  - reviewer/showcase chips
  - collapsible demo credentials panel
- Footer:
  - simple text links (`for-reviewers | privacy | terms`)

## 6) Current spacing, radius, shadows, gradients, and motion patterns

### Spacing
- Homepage outer shell: `p-4` with vertical rhythm using `mb-8`, `mt-4`, `mt-6`.
- CTA stacks: `space-y-3`.
- Small chips/tiles: `p-2` to `p-4` range.

### Border radius
- System token: `--radius: 0.5rem`.
- Homepage/marketing surfaces frequently use `rounded-xl`.
- Pill/rounded-full used selectively for badges and game-button utility.

### Shadows
- Subtle defaults on lightweight surfaces (`shadow-sm`, `shadow-md`).
- Emphasis CTAs/cards use `button-shadow`, `ui-lift`, or `shadow-lg`.

### Gradients
- Core background gradient: sky-like from Bright Boost light blue to white.
- Sun accent uses radial warm gradient.
- Student CTA uses purple/pink horizontal gradient (keep as-is unless product decides otherwise).

### Motion
- Tailwind animations: `float`, `float-delay`, `float-slow`, `spin-slow`.
- CSS keyframes: cloud drift LTR/RTL, cloud bob, spinner, plus micro-feedback (`bb-shake`, `bb-pop`, `bb-glow`).
- Motion is soft and playful, not aggressive.
- `prefers-reduced-motion` behavior exists and should be preserved/extended for new animation.

## 7) Current footer/nav patterns

### Landing/footer pattern (`Index.tsx`)
- Minimal bottom footer with low-contrast navy text and inline links.
- No heavy multi-column marketing footer currently.

### Student app navigation (`StudentLayout.tsx`)
- Sticky white header with brand wordmark link, language toggle, logout button.
- `BottomNav` for primary student movement.
- `FeedbackFab` persists globally.

### Teacher app navigation (`TeacherLayout.tsx`)
- Sidebar-first layout with collapsible desktop rail and mobile drawer behavior.
- Top navbar area + white content panel.
- Includes `FeedbackFab` and tutorial entry.

### Practical usage rule
- New sections should inherit existing nav/footer patterns per context (landing vs student app vs teacher app), not introduce a separate visual/navigation system.

## 8) Current app/login route structure (`src/App.tsx`)

### Public routes
- `/`
- `/teacher-login`, `/student-login`, `/class-login`
- `/signup`, `/teacher/signup`, `/student/signup`
- `/forgot-password`, `/reset-password`
- `/showcase`, `/for-reviewers`, `/privacy`, `/terms`
- `/pathways/about`

### Protected teacher routes (`/teacher/*`)
- `/teacher/dashboard`
- `/teacher/classes`
- `/teacher/classes/:id`
- `/teacher/students`
- `/teacher/prep/:slug`
- `/teacher/resources`
- `/teacher/pd`
- `/teacher/settings`
- `/teacher/impact`
- `/teacher/showcase`

### Protected student routes (`/student/*`)
- `/student/dashboard`
- `/student/modules`
- `/student/modules/:slug`
- `/student/modules/:slug/lessons/:lessonId/activities/:activityId`
- `/student/join`
- `/student/avatar`
- `/student/play`
- `/student/settings`
- `/student/benchmark/:assignmentId`
- `/student/arena` (redirects to `/student/play?tab=pvp`)

### Admin route
- `/admin/experiments` (teacher-protected)

### Pathways authenticated routes (`/pathways/*`)
- `/pathways`
- `/pathways/tracks`
- `/pathways/tracks/:trackSlug`
- `/pathways/tracks/:trackSlug/:moduleSlug`
- `/pathways/profile`
- `/pathways/facilitator`
- `/pathways/facilitator/resources`

### Legacy redirects currently preserved
- `/login` -> `/student-login`
- `/teacher/login` -> `/teacher-login`
- `/student/login` -> `/student-login`
- `/modules` -> `/student/modules`
- `/avatar` -> `/student/avatar`
- `/arena` -> `/student/play?tab=pvp`

## 9) Do-not-break routes

Treat these as contract routes for existing users, links, and onboarding docs:

- Auth entry: `/`, `/teacher-login`, `/student-login`, `/class-login`, `/signup`
- Legal/reviewer/public trust: `/privacy`, `/terms`, `/for-reviewers`, `/showcase`
- Student core: `/student/dashboard`, `/student/modules`, `/student/play`, `/student/avatar`
- Teacher core: `/teacher/dashboard`, `/teacher/classes`, `/teacher/students`
- Pathways marketing/discovery: `/pathways/about`
- Legacy redirects listed above must continue resolving correctly.

If route changes are ever required, add explicit redirects and migration notes first.

## 10) Rules for future additions (without redesign)

1. **Preserve brand palette**: Use existing `brightboost.*` colors and semantic tokens; do not introduce a replacement palette.
2. **Preserve typography voice**: Keep Montserrat-forward brand tone on homepage/marketing surfaces.
3. **Use existing components first**: Extend `Button` and `Card` patterns before inventing new primitives.
4. **Keep playful-light visual tone**: Sky gradients, soft shadows, rounded corners, gentle motion.
5. **Keep CTA hierarchy stable**: Primary teacher CTA remains visually dominant on homepage unless product requirements explicitly change.
6. **Respect spacing rhythm**: Continue using compact, readable spacing scales already present (`p-3/p-4`, `mt-4/mt-6/mb-8`, `space-y-3`).
7. **Respect accessibility**:
   - Maintain focus ring visibility.
   - Preserve reduced-motion support.
   - Keep contrast acceptable for text on translucent surfaces.
8. **Avoid nav fragmentation**: Reuse existing landing footer, student header/bottom nav, and teacher sidebar/navbar structures.
9. **Don’t break route contracts**: Keep existing URLs and legacy redirects functional.
10. **Future sections should feel additive**: Donation/feedback/user-counter/SEO modules should appear as native extensions of current cards/tiles/CTA blocks—not a visual reboot.

---

## Quick implementation checklist for future contributors

- [ ] Reused existing colors (`brightboost.*` or semantic tokens)
- [ ] Reused existing type stack (Montserrat/Inter)
- [ ] Reused existing button/card styles or variants
- [ ] Kept rounded + soft shadow system
- [ ] Preserved animation gentleness and reduced-motion handling
- [ ] Left route contracts/redirects intact
- [ ] Ensured homepage additions match existing hero + feature + CTA language
