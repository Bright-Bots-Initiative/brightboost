# BrightBoost District Pilot Checklist

Pre-deployment readiness checklist for district IT, curriculum coordinators, and school administrators.

## Infrastructure

- [ ] PostgreSQL database provisioned and accessible
- [ ] `DATABASE_URL` and `DIRECT_URL` environment variables set
- [ ] `JWT_SECRET` set to a secure random value (32+ characters)
- [ ] `FRONTEND_URL` set to the production frontend URL
- [ ] Backend deployed and `/health` returns `{ "status": "ok" }`
- [ ] Frontend deployed and loads at the configured domain
- [ ] HTTPS enforced (HSTS enabled by default)
- [ ] Rate limiting active (1000 req / 15 min per IP)

## Accounts & Access

- [ ] Teacher accounts created (or self-signup tested)
- [ ] Student accounts created (or join-code flow tested)
- [ ] K-2 icon-based login tested (no passwords for young students)
- [ ] Password reset flow verified (check backend console for reset links in dev mode)
- [ ] Admin/support account available for troubleshooting

## Classroom Setup

- [ ] At least one class created per teacher
- [ ] Join codes distributed to students or printed as login cards
- [ ] Default language set per class (English or Spanish)
- [ ] At least one weekly session launched as a dry-run

## Content & Curriculum

- [ ] Modules seeded (Rhyme & Ride, Bounce & Buds, Gotcha Gears)
- [ ] Activities load and render correctly in the student player
- [ ] Teacher prep checklists accessible under each module
- [ ] Resources page has downloadable/printable materials

## Data & Privacy

- [ ] No real student PII in demo/seed data
- [ ] FERPA/COPPA compliance reviewed with district counsel
- [ ] Data retention policy documented
- [ ] Audit logging enabled (AuditLog table captures login, signup, password reset events)

## Pilot Trust & Feedback

- [ ] Feedback FAB visible on all pages (bottom-right corner)
- [ ] Showcase Mode accessible at `/showcase` (public, no login required)
- [ ] Showcase Mode accessible from teacher sidebar (with live data)
- [ ] Take-home cards printable from Showcase setup screen
- [ ] Community Impact dashboard shows aggregate metrics

## Teacher Onboarding

- [ ] Teacher tutorial overlay triggers on first login
- [ ] Tutorial can be replayed from Settings → Replay Tutorial
- [ ] Getting-started checklist visible on empty teacher dashboard
- [ ] PD Hub has session templates and reflection tools
- [ ] Faculty Discussion Board accessible

## Testing Matrix

| Feature | Chrome | Safari | Edge | iPad | Chromebook |
|---------|--------|--------|------|------|------------|
| Teacher login | | | | | |
| Student login (email) | | | | | |
| Student login (icon/K-2) | | | | | |
| Module player | | | | | |
| Showcase Mode | | | | | |
| Language toggle | | | | | |
| Password reset | | | | | |

## Go / No-Go

- [ ] All "Infrastructure" items green
- [ ] All "Accounts & Access" items green
- [ ] At least one class created and tested end-to-end
- [ ] Feedback mechanism confirmed working
- [ ] District IT sign-off received
- [ ] Teacher training session scheduled

## Contacts

| Role | Name | Email |
|------|------|-------|
| Technical Lead | | |
| District IT | | |
| Curriculum Coordinator | | |
| Pilot Teacher(s) | | |
