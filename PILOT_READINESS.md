# BrightBoost Pilot Readiness Audit

**Date:** 2026-02-27
**Scope:** Chatham-first pilot, 2-3 schools, 6-8 weeks
**Target:** K-2 students, teachers, community showcase night

---

## EXECUTIVE SUMMARY

The platform has a **solid foundation** for the pilot. Core learning loops work: students can sign up, browse 4 published K-2 modules, play interactive games (story quizzes + Unity WebGL games), earn XP, and track progress. Teachers can create classes, distribute join codes, launch weekly sessions, and measure confidence lift via pre/post pulse surveys.

**However, there are critical blockers** around seed data, content gaps, and a few architectural issues that must be resolved before the pilot can succeed.

---

## CRITICAL BLOCKERS (Must fix before pilot)

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Seed users have plaintext passwords** — `prisma/seed.cjs` stores `"password123"` as plain text, not bcrypt hashes. `bcrypt.compare()` will always return false for seeded users. Demo logins will fail. | Demo/testing impossible with seed data |
| 2 | **Activity ID mismatch blocks specialty unlock** — `STEM1_SET1_IDS` in `src/constants/stem1Set1Games.ts` references `"tank-trek"`, `"quantum-quest"`, `"rhyme-ride"` but seeded activities use auto-generated CUIDs (only `"bounce-buds"` and `"gotcha-gears"` have explicit IDs). The 3-game threshold for archetype selection may never be met. | Avatar specialization (core gamification feature) broken |
| 3 | **No password reset flow** — No forgot-password endpoint, no email integration. Any student or teacher who forgets their password is permanently locked out. | Users locked out during a 6-week pilot |
| 4 | **Teacher console.log leaks PII** — `TeacherSignup.tsx:34` logs teacher email to browser console during signup. | Privacy violation |
| 5 | **Temporary debug log still in production** — `api.ts:59` logs `[BrightBoost] API_BASE:` in all environments. Comment says "remove after fix verified." | Unprofessional, leaks infrastructure details |
| 6 | **No privacy policy or terms of service** — Landing page has no legal links. Required for any school pilot involving minors. | Legal/compliance blocker |

---

## HIGH PRIORITY (Should fix before pilot)

| # | Issue | Impact |
|---|-------|--------|
| 7 | **Only 4 published modules** — All K-2 level. A 6-week pilot needs 6-8 modules for weekly sessions. Two more modules needed at minimum. | Runs out of content by week 5 |
| 8 | **No archetype-specific content** — Selecting AI/Quantum/Biotech specialty unlocks no different modules. All students see the same content regardless of archetype. | Pathway promise from pitch deck unfulfilled |
| 9 | **Teacher layout not mobile responsive** — Fixed `ml-64` sidebar with no collapse on mobile/tablet. Teachers on tablets see a broken layout. | Teachers at schools may use tablets |
| 10 | **No export/report functionality** — Teachers need to present results at the community showcase. No CSV export, no printable report, no shareable dashboard. | Showcase night readiness |
| 11 | **No class-wide analytics dashboard** — Teachers can see per-assignment completion and pulse summary, but there's no aggregate "how is my class doing" overview across all modules/weeks. | Teacher activation gap |
| 12 | **Pulse survey allows duplicate submissions** — No server-side dedup. A student can submit multiple PRE or POST responses, skewing confidence lift metrics — the KEY pilot metric. | Data integrity for the pilot's primary KPI |
| 13 | **No global error handler** — Backend has no Express error-handling middleware. Unhandled promise rejections or thrown errors crash the server with no graceful recovery. | Production stability |
| 14 | **Teacher can view ANY student's profile (IDOR)** — `profile.ts:80` has a TODO: "In production, verify student belongs to teacher's class." Currently no check. | Privacy/trust violation |
| 15 | **Gotcha Gears missing from MODULE_ORDER** — `Modules.tsx` hardcodes sort order for 3 modules but Gotcha Gears isn't listed, so it sorts to the end (position 999). | 4th module appears out of order |
| 16 | **`navigate("/avatar")` uses legacy route** — `ModuleDetail.tsx:181` navigates to `/avatar` instead of `/student/avatar`. Has a redirect fallback, but is inconsistent. | Minor UX glitch |

---

## NICE TO HAVE (Would impress at demo)

