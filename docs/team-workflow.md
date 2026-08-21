# Team Workflow — Labels, Priority, Delegation, Team-Ups & Cohort Delivery

> **Canonical.** This is the source of truth for our label taxonomy, the priority axis
> (`P0 — now` / `P1 — this week` / `P2 — when free`), lead delegation, and the team-up
> protocol. It also defines the delivery standard for internship and contributor cohorts.

## Part 1 — Labels & priority (canonical)

Our labels encode five independent things. Naming the axes removes the guesswork:

| Axis               | Labels                                                                                                                                 | Question it answers         |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Pod**            | `pod: build`, `pod: experience`, `pod: either`                                                                                         | Whose lane?                 |
| **Size**           | `small`, `medium`, `large`                                                                                                             | How much effort?            |
| **Audience**       | `intern-starter` (cohort-reserved), `good first issue` (public)                                                                        | Who may pick it up?         |
| **Topic**          | `bug`, `enhancement`, `cleanup`, `content`, `analytics`, `i18n`, `architecture`, `safety`, `testing`, `creative-loop`, `documentation` | What kind of work?          |
| **State**          | `ready`                                                                                                                                | Is it vetted and unblocked? |
| **Priority** (new) | `P0 — now`, `P1 — this week`, `P2 — when free`                                                                                         | How urgent?                 |

Priority — the new axis:

- **P0 — now** — drop other work: prod incidents, safety on live surfaces, anything blocking multiple people.
- **P1 — this week** — the current sprint's real work; assigned tickets default here.
- **P2 — when free** — real but not urgent; the pool to pull from between tickets.

Rules of thumb:

- Priority ≠ size (a P0 can be small; a P2 can be large) and priority ≠ assignment — a P0 stays P0 no matter who's on it.
- `ready` and priority are orthogonal: `ready` is a gate (vetted + unblocked), priority is an ordering (urgency). An issue can be `ready` + P2.
- `safety` implies at least P1 until triaged.
- A bug on a live surface implies at least P1 (same as safety).
- Every `ready` ticket carries a priority label. No priority label means "not yet triaged" — it's in the inbox, not the backlog (a useful signal in itself), not a silent P2.

Canonical Topic note: use `enhancement`, not `feature` (`feature` is a deprecated synonym). `pilot-smoke`, `codex`, and GitHub-stock resolution labels (`duplicate`, `invalid`, `wontfix`) are automation/housekeeping — not part of these axes.

### Re-evaluating priority

Leads own priority for their pod, at two moments: (a) any time you touch a ticket and the urgency looks wrong — change it, no ceremony; (b) a standing start-of-week pass on the P0/P1 line together. `P2` ↔ `P1` moves and downgrades are the lead's call. **Moving a ticket _to_ `P0` is always escalated to Nathaniel** — it means "drop other work," so it reprioritizes people.

## Part 2 — Delegation: how a lead hands out a ticket

Five steps:

1. **Lane check** — your pod's label? Assign freely, no sign-off. Other pod → hand to that lead. `safety` or prod-touching → loop in Nathaniel first.
2. **Load check** — everyone carries one primary ticket at a time. Look at what's open before adding.
3. **Fit check** — match size to bandwidth and experience; alternate comfort and stretch (someone who just shipped an easy one gets a stretch next, and vice versa).
4. **Passion tiebreak** — if two people could do it and one wants it, passion wins. (Both want it → Part 3.)
5. **Assign with a landing** — a name on a ticket isn't an assignment. The assignment is a comment with: the first milestone, what "done by \<day\>" looks like, and when you'll check in.

Leads don't need permission to delegate inside their pod — that's the job. The landing comment is the only requirement.

