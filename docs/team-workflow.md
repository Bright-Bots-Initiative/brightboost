# Team Workflow — Labels, Priority, Delegation & Team-Ups

> **Canonical.** This is the source of truth for our label taxonomy, the priority axis
> (`P0 — now` / `P1 — this week` / `P2 — when free`), lead delegation, and the team-up
> protocol. Labels and priorities are defined here.

## Part 1 — Labels & priority (canonical)

Our labels encode five independent things. Naming the axes removes the guesswork:

| Axis | Labels | Question it answers |
|------|--------|---------------------|
| **Pod** | `pod: build`, `pod: experience`, `pod: either` | Whose lane? |
| **Size** | `small`, `medium`, `large` | How much effort? |
| **Audience** | `intern-starter` (cohort-reserved), `good first issue` (public) | Who may pick it up? |
| **Topic** | `bug`, `enhancement`, `cleanup`, `content`, `analytics`, `i18n`, `architecture`, `safety`, `testing`, `creative-loop`, `documentation` | What kind of work? |
| **State** | `ready` | Is it vetted and unblocked? |
| **Priority** (new) | `P0 — now`, `P1 — this week`, `P2 — when free` | How urgent? |

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

Leads own priority for their pod, at two moments: (a) any time you touch a ticket and the urgency looks wrong — change it, no ceremony; (b) a standing start-of-week pass on the P0/P1 line together. `P2` ↔ `P1` moves and downgrades are the lead's call. **Moving a ticket *to* `P0` is always escalated to Nathaniel** — it means "drop other work," so it reprioritizes people.

## Part 2 — Delegation: how a lead hands out a ticket

Five steps:

1. **Lane check** — your pod's label? Assign freely, no sign-off. Other pod → hand to that lead. `safety` or prod-touching → loop in Nathaniel first.
2. **Load check** — everyone carries one primary ticket at a time. Look at what's open before adding.
3. **Fit check** — match size to bandwidth and experience; alternate comfort and stretch (someone who just shipped an easy one gets a stretch next, and vice versa).
4. **Passion tiebreak** — if two people could do it and one wants it, passion wins. (Both want it → Part 3.)
5. **Assign with a landing** — a name on a ticket isn't an assignment. The assignment is a comment with: the first milestone, what "done by \<day\>" looks like, and when you'll check in.

Leads don't need permission to delegate inside their pod — that's the job. The landing comment is the only requirement.

**Self-claiming.** Delegation is how a lead *hands out* a ticket — it doesn't replace self-selection. Anyone may claim a `ready` ticket that fits their pod and load (the `intern-starter` pool exists to pull from). Assigned tickets get a lead's landing comment; a self-claimed ticket carries a self-written landing (first milestone + when you'll open a PR), so the plan is visible either way.

## Part 3 — The team-up protocol (ideas on someone else's ticket)

Three rules, escalating:

1. **Ideas are always welcome**, on any ticket, claimed or not. Comment them on the issue; the owner decides what to fold in and credits contributors in the PR. A claimed ticket is never a closed conversation.
2. **If the interest runs deeper than a comment — team up.** The lead makes it a collaboration: split by seam (two sub-issues off a parent — substrate/surface, logic/UI, code/tests; the Alice/Catarina creative-loop review is the model), or co-assign with a named driver when it won't split cleanly.
3. **Every team-up has exactly one driver** — accountable for shipping. The collaborator contributes and becomes the natural reviewer (our can't-approve-your-own-PR rule makes a co-builder's review the system working, not a conflict). First step of any team-up: a one-hour pairing session to agree the split before code.

A team-up isn't only for retrofitting a claimed ticket: a genuinely large ticket can *start* as one — a lead sets it up as a collaboration from the jump. The structure (seam-split, or co-assign with one named driver) is the same whether it's new or retrofitted.

Why this fits us: the whole pivot is share and remix — kids building on each other's creations. The team working the same way is the culture practicing what it ships.