| # | Issue | Impact |
|---|-------|--------|
| 17 | **Landing page is minimal** — No features description, no screenshots, no school branding, no testimonials. Just a title and two buttons. | First impression for school admins |
| 18 | **i18n only ~30-40% complete** — Translation files exist for en/es but only cover student dashboard and API errors. All teacher UI, signup flows, game instructions, and activity player text are hardcoded English. | Bilingual pilot communities |
| 19 | **Badge system exists in DB but zero badges seeded** — `Badge` and `UserBadge` models exist but no badges are created. Client-side achievements work but aren't persisted. | Engagement polish |
| 20 | **229 console.log statements across 45 files** — Debug logging throughout production code. | Code cleanliness |
| 21 | **8 orphaned page files not routed** — `Home.tsx`, `Profile.tsx`, `EditProfile.tsx`, `Login.tsx`, `Stem1.tsx`, `QuantumDemo.tsx`, `TestingSB.tsx`, `QuestPlaceholder.tsx` exist but are unreachable. | Dead code clutter |
| 22 | **No teacher onboarding flow** — No first-time setup guidance. Teachers land on an empty dashboard with no instructions. | Teacher activation |
| 23 | **ProtectedRoute loading state is bare** — Shows `<div class="loading">Loading...</div>` with no spinner. | Flash of unstyled content |
| 24 | **Avatar storage uses base64 in DB** — Profile pictures stored as data URLs in PostgreSQL. Will bloat DB as users scale. | Performance at scale |
| 25 | **No token refresh mechanism** — 7-day JWT with no refresh. Users silently lose their session after a week. | Mid-pilot disruption |
| 26 | **Co-op Adventure is placeholder** — PlayHub shows "Coming soon" tab. Fine for pilot but could be hidden. | Polish |
| 27 | **`/context` endpoint is public with no auth** — Exposes user count metrics to anyone. Mounted before auth middleware. | Minor security |

---

## CATEGORY-BY-CATEGORY ANALYSIS

### CATEGORY 1: TEACHER EXPERIENCE

| Feature | Status | Notes |
|---------|--------|-------|
| Teacher signup | ✅ WORKING | Email/password with strong validation. Auto-login after signup. |
| Teacher login | ✅ WORKING | JWT auth, role verification (rejects students). |
| Teacher dashboard overview | ⚠️ PARTIAL | Shows course list only. No aggregate metrics, no "welcome" guidance. Empty state messaging is generic. |
| Create/manage classes | ✅ WORKING | Create class, auto-generated 6-char join code, copy-to-clipboard. No edit/delete for courses. |
| Assign modules to classes | ✅ WORKING | "Launch Weekly Session" wizard in class detail. Picks module + activity, sets due date. |
| Launch weekly sessions | ✅ WORKING | Assignment creation works. Shows completion stats per assignment. |
| View student progress per class | ⚠️ PARTIAL | Can see assignment completion counts and avg time. No per-student breakdown by module. |
| View student progress per module | ⚠️ PARTIAL | `GET /progress/:studentId` exists but no FE page to view individual student's module progress. |
| Teacher profile management | ✅ WORKING | View/edit profile modal (name, school, subject). Initials avatar fallback. |
| Teacher onboarding | ❌ MISSING | No first-time setup wizard, no tutorial, no getting-started guide. |
| Teacher settings | ✅ WORKING | Settings page with account info, language toggle, notifications placeholder. |
| Export/reports for showcase | ❌ MISSING | No CSV export, no printable report, no shareable results view. |

### CATEGORY 2: STUDENT EXPERIENCE

