# BrightBoost 🚀

> A bilingual K-8 STEM learning platform by Bright Bots Initiative

## Overview

BrightBoost is a bilingual (English/Spanish) K-8 STEM learning platform with tiered learning pathways for K-2, 3-5, and 6-8. The current release launches with K-2 content — character-driven stories, Unity-powered mini-games, and a full-featured teacher dashboard — with upper elementary and middle school tiers planned in future rollouts. Designed for Title I classrooms and after-school programs, it combines gamification mechanics — XP, streaks, avatars, and arena battles — with standards-aligned content that teachers can assign, track, and assess in real time.

## ✅ Current Working Features

### 👩‍🏫 Teacher Dashboard

- **Class Management** — Create courses, generate unique join codes, and manage student rosters
- **Icon-Based Login Setup** — Assign emoji icons and 4-digit PINs to K-2 students (no keyboard required for login)
- **Printable Login Cards** — Generate and print student login cards with icons and PINs for classroom distribution
- **Assignment Launching** — Assign any activity to a class with due dates; track completion rates and time spent
- **Pulse Surveys** — Run PRE/POST confidence assessments and view aggregate delta scores per class
- **Module Prep Checklists** — Per-module prep workflow with objectives, vocabulary, prerequisites, misconceptions, and pacing guides
- **Discussion Prompts** — Before-teaching prompts, after-teaching debrief questions, and turn-and-talk activities
- **Teacher Resource Library** — Searchable, filterable resources (worksheets, handouts, guides, links) organized by module and category; printable HTML worksheets
- **PD Hub** — Log professional development sessions with duration, topic, facilitator, and action items; save reusable session templates
- **PD Reflections** — Record module-specific reflections (what worked, what to change, student observations) linked to PD sessions
- **Faculty Discussion Board** — Threaded discussion forum with module tagging, pinning, and replies
- **Community Impact Dashboard** — Aggregate analytics: student engagement, module completion rates, weekly/monthly trends, time-spent statistics, and progress distribution
- **Showcase Mode** — 6-slide bilingual presentation for family nights with full-screen navigation; includes take-home card generation
- **CSV Student Import** — Bulk-import students into a class
- **Grade Export** — Export class grades as CSV
- **Profile & Settings** — Edit name, email, school, subject, bio, and password

### 🎒 Student Experience

- **Student Dashboard** — XP progress ring, current streak, assignment tracking with due dates, next-activity recommendation, and completed-module list
- **Module Browser** — Browse available modules with thumbnails, descriptions, and completion indicators (currently K-2 content)
- **Module Detail** — Hierarchical Unit → Lesson → Activity navigation with completion tracking
- **Activity Player** — Plays story slides with comprehension quizzes (shuffled answers, hint system) or launches interactive games; awards XP and stat boosts on completion
- **Avatar & Superpowers ("My Star")** — Track 5 superpowers (Heart Power 💖, Brain Juice 🧠, Lightning Fast ⚡, Super Focus 🎯, Star Power ⭐) with stage progression (Rookie → Explorer → Champion → Legend)
- **Archetype Selection** — Choose AI, Quantum, or Biotech specialization pathway
- **Play Hub** — Game hub with PvP tab (Spacewar Arena) and Coop tab (coming soon)
- **Class Code Login** — Icon-based login for K-2 students: select class code → pick your icon → enter PIN
- **Join Class** — Students join a teacher's class via join code
- **Bilingual UI** — Full English/Spanish toggle across the entire interface
- **Streak System** — Daily streak tracking with 7-day calendar visualization, streak record celebrations (+50 XP bonus)
- **Pulse Surveys** — Confidence, enjoyment, and motivation check-ins (1–5 scale) with optional free-text feedback
- **Break Suggestions** — Prompts students to take breaks during long sessions

### 🎮 Games & Activities

| Game | Type | Description |
|---|---|---|
| **Boost's Lost Steps** | Drag-and-drop sequencing | Arrange step cards in the correct order (First → Next → Last); teaches algorithms and procedures |
| **Rhyme & Ride** | Unity WebGL action game | Tap the word that rhymes with the prompt as words scroll across lanes; teaches phonemic awareness |
| **Bounce & Buds** | Unity WebGL paddle game | Bounce a ball through the gate matching the clue; teaches biology, cells, and plant science |
| **Gotcha Gears** | Unity WebGL catch game | Read a clue in the planning phase, then catch the correct gear as gears scroll down lanes; teaches AI thinking, debugging, and pattern recognition |
| **Spacewar Arena** | Unity WebGL space combat | 2D physics-based PvP shooter with gravity, missiles, and hyperspace; supports keyboard and touch gesture controls; 3 difficulty levels |

Each module also includes **character-driven story activities** (Meet Boost, Meet Rhymo, Meet Buddy, Meet Gearbot) with illustrated narrative slides and multiple-choice comprehension quizzes.

### 📊 Progress & Data

