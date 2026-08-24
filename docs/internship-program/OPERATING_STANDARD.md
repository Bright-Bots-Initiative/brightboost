> **Canonical for:** internship and contributor-cohort program planning. Last verified against program policy: 2026-08-18.

# Bright Boost Internship Program Operating Standard

- **Status:** Provisional canonical standard; first revision due after the next cohort
- **Policy owner:** Bright Bots Initiative Executive Director or delegated program lead
- **Derived from:** Summer 2026 cohort closeouts
- **Review cadence:** Before every cohort and after the first cohort using this standard

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

Open the preboarding window 7–10 days before the official program start and complete it before assigning production work. The recorded group huddle must cover the product, repository, team roles, communication channels, review etiquette, and how to ask for help.

Use [`SETUP.md`](../../SETUP.md) sections 1–6 as the single setup procedure. Each participant must complete it and run the canonical environment-independent parity command:

```bash
npm run verify -- --skip-install --allow-skips
```

In the same readiness flight check, every participant must be able to:

- access GitHub, Slack, and the required project documentation;
- create a branch, commit, and push it;
- complete one small, reversible acclimation task that ends in a real practice pull request before Day 1;
- keep that acclimation task away from production data and release-critical dependency chains;
- request review on the practice pull request;
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

After a planning or team meeting changes active work, the lead posts a short ownership recap in the team channel: driver, ticket, status, next milestone, blocker, and reviewer. GitHub remains the permanent source of truth; the recap makes the changed action visible.

## Responsible LLM standard

Follow the repository's canonical [`AI-assisted coding practices`](../guides/ai-coding-practices.md). For every AI-assisted cohort change, the contributor must also be able to:

- explain what changed and why;
- connect it to the issue's acceptance criteria;
- inspect the complete diff for unrelated or unsafe changes;
- identify the authoritative source used to verify APIs, translations, and architecture assumptions;
- show the relevant automated and manual test evidence; and
- accept full responsibility for the submitted result.

## Localization confidence standard

Use the existing glossary and translation architecture documented in [`docs/i18n.md`](../i18n.md), including `src/data/glossary.ts` and `pathways.glossary.terms.<slug>.*`. Follow the repository rule for uncertain wording in [`20-i18n.md`](../agents/rules/20-i18n.md): retain the English value and add `// TODO: translate` until a language reviewer resolves it.

Before assigning localization work, also provide:

- screen or interaction context for assigned strings;
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

## Assignment delivery contract

Before work begins, every cohort assignment records:

- one accountable driver and any collaborators;
- the intended outcome, explicit exclusions, and acceptance criteria;
- a concrete due date with time zone and the first check-in or draft-PR milestone;
- `Blocked by`, `Prerequisite for`, and `Unlocks` links wherever dependencies exist;
- the expected reviewer and review window; and
- the required handoff if the full scope cannot land during the cohort.

Deadlines are planning tools, not punishment. If scope or circumstances change, the owner and lead revise the date or cut scope explicitly in the issue rather than allowing the plan to become silently stale.

Parent issues own outcomes and sub-issues own reviewable implementation seams. A dependent issue is not marked `ready` until its prerequisites have landed or a lead records why parallel work is safe. Stacked pull requests are exceptional and must name their base, merge order, and what each merge unblocks.

## Reviewable pull requests

- One pull request delivers one coherent outcome; unrelated cleanup, content, infrastructure, and feature work stay separate.
- Open a draft when the first meaningful vertical slice exists so review can shape the work early.
- Aim for no more than roughly **400 substantive changed lines or 10 files**. Locale data, generated artifacts, and mechanical fixtures may be excluded when clearly separated for review.
- Above roughly **800 substantive lines or 15 files**, agree on a split plan with the expected reviewer before adding more work. If the change is genuinely inseparable, include a review map naming the seams and reading order.
- Schedule implementation so review and one correction round can happen before the assignment deadline. A pull request opened on the final day is a handoff, not a completed assignment.

These are reviewability triggers, not performance scores. The governing question is whether a reviewer can understand, test, and safely approve one outcome without reconstructing an entire project.

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

Record these measures in the cohort's program plan. The program lead owns the record unless the plan names another owner.

| Measure                 | Target                                                                     | Evidence recorded in             |
| ----------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| Readiness               | Every participant passes before production assignment                      | Program plan readiness record    |
| Initial ownership       | Every participant has a primary lane and first bounded issue at launch     | Participant-lanes table          |
| Review handoff          | Action-required reviews are acknowledged within the plan's target          | Decision and action log          |
| Peer learning           | Every participant performs the peer-review cadence named in the plan       | Interaction record or action log |
| Localization confidence | Uncertainty is resolved by the named language reviewer                     | Assignment or PR evidence        |
| Test quality            | Every completed contribution includes expected evidence                    | Assignment or PR evidence        |
| Portfolio outcome       | Every participant leaves with at least one accurate, reviewable case study | Portfolio-capture table          |

## Change log

| Effective cohort              | Change                                  | Reason/evidence                                                                      | Approved by      |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ | ---------------- |
| Next cohort after Summer 2026 | Initial operating and delivery standard | Summer 2026 closeouts, cohort retrospective, and #771 delivery-policy reconciliation | Nathaniel Walker |