| Feature | Status | Notes |
|---------|--------|-------|
| Student signup | ✅ WORKING | Password requirements checklist. Auto-login after signup. |
| Student login | ✅ WORKING | With role verification, error handling, show/hide password. |
| Student dashboard | ✅ WORKING | XP widget, streak meter, avatar, goals, assignments, continue-learning card, achievements. |
| Join class via join code | ✅ WORKING | End-to-end functional. Backend `POST /student/join-course` validates join code, creates enrollment. UI auto-triggers PRE pulse survey on join. "Join a Class" card on dashboard + "Classes" in bottom nav. |
| Browse learning modules | ✅ WORKING | Module grid with thumbnails, skeleton loader, error/empty states. |
| Complete activities/games | ✅ WORKING | Story quizzes (slide-based with quiz), 4 Unity WebGL games, completion with XP rewards. |
| Progress tracking | ✅ WORKING | Visual XP bar, level system, per-activity completion checkmarks, streak computation. |
| Gamification (XP/streaks/badges) | ⚠️ PARTIAL | XP, levels, streaks, avatar stats all work. Badges seeded but zero data. Client-side achievements work. |
| Avatar/character system | ✅ WORKING | Avatar customization, 3 archetypes (AI/Quantum/Biotech), stat progression, ability unlocks. Upload/edit photo. |
| Student profile | ⚠️ PARTIAL | No dedicated profile page. Avatar page shows stats. Dashboard shows name/XP. |
| Module pathways | ⚠️ PARTIAL | Archetype selection exists (AI/Quantum/Biotech) but selecting one does NOT unlock different content. All students see the same 4 modules. |

### CATEGORY 3: CONTENT & CURRICULUM

| Feature | Status | Notes |
|---------|--------|-------|
| Seeded module content | ⚠️ PARTIAL | **4 published modules** with real K-2 content. 1 unpublished placeholder. See content inventory below. |
| Real educational content | ✅ WORKING | Story quizzes cover algorithms, rhyming, biology, AI/debugging. Age-appropriate for K-2. |
| Interactive activities/games | ✅ WORKING | 5 game types: SequenceDragDrop (React), RhymeRide (Unity), BounceBuds (Unity), GotchaGears (Unity), Spacewar (Unity). |
| Content organized by pathway | ❌ MISSING | No pathway-specific content. All modules are generic STEM. Selecting an archetype unlocks no different modules. |
| Enough modules for 6 weeks | ⚠️ PARTIAL | 4 modules = 4 weeks. Need 2-4 more for a full 6-8 week pilot. |
| Age-appropriate content | ✅ WORKING | All content targets K-2 appropriately. No content for other grade levels. |
| Clear lesson structure | ✅ WORKING | Each module follows: Story intro (slides) -> Quiz (multiple choice) -> Game (interactive). |

#### Content Inventory

| Module | Title | Published | Story Topics | Game Type |
|--------|-------|-----------|-------------|-----------|
| k2-stem-sequencing | Boost's Lost Steps | Yes | Algorithms, sequencing, debugging | Drag-and-drop ordering (3 levels) |
| k2-stem-rhyme-ride | Rhyme & Ride | Yes | Rhyming, phonics | Unity word shooter (7 rounds) |
| k2-stem-bounce-buds | Bounce & Buds | Yes | Cells, microbes, biology | Unity paddle/breakout (7 rounds) |
| k2-stem-gotcha-gears | Gotcha Gears | Yes | AI, debugging, planning | Unity catch game (7 rounds) |
| stem-1-intro | Intro to Tech | **No** | Robots (placeholder text) | None (text only) |

### CATEGORY 4: MEASUREMENT & ANALYTICS

| Feature | Status | Notes |
|---------|--------|-------|
| Teacher activation tracking | ⚠️ PARTIAL | Can count assignments created per class. No dedicated "sessions launched" metric view. |
| Student completions & time | ✅ WORKING | Per-activity completion tracking with timeSpentS. Accessible via assignment stats. |
| Pre/post pulse survey | ✅ WORKING | Full end-to-end: student dialog (1-5 scale + text), backend model, teacher summary with PRE avg, POST avg, and delta (confidence lift). |
| Survey component exists | ✅ WORKING | `PulseSurveyDialog` with 3 Likert questions + open text. |
| Backend model for surveys | ✅ WORKING | `PulseResponse` model with respondentId, courseId, kind, score, answers. |
| Teachers trigger pulse | ⚠️ PARTIAL | Students see PRE/POST buttons on dashboard. No teacher-initiated "push" of a pulse survey. Survey auto-triggers on class join (PRE). |
| Analytics dashboard | ⚠️ PARTIAL | Class detail page shows 3 summary cards (sessions, completion, confidence lift). No time-series or aggregate view. |
| Export/report functionality | ❌ MISSING | No CSV export, no PDF report, no printable view for showcase night. |
| Class-level analytics | ⚠️ PARTIAL | Assignment-level completion and pulse summary per class. No cross-module aggregate. |

