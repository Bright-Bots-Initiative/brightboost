# Upper-Elementary MVP — Grade 3-5 Expansion

## Architecture Summary

The upper-elementary expansion adds a **grade band** dimension to the existing module system without breaking K-2 flows. It introduces three new database models and a set of backend routes that together enable:

1. Teachers to set a class's grade band (`k2` or `g3_5`)
2. A module catalog organized by family + band variants
3. Teacher assignment of band-appropriate modules to classes
4. Student visibility filtered by class enrollment + band

### Key Concepts

- **Module Family** — stable concept identity (e.g. "Sequencing & Debugging", "Forces & Motion")
- **Module Variant** — family + band + version = specific content config (e.g. the g3_5 version of sequencing)
- **Class Module Assignment** — teacher-assigned variant for a specific class, with ordering and lock/unlock

## Data Model

### Schema Changes

```
Course
  + gradeBand: String @default("k2")  // "k2" or "g3_5"
  + moduleAssignments: ClassModuleAssignment[]

ModuleFamily (NEW)
  - id, key (unique), title, iconEmoji
  - variants: ModuleVariant[]

ModuleVariant (NEW)
  - id, familyId, band, version, title, subtitle, status
  - moduleSlug: optional link to existing Module for backward compat
  - contentConfig: JSON (reading, questions, game, supports, UI metadata)
  - @@unique([familyId, band, version])

ClassModuleAssignment (NEW)
  - id, courseId, moduleVariantId, orderIndex, isLocked, dueAt
  - @@unique([courseId, moduleVariantId])
```

### Module Families Seeded

| Family Key | Title | Canonical Set 1 Anchor | G3-5 Variant |
|------------|-------|------------------------|--------------|
| bounce_buds | Biotech Foundations | Bounce & Buds | Data Dash: Sort & Discover |
| gotcha_gears | Logic & Decision Systems | Gotcha Gears | Variable Quest: Fair Test Lab |
| rhyme_ride | Language + Pattern Systems | Rhyme & Ride | Motion Mission: Force Lab |
| tank_trek | Robotics & Path Planning | Tank Trek | Design Under Pressure: Bridge Lab |
| quantum_quest | Quantum Foundations | Quantum Quest | Quantum Mission: Pattern Lab |

### G3-5 Content Config Shape

Each g3_5 variant stores a `contentConfig` JSON with:
- `theme` — UI tone (lab, blueprint, dashboard, mission)
- `reading` — word count target, topic, vocabulary list
- `questions` — count, question types
- `game` — rounds, phases, mechanics list
- `supports` — hint ladder, glossary, read-aloud, recap flags
- `ui` — progress display type (ring/bar)

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/module-catalog/families` | any | List all module families with their variants |
| GET | `/api/module-catalog/variants?band=g3_5` | any | List variants filtered by band |
| PUT | `/api/teacher/courses/:id/band` | teacher | Update class grade band |
| GET | `/api/teacher/courses/:id/module-assignments` | teacher | List assignments for a class |
| POST | `/api/teacher/courses/:id/module-assignments` | teacher | Assign a variant to a class |
| PUT | `/api/teacher/courses/:id/module-assignments/:aid` | teacher | Update assignment (order, lock, due) |
| DELETE | `/api/teacher/courses/:id/module-assignments/:aid` | teacher | Remove assignment |
| GET | `/api/student/assigned-modules` | student | Get modules from all enrolled classes |

## Assignment / Access Rules

1. A class has exactly one `gradeBand` (default: `k2`)
2. Only variants matching the class band can be assigned
3. Students see modules from all enrolled classes, grouped by class
4. Locked assignments (`isLocked: true`) are hidden from students
5. K-2 students continue to see the existing flat module list unchanged
6. The new assigned-modules endpoint is additive — existing Modules.tsx continues working

## Key Files Changed

### Schema
- `prisma/schema.prisma` — added `gradeBand` to Course, added ModuleFamily, ModuleVariant, ClassModuleAssignment

### Backend
- `backend/src/routes/moduleCatalog.ts` — new route file (catalog + assignment CRUD)
- `backend/src/routes/courses.ts` — accept/return `gradeBand` in create/detail
- `backend/src/server.ts` — mount moduleCatalog router

### Frontend
- `src/services/api.ts` — 7 new API methods for catalog, band, and assignments
- `src/pages/TeacherClassDetail.tsx` — grade band selector dropdown
- `src/locales/en/common.json` — band label keys

### Seed
- `prisma/seed.cjs` — module families, k2+g3_5 variants, demo g3_5 class with auto-assignments

## How to Seed / Test

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create migration (if using migrations)
npx prisma migrate dev --name upper-elementary-mvp

# Or push schema directly (dev)
npx prisma db push

# Seed data
npx prisma db seed

# Verify:
# 1. Log in as teacher → go to a class → see grade band dropdown
# 2. Switch class to "Grades 3-5"
# 3. API: GET /api/module-catalog/variants?band=g3_5 → 5 variants
# 4. API: POST assignment → verify band validation
# 5. Log in as student enrolled in g3_5 class → GET /api/student/assigned-modules
```

## Canonical Set Alignment Notes

- K-2 Set 1 canon is exactly 5 public Foundation games: Bounce & Buds, Gotcha Gears, Rhyme & Ride, Tank Trek, Quantum Quest.
- `Boost's Lost Steps` (`lost-steps` / `k2-stem-sequencing`) is retained only as legacy/archived content and is not part of live canonical gating.
- Set 2 canon is exactly 5 public Exploration games: Maze Maps & Smart Paths, Move, Measure & Improve, Sky Shield Patterns, Fast Lane Signals, Qualify, Tune, Race.
- Grade 3-5 adaptation planning mirrors the canonical 5-game Set 1 families above.
- The grade-band infrastructure is implemented and seed-ready, but full playable grade 3-5 React game experiences are not yet complete.

## Localization Coverage Note

- Set 2 seed narrative/quiz content currently stores `{ en, es }` localized fields in both `prisma/seed.cjs` and `backend/prisma/seed.cjs`.
- Vietnamese (`vi`) and Simplified Chinese (`zh-CN`) users currently receive English fallback for those Set 2 narrative/quiz strings at runtime.
- TODO: complete editorial translation review for Set 2 narrative + quiz content in `vi` and `zh-CN` before claiming full parity.

## Known Follow-Up Items

1. **G3-5 game implementations** — The 5 g3_5 content configs describe game mechanics but the actual game components need to be built (Data Dash, Variable Quest, Motion Mission, Design Under Pressure, Quantum Mission)
2. **Module assignment UI** — Teacher-facing UI for browsing catalog and assigning/reordering modules. Currently only the band selector is in the UI; assignment management is API-ready but needs a dedicated component.
3. **Student assigned-modules view** — A student dashboard section that shows class-assigned modules. Currently the `/api/student/assigned-modules` endpoint exists but no frontend component consumes it.
4. **Per-grade tuning** — The `g3_5` band is one shared profile. Future work: separate g3, g4, g5 difficulty curves.
5. **Student-level band override** — Currently band is class-level only. A future `studentBandOverride` field could allow individual differentiation.
6. **Feature flag** — No flag system exists yet. The g3_5 infrastructure is live but safe — no content renders until game components are built and modules are assigned by a teacher.
7. **Analytics events** — Track `module_assigned`, `module_started`, `module_completed` with band and family metadata.
8. **Progress per variant** — Currently progress tracks by activityId. Variant-aware progress would enable comparing performance across bands.
