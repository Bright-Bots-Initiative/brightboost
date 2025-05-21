# BrightBoost QA Process

This document outlines the quality assurance process for the BrightBoost platform. It serves to align interns and contributors on how QA is conducted, what's tested, bug triage procedures, privacy/security requirements, and release blockers.

## What We Test

### Functional Flows
- **Teacher Dashboard**: Lesson management, student progress tracking, class organization
- **Student Dashboard**: Learning modules, word games, leaderboard, XP tracking
- **API Endpoints**: Authentication, data retrieval/storage, user management

### Non-Functional Requirements
- **Performance**: Page load < 2s, API response < 1s, flag performance spikes > 2s
- **Privacy**: No PII leaks, secure data handling (see PASS checklist below)
- **Accessibility**: WCAG 2.1 AA compliance for all user interfaces

### Platforms
- **Desktop**: Latest Chrome and Edge browsers
- **Tablet**: iPadOS Safari
- **Education**: Low-end Chromebooks (4GB RAM, Celeron processors)

## QA Cycle

### Schedule
- Bi-weekly comprehensive tests on staging environment
- Smoke tests on all PRs tagged with `qa-ready`
- Full regression suite before each production release

### Owners
- **Jolin**: QA lead, test coordination and reporting
- **Daniel**: UX feedback and usability testing
- **Louis**: Release gatekeeper, final approval

### Test Sources
- Manual test scripts in `/docs/qa/scripts.md`
- Automated Playwright test suite in `/e2e`
- Cypress component and integration tests
- Vitest unit tests

## Bug Triage Process

### Steps
1. Reproduce the issue and capture video or screenshot evidence
2. File issue using template: `.github/ISSUE_TEMPLATE/bug.yml` (to be created)
3. Apply appropriate severity and component labels

### Severity Labels
- **S0-blocker**: System crashes, data loss, broken authentication
- **S1-high**: Core feature unusable (e.g., lesson won't save)
- **S2-medium**: Workaround exists; minor bug or UI glitch
- **S3-low**: Typo or trivial style issue

### Component Labels
- **teacher-ui**: Teacher dashboard and related components
- **student-ui**: Student dashboard and learning modules
- **backend**: API, authentication, data storage
- **infra**: Build, deployment, environment issues

### Assignment
- Assign to squad lead based on component: Giorgio, Diya, or Aaron

## Privacy & Security Checklist ("PASS")

All PRs tagged `qa-ready` and S0/S1 issues must pass this checklist:

- [ ] No PII hard-coded or logged in the application
- [ ] All network calls use HTTPS
- [ ] OAuth tokens stored securely (not in localStorage)
- [ ] Emails/usernames masked in screenshots and documentation
- [ ] COPPA compliance verified for new student-facing features
- [ ] Input validation implemented for all user inputs
- [ ] No sensitive data exposed in API responses

## Release Blockers

A build cannot be merged to production if:

- Any S0 or S1 issue remains open
- Playwright test suite fails more than 1 test
- Lighthouse score falls below 70 on key pages
- PASS checklist has not been signed off
- Code coverage drops below established thresholds
- Accessibility violations are detected

## Useful Commands

```bash
# Run automated end-to-end tests headless
npm run test:e2e

# Generate Lighthouse report (desktop)
npm run audit

# Start local development environment
npm run dev:full

# Run component tests with coverage
npm run test -- --coverage
```

## Contact & Escalation

- **First Contact**: Post in Slack #qa channel for general issues
- **On-Call Rotation**: Refer to sprint doc for pager rotation during release week
- **Critical Issues**: Escalate S0 bugs directly to Louis via @channel

## Documentation Maintenance

This README is maintained by the QA team and should be updated whenever testing processes, tools, or requirements change. All contributors are encouraged to suggest improvements via PR.
