> **Canonical for:** internship and contributor-cohort program planning. Last verified against program policy: 2026-08-18.

# Bright Boost Internship Program Operating Standard

- **Status:** Canonical program-planning standard
- **Policy owner:** Bright Bots Initiative Executive Director or delegated program lead
- **Derived from:** Summer 2026 cohort closeouts
- **Review cadence:** Before every cohort

## Purpose

Bright Boost internships should give participants authentic experience contributing to a shared product while providing enough structure that setup and communication do not become avoidable barriers. The program should preserve real ownership, collaboration, pull-request learning, responsible LLM use, and portfolio evidence.

## Required program principles

1. **Real product work:** Assign bounded contributions that matter to learners or educators and have named acceptance evidence.
2. **Role-aligned ownership:** Give every participant one primary lane—backend, game/UX, front end, quality, or full stack—and one optional stretch area.
3. **Collaboration by design:** Do not rely on spontaneous interaction. Schedule peer review, shared demos, and small-group huddles.
4. **GitHub plus Slack:** GitHub is the permanent technical record. Slack is the attention layer for time-sensitive review and approval handoffs.
5. **Human accountability for AI-assisted work:** LLMs may accelerate work but never replace understanding, verification, testing, security, or reviewer judgment.
6. **Localization requires authority:** Uncertain translations must be flagged and resolved through context, a glossary, and a designated language reviewer.
7. **Testing is part of design:** Every issue must identify normal behavior, relevant boundary or error cases, and required manual or automated evidence.
8. **Portfolio capture is continuous:** Save the problem, decisions, before/after evidence, validation, and final link while each contribution is fresh.

## Pre-program readiness gate

Complete this before assigning production work. Every participant must be able to:

- access GitHub, Slack, and the required project documentation;
- install the documented runtimes, package managers, and database tools;
- configure the local environment without exposing credentials;
- start the database, backend, and frontend;
- run the designated smoke test or test suite;
- create a branch, commit, and push it;
- open a practice pull request and request review;
- respond to a change request and update the same pull request; and
- locate the CI result and explain whether the pull request is ready.

Run this as a recorded group huddle 5–7 days before the program begins. Fix documentation gaps or provide targeted help before production assignments start.

## Communication and review protocol

Send a direct Slack message in addition to the GitHub notification when:

- a pull request is ready for first review;
- requested changes require the author to act;
- a revision is ready for re-review;
- approval or a decision blocks another contributor; or
- ownership of a stalled item is unclear.

The message must include the link, requested action, reason it is needed, and target timeframe. The recipient should acknowledge it within one business day.

Every participant should complete at least one substantive peer review per sprint and share one review insight during a huddle or demo.

## Responsible LLM standard

For every AI-assisted change, the contributor must be able to:

- explain what changed and why;
- connect it to the issue's acceptance criteria;
- inspect the complete diff for unrelated or unsafe changes;
- verify APIs, translations, and architecture assumptions against an authoritative source;
- run the relevant automated and manual tests;
- protect credentials and private user data;
- record significant prompts when required by the repository; and
- accept full responsibility for the submitted result.

## Localization confidence standard

Before assigning localization work, provide:

- a shared product and learning-term glossary;
- screen or interaction context for assigned strings;
- a documented way to flag uncertain wording;
- a designated reviewer for language accuracy; and
- UI checks for missing keys, fallback text, truncation, and the intended student age band.

Machine or LLM translation may be a draft, never the final authority.

## Interaction rhythm

At minimum, every cohort includes:

- a pre-program setup huddle;
- a Week 1 assignment and architecture huddle;
- rotating review pairs or triads for each sprint;
- a short recurring demo or work-in-progress review;
- a midpoint feedback pulse with at least one documented program adjustment; and
- individual closeouts plus a final cohort retrospective.

## Definition of done for intern assignments

An assignment is complete only when:

- scope and acceptance criteria are explicit;
- the contributor can explain the design and implementation;
- relevant test cases and manual evidence are attached;
- required review and CI checks are complete;
- documentation or handoff notes are sufficient for a new owner;
- unresolved questions are recorded rather than hidden; and
- portfolio-safe evidence is captured when appropriate.

## Program-level success measures

- 100% of participants pass the readiness gate before production assignment.
- Every participant has a primary lane and a first bounded issue at launch.
- Action-required reviews are acknowledged within one business day.
- Every participant performs substantive peer review during each sprint.
- Localization uncertainty is resolved by a named reviewer.
- Every completed contribution includes expected test evidence.
- Every participant leaves with at least one accurate, reviewable case study.

## Change log

| Effective cohort              | Change                     | Reason/evidence                                           | Approved by      |
| ----------------------------- | -------------------------- | --------------------------------------------------------- | ---------------- |
| Next cohort after Summer 2026 | Initial operating standard | Summer 2026 individual closeouts and cohort retrospective | Nathaniel Walker |