**Self-claiming.** Delegation is how a lead _hands out_ a ticket — it doesn't replace self-selection. Anyone may claim a `ready` ticket that fits their pod and load (the `intern-starter` pool exists to pull from). Assigned tickets get a lead's landing comment; a self-claimed ticket carries a self-written landing (first milestone + when you'll open a PR), so the plan is visible either way.

## Part 3 — The team-up protocol (ideas on someone else's ticket)

Three rules, escalating:

1. **Ideas are always welcome**, on any ticket, claimed or not. Comment them on the issue; the owner decides what to fold in and credits contributors in the PR. A claimed ticket is never a closed conversation.
2. **If the interest runs deeper than a comment — team up.** The lead makes it a collaboration: split by seam (two sub-issues off a parent — substrate/surface, logic/UI, code/tests; the Alice/Catarina creative-loop review is the model), or co-assign with a named driver when it won't split cleanly.
3. **Every team-up has exactly one driver** — accountable for shipping. The collaborator contributes and becomes the natural reviewer (our can't-approve-your-own-PR rule makes a co-builder's review the system working, not a conflict). First step of any team-up: a one-hour pairing session to agree the split before code.

A team-up isn't only for retrofitting a claimed ticket: a genuinely large ticket can _start_ as one — a lead sets it up as a collaboration from the jump. The structure (seam-split, or co-assign with one named driver) is the same whether it's new or retrofitted.

Why this fits us: the whole pivot is share and remix — kids building on each other's creations. The team working the same way is the culture practicing what it ships.

## Part 4 — Cohort delivery standard (canonical)

This section applies to every time-bounded internship or contributor cohort. Deadlines are planning tools,
not punishment: they make dependencies and review capacity visible early enough to help someone succeed.

### Two-week preboarding

Preboarding begins about two weeks before the official program start and includes:

1. A live orientation covering the product, repository, team roles, communication channels, review
   etiquette, and how to ask for help.
2. Local setup verified by running the documented lint, typecheck, and test commands.
3. One small, reversible acclimation ticket that ends in a real pull request before Day 1. It must not
   touch production data or sit on a release-critical dependency chain.
4. An access check for GitHub, Slack, required environments, and test credentials, with a named owner for
   anything still missing.

The acclimation task exists to expose setup and workflow questions early. It is not a test of how much
product work someone can complete before the program begins.

### Every assignment has a delivery contract

Before work begins, the issue body or assignment comment records:

- one accountable driver and any collaborators;
- the intended outcome and acceptance criteria;
- a concrete due date, including time zone, plus the first check-in or draft-PR milestone;
- `Blocked by`, `Prerequisite for`, and `Unlocks` links where dependencies exist;
- the expected reviewer and review window; and
- the handoff expected if the full scope cannot land during the cohort.

No cohort assignment is left with an open-ended "when you can" deadline. If scope or circumstances change,
the owner and lead revise the date or cut explicitly in the issue rather than allowing the plan to become
silently stale.

### Dependency chains stay visible

- Parent issues own the outcome; sub-issues own reviewable implementation seams.
- A dependent issue is not marked `ready` until its prerequisites have landed or a lead records why work
  may safely proceed in parallel.
- Stacked pull requests are the exception. When necessary, each PR names its base, merge order, and what
  becomes unblocked after it lands.
- After a planning or team meeting, the lead posts a short ownership recap in the team channel: current
  driver, ticket, status, next milestone, blocker, and reviewer. GitHub remains the source of truth; the
  channel recap makes changes visible to everyone.

### Pull requests are small, early, and frequent

- One PR should deliver one coherent outcome. Do not bundle unrelated cleanup, content, infrastructure,
  and feature work because they were completed at the same time.
- Open a draft PR when the first meaningful vertical slice exists. Review should shape the work while it
  is still inexpensive to change, not arrive after a week of hidden development.
- Aim for no more than roughly **400 substantive changed lines or 10 files** per PR. Locale data, generated
  artifacts, and mechanical fixtures may be excluded when the PR clearly separates them for review.
- A proposed PR above roughly **800 substantive lines or 15 files** needs a split plan agreed with the
  expected reviewer before more code is added. If the work is genuinely inseparable, include a review map
  explaining the seams and recommended reading order.
- Schedule implementation so review and one correction round happen before the ticket deadline. A PR
  opened on the final day is a handoff, not a completed assignment.

The numbers are reviewability triggers, not scoring targets. A 200-line PR can still be too broad, while a
large translation file can remain straightforward. The governing question is whether a reviewer can
understand, test, and safely approve one outcome without reconstructing an entire project.
