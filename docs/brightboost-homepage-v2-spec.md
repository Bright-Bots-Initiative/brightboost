# Bright Boost Homepage v2 — Implementation Spec

## Goal

Polish the existing Bright Boost homepage while preserving the playful K–8 Bright Boost personality.

This is not a rebrand.
This is not a generic SaaS landing page.
This is not a full redesign.

The goal is to improve clarity, trust, SEO, conversion, feedback collection, and donation support while keeping the current Bright Boost feel.

## Product context

Bright Boost is a free STEM learning web app by Bright Bots Initiative.

The homepage should help visitors understand:
- Bright Boost is free.
- Students can learn through playful STEM challenges.
- Teachers can use it for classroom-friendly STEM learning.
- Parents can support learning at home.
- Organizations can partner or pilot the platform.
- Feedback from the first 1,000 users is important.
- Donations are optional and help keep Bright Boost free.

## Current app context

The app is React + TypeScript + Vite.
The homepage currently renders from src/pages/Index.tsx.
The existing code uses Tailwind CSS, shadcn-style UI primitives, custom Bright Boost tokens, Montserrat, rounded cards, sky/game backgrounds, cloud motion, and chunky game-like buttons.

Preserve the existing route architecture and existing app flows.

Do not break:
- /teacher-login
- /student-login
- /class-login
- /teacher/signup
- /student/signup
- /forgot-password
- /reset-password
- /student/*
- /teacher/*
- /pathways
- /pathways/about

## Design direction

The approved design direction is “Homepage v2.”

Homepage v2 should:
- Keep the playful sky/game background
- Keep the K–8 STEM energy
- Keep rounded cards
- Keep soft educational visuals
- Keep teacher/student entry clarity
- Improve the previous oversized redesign
- Avoid giant marketing hero typography
- Avoid too many CTAs above the fold
- Move donation below the fold
- Keep “Always Free” messaging visible

## Above-the-fold hard rules

Hero desktop height must be less than or equal to 540px.
Hero mobile height must be less than or equal to 600px.

Headline:
- 40px desktop
- 30px mobile
- Max 2 lines
- Must not dominate the entire first screen

Only two primary hero buttons:
- “I’m a Teacher”
- “I’m a Student!”

Secondary hero actions must be text links only:
- Give Feedback
- Support Bright Boost
- Explore Pathways

Hero must include one soft early-access pill below CTAs:
“🌱 Early access · join our first 1,000 users”

Donation must not appear as a large above-the-fold CTA.

Right side of hero should use an app-feel preview card, not a generic stock illustration.

The preview card should feel like a mini Bright Boost dashboard:
- Tilt about -2deg
- Mock dashboard chrome
- Mini activity tiles
- Sticker: “🎮 Always Free”

## Visual tokens

Use or map to existing Tailwind/CSS tokens where possible.

Sky gradient:
linear-gradient(180deg,#BFE5F7 0%,#DCEEFB 55%,#EAF6FD 100%)

Palette:
- Navy: #1C3D6C
- Blue: #46B1E6
- Yellow: #FACC15
- Coral: #FF9C81
- Green: #69D681

Card radius:
- 18px for tiles
- 22px for hero card
- 9999px for chips/pills

CTA shape:
- Chunky 12px-radius buttons
- Offset shadow
- Pressed state should translate down slightly and reduce shadow

Typography:
- Montserrat 800 for display
- Montserrat 600 for body where appropriate

Spacing:
- Use 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48 / 56px scale
- Sections use about 56px vertical padding
- Hero uses about 36–48px top and bottom padding

## CTA hierarchy

Primary:
- “I’m a Teacher” using blue gradient
- “I’m a Student!” using purple-to-pink gradient

Secondary:
- Give Feedback
- Support Bright Boost
- Explore Pathways

Tertiary:
- Early-access pill
- Donation amount chips
- Always Free badges

Never stack 3+ primary buttons in the hero.

Donation is never a primary above-the-fold CTA.

## Required copy contract

Do not alter this copy unless necessary for responsive wrapping.

Hero badge:
“Free STEM Learning Platform”

H1:
“Build STEM confidence through playful learning”

Hero subhead:
“Bright Boost helps students explore STEM through games, guided challenges, progress tracking, and classroom-friendly tools.”

Donation microcopy:
“Donating is optional and never required to use Bright Boost.”

Free-access badges:
“Always Free”

## Homepage section order

1. Hero
2. Early Access Goal
3. Free Access Plans
4. Audience
5. Feedback
6. Donation
7. Footer

## Section requirements

### 1. Hero

Implement a compact, polished hero.

Include:
- Sticky nav if compatible with the existing site
- EN/ES toggle visible on desktop and mobile if existing language toggle is already implemented
- Sign-in as the only nav-right button
- Hero badge with green dot and uppercase tracked label
- H1: “Build STEM confidence through playful learning”
- Subhead from copy contract
- Two primary chunky buttons:
  - “I’m a Teacher”
  - “I’m a Student!”
- Secondary text links:
  - Give Feedback → /feedback
  - Support Bright Boost → /donate
  - Explore Pathways → /pathways
- Soft early-access pill:
  “🌱 Early access · join our first 1,000 users”
- Right-side app preview card with dashboard feel and “🎮 Always Free” sticker

Do not include a large “Donate to Keep Bright Boost Free” hero button.

### 2. Early Access Goal

Place below the hero.

Goal:
Encourage visitors to join the first 1,000 users.

Important:
Do not fake user counts.
Do not use page views.
Do not hardcode a fake number.
Do not show static social-proof numbers unless they come from real data.

If a reliable user-count endpoint exists:
- Show totalUsers / 1,000
- Show accessible progress bar
- Use percent = Math.min((totalUsers / 1000) * 100, 100)

If no reliable endpoint exists:
- Show:
  “Join our first 1,000 users”
- Use a neutral visual treatment that does not imply a fake count

### 3. Free Access Plans

Create 3 cards:
- Learner
- Classroom
- Organization

Every card must display the green badge:
“Always Free”

Do not use:
- Pricing
- Paid plans
- Paid tiers
- Upgrade language
- Feature-gating language

Do not include dollar signs in plan cards.

### 4. Audience

Create 4 cards:
- Students
- Teachers
- Parents
- Organizations

Each card should briefly explain how that group uses Bright Boost.

Link cards to:
- /students
- /teachers
- /parents
- /organizations

If those routes do not exist yet, do not break the homepage. Either create simple placeholder routes using existing styling or leave TODOs if safer.

### 5. Feedback

Add a feedback section.

Include:
- Chip tabs:
  - Teacher
  - Student
  - Parent
  - Org
- Textarea
- Optional email field
- Button:
  “Send Feedback”

No required fields.

Do not collect:
- Full name
- Birth date
- Phone number
- School address
- Class code
- Unnecessary child information

If no feedback backend exists:
- Create a frontend-safe thank-you state
- Clearly document that persistence still needs to be connected
- Do not pretend feedback is saved if it is not saved

### 6. Donation

Donation appears below Feedback, not above the fold.

Include amount chips:
- $5
- $15
- $50
- $100
- Other

Include primary donation button:
“Donate Once”

Include secondary text link:
“Give monthly”

Use coral gradient for donation action.

Required microcopy:
“Donating is optional and never required to use Bright Boost.”

Include a transparent use-of-funds strip showing what donation tiers help fund.

Do not claim donations are tax-deductible.

Use env variable:
VITE_DONATION_URL

If VITE_DONATION_URL is missing:
Show “Donation link coming soon.”

Do not block access to the app if no donation is made.

### 7. Footer

Implement a navy footer strip.

Include:
- Bright Boost wordmark/mascot treatment if existing assets support it
- Tagline
- Links:
  - Evaluator Guide
  - Pathways
  - Privacy
  - Terms
  - Contact

Preserve existing footer links unless they conflict.

## Component guidance

Use existing components and tokens first.
Only create new components where helpful.

Suggested components:
- src/components/home/Hero.tsx
- src/components/home/EarlyAccess.tsx
- src/components/home/FreeAccessPlans.tsx
- src/components/home/Audiences.tsx
- src/components/home/FeedbackForm.tsx
- src/components/home/Donation.tsx
- src/components/ui/ChunkyBtn.tsx
- src/components/ui/Badge.tsx

If current architecture works better with src/pages/Index.tsx assembling sections directly, that is acceptable.

## Chunky button behavior

Chunky buttons should have:
- 12px border radius
- 800 font weight
- Offset shadow, not soft shadow
- Pressed state:
  - translateY(3px)
  - shadow shrinks to 1px

Variants:
- teacher: blue gradient
- student: purple to pink gradient
- soft: white with navy border
- donation/coral: coral gradient

## Motion

Preserve playful motion where appropriate:
- Cloud drift
- Mascot bob
- Subtle sparkle motion

Respect prefers-reduced-motion:
If prefers-reduced-motion: reduce, disable cloud drift, sparkle animation, mascot bob, and nonessential motion.

Do not remove focus rings.

Focus ring:
2px solid #46B1E6 with 2px offset.

## Accessibility

Use semantic HTML:
- nav
- main
- section
- footer

Each section should use:
section aria-labelledby="..."

Each section needs a real h2.

Homepage should have exactly one h1.

All buttons need accessible names.

Icon-only buttons need aria-label.

Images need real alt text unless decorative.

Decorative mascot/cloud assets can use alt="" or aria-hidden.

Minimum font size should be 14px outside small chips.

Ensure color contrast remains AA.

## SEO

Update homepage metadata.

Title:
“Bright Boost — Free K-8 STEM Learning for Students, Teachers & Families”

Meta description:
Use approximately 155 characters and include:
free, STEM, K-8, bilingual, classroom-friendly, students, teachers, families

H1:
“Build STEM confidence through playful learning”

Add if supported safely in the existing Vite SPA:
- OpenGraph metadata
- Twitter card metadata
- Canonical URL for https://brightboost.org
- JSON-LD Organization schema
- JSON-LD EducationalOrganization schema

Do not introduce SSR assumptions.

## Language / i18n

Preserve existing EN/ES language toggle if present.

If homepage uses a dictionary, add new copy to that dictionary.

Persist language choice via localStorage only if that is already the current pattern or easy to do safely.

Do not break existing bilingual behavior.

## Analytics

If src/lib/analytics.ts exists and track() is a safe no-op or env-gated helper, wire these events:
- homepage_viewed
- signup_clicked
- feedback_clicked
- donation_clicked
- student_page_clicked
- teacher_page_clicked
- parent_page_clicked
- organization_page_clicked
- free_plan_clicked
- feedback_submitted

Do not add a third-party analytics package unless the project already uses one.

Do not track:
- Names
- Emails
- Class codes
- School names
- Student personal data

## Asset guidance

Use inline SVGs for small decorative assets if under 4 KB.

Do not replace existing Bright Boost robot/mascot/logo assets unless necessary.

Suggested small SVGs:
- cloud-shape
- sun-glow
- star-burst
- sparkle
- rocket-bot-mini placeholder
- check-bubble

Use assets as support, not as a full brand replacement.

## Implementation checklist

Before considering the task complete:

- Hero desktop height <= 540px
- Hero mobile height <= 600px
- Headline is 40px desktop / 30px mobile
- Only 2 primary buttons appear above the fold
- Hero primary buttons are “I’m a Teacher” and “I’m a Student!”
- Donation does not appear as a large above-the-fold CTA
- Donation section appears below Feedback
- Free Access cards all include “Always Free”
- No “Pricing” language appears
- No paid tier language appears
- No fake user count appears
- Existing auth routes still work
- Existing Pathways routes still work
- EN/ES toggle remains visible if existing behavior supports it
- Focus rings are visible
- prefers-reduced-motion is respected
- Homepage has one h1
- Sections use h2 and aria-labelledby
- Metadata exists
- Build/lint/tests pass if available

After creating docs/brightboost-homepage-v2-spec.md, stop.

Return:
- File created
- Confirmation that no UI was changed
- Any immediate risks you noticed