### CATEGORY 5: INFRASTRUCTURE & RELIABILITY

| Feature | Status | Notes |
|---------|--------|-------|
| CORS configuration | ✅ WORKING | FE origin whitelisted (`fe-production-3552.up.railway.app`). Credentials, Authorization header allowed. |
| API endpoints match FE calls | ⚠️ PARTIAL | All main endpoints exist. `PUT /teacher/courses/:id` and `DELETE /teacher/courses/:id` are called by FE but don't exist on backend (edit/delete courses). Errors caught gracefully. |
| Authentication flow | ✅ WORKING | JWT with 7-day expiry. Bearer token in Authorization header. Role-based route protection. No token refresh. |
| Error handling | ⚠️ PARTIAL | Frontend: retries, toast notifications, `extractErrorMessage` for Zod errors. Backend: per-route try/catch but NO global error handler. |
| Database schema | ✅ WORKING | Complete for all current features. 16 models covering users, content, progress, gamification, courses, surveys. Some schema hygiene issues (String vs enum). |
| Seed data | ⚠️ PARTIAL | 4 published modules with real content. **Seed user passwords are plaintext (login will fail).** 6 abilities seeded for avatar system. |
| Mobile responsiveness | ⚠️ PARTIAL | Student side is fully responsive (bottom nav, responsive grids). **Teacher layout has fixed sidebar, not mobile-friendly.** |
| Loading states | ✅ WORKING | Skeleton loaders, spinners, loading text on all data-fetching pages. |
| 404/error pages | ✅ WORKING | NotFound page with i18n translation. Error states on all major pages. |

### CATEGORY 6: DEMO & SHOWCASE READINESS

| Feature | Status | Notes |
|---------|--------|-------|
| Professional landing page | ⚠️ PARTIAL | Functional but minimal. Title + two buttons. No features, screenshots, or branding. No legal links. |
| Teacher: signup -> class -> join code < 2 min | ✅ WORKING | Signup auto-logs in, dashboard loads, "Classes" tab -> "New Class" -> join code copied. |
| Student: signup -> join -> start module < 2 min | ✅ WORKING | Signup auto-logs in, dashboard shows "Join a Class" card, enter code, modules load. |
| Present pilot results | ❌ MISSING | No export, no printable report. Teacher can show class detail page on screen but cannot share/download. |
| Polished UI for admins | ⚠️ PARTIAL | Clean teacher layout (white bg, professional sidebar). Dropdown menu is clean. Some pages lack polish (empty states, generic messages). |
| No console errors/broken images | ⚠️ PARTIAL | 229 console.log statements. Temporary debug logging. No broken images in main flow. Dead pages exist but are unreachable. |

---

## FULL GAP TABLE

