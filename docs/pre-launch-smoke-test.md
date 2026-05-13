# Pre-Launch Smoke Test Checklist

Run through this in a browser before declaring Phase 1 complete.
See `docs/intern-credentials.md` for accounts.

## Logins

- [ ] teacher@school.com / password123 → teacher dashboard
- [ ] explorer@test.com / explore123 → student dashboard, Set 2 unlocked
- [ ] student@test.com / password → fresh K-2 student
- [ ] jordan@test.com / jordan123 → student dashboard, grade 3-5 content visible
- [ ] STARS1 class code → emoji picker → student dashboard
- [ ] marcus@test.com / marcus123 → /pathways with partial progress
- [ ] aisha@test.com / aisha123 → /pathways fresh
- [ ] facilitator@test.com / pathway123 → /pathways/facilitator (Coach Davis)

## Set 1 Quiz Rendering

- [ ] Bounce & Buds quiz shows 4 choices per question
- [ ] Gotcha Gears Q3 correct answer is "Algorithm" (not "Rule")
- [ ] Rhyme & Ride quiz works
- [ ] Tank Trek quiz works
- [ ] Quantum Quest quiz works

## Set 2 Quiz Rendering

- [ ] Maze Maps quiz renders as interactive multiple choice (not raw JSON)
- [ ] All 5 Set 2 quizzes have working 4-choice questions
- [ ] Quiz badge shows "QUIZ" not "STORY"

## Set 2 Story Slides

- [ ] All slides show narrative text (not just emoji)
- [ ] Story → Game → Quiz flow works for at least one Set 2 module end-to-end

## Data Dash (G3-5)

- [ ] All 5 Data Dash questions show 4 choices each (`dd-q1` through `dd-q5`)
- [ ] Quiz reachable from Jordan's account (3-5 student)

## Bilingual

- [ ] Toggle to Español on a Set 1 game → all content in Spanish
- [ ] Toggle to Tiếng Việt on home → hero text translates
- [ ] Toggle to 简体中文 on home → hero text translates
- [ ] Toggle persists across navigation and reload

## A/B Testing Dashboard

- [ ] `/admin/experiments` loads when logged in as teacher
- [ ] Seeded example experiment ("Default Game Difficulty") appears
- [ ] `/admin/experiments` is NOT accessible when logged in as student

## Slack Integration (if `SLACK_WEBHOOK_URL` configured)

- [ ] Latest deploy posted to #deployments

## Hidden Features Stay Hidden

- [ ] "Fix the Order" / "Lost Steps" does NOT appear in student module list
- [ ] "Build-a-Bot" does NOT appear anywhere

## Mobile

- [ ] Login page works on mobile (≤ 375 px width)
- [ ] Student dashboard works on mobile
- [ ] At least one Set 1 game playable on mobile touch
- [ ] Floating mascot badges fall back to 2 on mobile (Always Free + Bilingual)

## Home Page Mascot

- [ ] `/` shows mascot from `/mascots/bright-bot-character.png`
- [ ] No broken-image box, no mirrored alt text
- [ ] Four floating badges on desktop, two on mobile