- **XP System** — 50 XP per completed activity, level-up every 100 XP with visual notifications
- **Streak Tracking** — Current and record streaks stored per student with daily activity checks
- **Achievement Badges** — First Steps, Streak Starter, Daily Champion, Week Warrior, Module Master
- **Arena Perks** — Completing STEM Set 1 games unlocks Spacewar boosts (reduced gravity, faster fire rate, better shields, faster projectiles, enhanced thrust)
- **Time Tracking** — Seconds spent per activity recorded for teacher analytics
- **Weekly Snapshots** — Aggregated weekly stats (XP, time spent) for trend analysis
- **Audit Log** — Server-side audit trail for sensitive actions

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Routing | React Router v6 |
| State | React Context API |
| i18n | i18next + react-i18next (EN / ES) |
| Backend | Node.js 20, Express 5, TypeScript |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Auth | JWT (jsonwebtoken) + bcryptjs password hashing |
| Games | Unity WebGL (4 games) + native drag-and-drop (1 game) |
| Testing | Vitest, Cypress, Testing Library, Storybook |
| Hosting | Frontend → Vercel · Backend → Railway · DB → Supabase |

## 🗄 Database Schema

Key models in `prisma/schema.prisma`:

| Model | Purpose |
|---|---|
| `User` | Students and teachers with role, XP, level, streak, login icon/PIN, language preference |
| `Module` | Learning modules (K-2 / 3-5 levels) with slug, title, description |
| `Unit` → `Lesson` → `Activity` | Hierarchical content: units contain lessons, lessons contain activities (INFO or INTERACT) |
| `Progress` | Per-student activity completion tracking with time spent |
| `Avatar` | Student avatar with stage, archetype, level, XP, and 5 stat attributes |
| `Ability` / `UnlockedAbility` | Unlockable abilities tied to archetypes and levels |
| `Match` / `MatchTurn` | PvP match records with turn-by-turn action logs |
| `Course` / `Enrollment` | Teacher classes with join codes and student enrollments |
| `Assignment` | Activities assigned to a class with due dates and status |
| `PulseResponse` | PRE/POST confidence survey responses (1–5 scale + JSON answers) |
| `TeacherPrepChecklist` | Per-module prep checklist state |
| `Resource` | Teacher resource library (worksheets, handouts, guides, links) |
| `PDSession` / `PDReflection` | Professional development logs and module reflections |
| `FacultyPost` | Threaded discussion board posts with pinning and replies |
| `Badge` / `UserBadge` | Achievement definitions and earned badges |
| `WeeklySnapshot` | Aggregated weekly student stats |
| `AuditLog` | System audit trail |

## 🚀 Getting Started

### Prerequisites

- Node.js v20+
- npm or pnpm
- PostgreSQL (local via Docker, or a Supabase project)

### Installation

```bash
git clone https://github.com/BrightBotsInitiative/brightboost.git
cd brightboost
pnpm install
cd backend && npm install && cd ..
```

### Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
# Frontend
VITE_API_BASE=http://localhost:3000        # Backend API URL

# Backend (in /backend/.env)
DATABASE_URL=postgresql://user:pass@host:5432/brightboost
DIRECT_URL=postgresql://user:pass@host:5432/brightboost
SESSION_SECRET=your-jwt-secret             # Required — signs auth tokens
PORT=3000
```

For local development with Docker Compose:

```bash
docker compose -f docker-compose-pg.yml up -d
# Uses postgres:latest on localhost:5435, user: postgres, pass: brightboostpass
```

### Seed the Database

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma db seed
```

Or use the shortcut:

```bash
npm run db:init
```

### Run Locally

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
npm run dev
```

Frontend runs at `http://localhost:5173` · Backend at `http://localhost:3000`

## 👤 Demo Accounts

Seeded by `prisma/seed.cjs`:

| Role | Email | Password |
|---|---|---|
| Teacher | `teacher@school.com` | `password123` |
| Student | `student@test.com` | `password` |

## 📁 Project Structure

```
brightboost/
├── src/                        # Frontend (React + Vite + TypeScript)
│   ├── components/
│   │   ├── activities/         # Game components (SequenceDragDrop, Unity wrappers)
│   │   ├── StudentDashboard/   # XP ring, module cards, leaderboard
│   │   ├── TeacherDashboard/   # Sidebar, navbar, lesson table, forms
│   │   ├── student/            # Pulse survey, class login
│   │   ├── teacher/            # Roster, CSV import, print cards, showcase
│   │   ├── unity/              # Unity WebGL container
│   │   └── ui/                 # shadcn/ui primitives
│   ├── contexts/               # AuthContext
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # XP, streak, and utility functions
│   ├── locales/                # en/common.json, es/common.json
│   ├── pages/                  # All routed page components
│   ├── services/               # API service layer
│   └── App.tsx                 # Route definitions
├── backend/                    # Express API server
│   ├── src/
│   │   ├── routes/             # auth, modules, progress, courses, PD, pulse, etc.
│   │   ├── services/           # Business logic (game, progress)
│   │   ├── utils/              # Auth middleware, token helpers
│   │   └── server.ts           # Express app entry point
│   └── prisma/                 # Backend Prisma schema (synced for Railway)
├── prisma/                     # Root Prisma schema + seed + migrations
├── dist/games/spacewar/        # Built Spacewar WebGL assets
├── cypress/                    # E2E tests
├── public/                     # Static assets
├── vercel.json                 # Vercel deployment config
└── package.json
```

## 🗺 Roadmap

- [ ] Next set of games (Quantum / AI / Biotech pathways — Set 2 & 3)
- [ ] Build-a-Bot interactive activity (scaffolded, not yet playable)
- [ ] Real-time PvP matchmaking for Spacewar Arena
- [ ] Donation-enabled website
- [ ] Collegiate STEM principles integration (Nathan Frank collab)
- [ ] Community showcase night flow enhancements
- [ ] Mobile-optimized game controls
- [ ] Parent progress portal

## 📬 Contact

Built by the **Bright Bots Initiative**