| # | Feature | Status | Category | Priority | Notes |
|---|---------|--------|----------|----------|-------|
| 1 | Seed user passwords hashed | ❌ MISSING | Infrastructure | CRITICAL | bcrypt.compare fails on plaintext seeds |
| 2 | STEM1 Set1 activity ID alignment | ❌ MISSING | Content | CRITICAL | Archetype unlock threshold broken |
| 3 | Password reset flow | ❌ MISSING | Infrastructure | CRITICAL | Users permanently locked out |
| 4 | Remove PII console.log (teacher email) | ⚠️ BUG | Infrastructure | CRITICAL | TeacherSignup.tsx:34 |
| 5 | Remove temp API_BASE debug log | ⚠️ BUG | Infrastructure | CRITICAL | api.ts:59 |
| 6 | Privacy policy / ToS links | ❌ MISSING | Legal | CRITICAL | Required for school pilot with minors |
| 7 | 2+ more published modules | ❌ MISSING | Content | HIGH | Need 6-8 for full pilot |
| 8 | Archetype-specific content | ❌ MISSING | Content | HIGH | Pitch promises pathways into Quantum/AI/Biotech |
| 9 | Teacher layout mobile responsive | ⚠️ PARTIAL | UI | HIGH | Fixed sidebar breaks on tablet |
| 10 | Export/report for showcase | ❌ MISSING | Analytics | HIGH | Teachers need shareable results |
| 11 | Class-wide analytics overview | ❌ MISSING | Analytics | HIGH | No aggregate "how is my class" view |
| 12 | Pulse survey deduplication | ⚠️ BUG | Analytics | HIGH | Duplicate submissions skew primary KPI |
| 13 | Global error handler | ❌ MISSING | Infrastructure | HIGH | Unhandled errors crash server |
| 14 | Student profile IDOR fix | ⚠️ BUG | Security | HIGH | Teachers can view any student |
| 15 | Gotcha Gears in MODULE_ORDER | ⚠️ BUG | Content | HIGH | Sorts to end of module list |
| 16 | Fix navigate("/avatar") path | ⚠️ BUG | UI | HIGH | ModuleDetail.tsx:181 |
| 17 | Professional landing page | ⚠️ PARTIAL | UI | NICE | Features, branding, screenshots |
| 18 | Complete i18n (en/es) | ⚠️ PARTIAL | i18n | NICE | ~60-70% of text untranslated |
| 19 | Seed badges | ❌ MISSING | Gamification | NICE | DB schema exists, zero data |
| 20 | Remove 229 console.logs | ⚠️ PARTIAL | Code quality | NICE | Debug logging in production |
| 21 | Delete orphaned pages | ⚠️ PARTIAL | Code quality | NICE | 8 unreachable page files |
| 22 | Teacher onboarding wizard | ❌ MISSING | UX | NICE | No first-time setup guidance |
| 23 | ProtectedRoute loading spinner | ⚠️ PARTIAL | UI | NICE | Shows bare "Loading..." text |
| 24 | Move avatars to object storage | ⚠️ PARTIAL | Infrastructure | NICE | Base64 in DB will bloat |
| 25 | Token refresh mechanism | ❌ MISSING | Auth | NICE | 7-day hard expiry, no refresh |
| 26 | Hide Co-op placeholder | ⚠️ PARTIAL | UI | NICE | "Coming soon" visible to users |
| 27 | Rate limit /context endpoint | ⚠️ BUG | Security | NICE | Public, no auth, no limits |
| 28 | Student dedicated profile page | ❌ MISSING | UX | NICE | No standalone profile view |
| 29 | Course edit/delete for teachers | ❌ MISSING | Teacher UX | NICE | Can create but not modify courses |
| 30 | Email verification on signup | ❌ MISSING | Security | NICE | Anyone can register any email |
| 31 | Per-student module progress view | ❌ MISSING | Teacher UX | NICE | Backend exists, no FE page |
| 32 | Teacher-triggered pulse push | ❌ MISSING | Analytics | NICE | Surveys are student-initiated only |
| 33 | Admin user creation | ❌ MISSING | Infrastructure | NICE | Code references admin role, no creation path |
| 34 | Structured logging | ❌ MISSING | Infrastructure | NICE | Only console.error, no log levels/service |
| 35 | DB health in /health endpoint | ⚠️ PARTIAL | Infrastructure | NICE | Returns ok without checking DB connectivity |

---

## RECOMMENDED PILOT FIX ORDER

### Sprint 1: Blockers (before any demo)
1. Hash seed user passwords with bcrypt in `seed.cjs`
2. Fix STEM1_SET1_IDS to match actual seeded activity IDs
3. Remove PII console.log from TeacherSignup.tsx
4. Remove temporary API_BASE debug log from api.ts
5. Add privacy policy / ToS page (even a simple placeholder)
6. Add global error handler middleware to backend

### Sprint 2: Content & Core Gaps (before Week 3 sessions)
7. Create 2+ more K-2 modules to cover 6 weeks of content
8. Add Gotcha Gears to MODULE_ORDER in Modules.tsx
9. Fix ModuleDetail navigate path to /student/avatar
10. Server-side pulse survey deduplication (unique constraint on respondentId + courseId + kind)
11. Restrict teacher student profile access to enrolled students only

### Sprint 3: Teacher Polish (before Week 7 showcase)
12. Add class-wide analytics overview (aggregate completion %, avg time, module breakdown)
13. Add CSV/PDF export for pilot results
14. Make teacher sidebar responsive (collapsible on mobile/tablet)
15. Teacher onboarding: empty-state CTAs instead of generic "no data" messages

### If Time Permits
16. Seed achievement badges
17. Complete i18n for bilingual communities
18. Polish landing page with features section
19. Add archetype-specific module recommendations (even if same content, show thematic framing)
20. Clean up console.logs and dead code
