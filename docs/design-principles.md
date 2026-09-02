# Bright Boost — Design Principles (canonical)

> **Canonical for:** product design principles and the Safe Exploration Contract. Last verified against code: 2026-09-02.

These are the principles every Bright Boost activity, feature, and module is built on and measured against. They come from Mitchel Resnick's _Lifelong Kindergarten_ and Papert's constructionism, adapted to our K–8 (+ Pathways) audience.

## Core stance

Kids are **creators, not consumers.** The test for any activity: _does a child walk away with something they made?_ Scores and badges are not the goal — creation is.

## 1. The Creative Learning Spiral is the spine

Every activity moves a child through **Imagine → Create → Play → Share → Reflect**, and loops back. An activity that only has "Play" (respond to a prompt) is incomplete. Build each stage as a real, visible moment:

- **Imagine** — an open prompt / blank-ish canvas: "what will you make?"
- **Create** — the child builds or authors something of their own.
- **Play** — they run it and see what happens; outcomes are _feedback, not failure_.
- **Share** — they name it and show it, scoped appropriately.
- **Reflect** — a gentle wondering prompt; remixing a peer's work loops back to Imagine.

## 2. Creators, not consumers

Prefer making over responding, and **many valid solutions** over one right answer. Move away from "match / pick / choose"; move toward "build / author / design."

## 3. Low floor, high ceiling, wide walls — with a grade-band progression

- **Low floor:** anyone can begin; starting is easy and well-supported.
- **High ceiling:** there's room to grow toward sophisticated, ambitious creation.
- **Wide walls:** many paths and styles are valid, not one route.

**How this maps to our grades and levels:** the floor lives at the youngest/earliest end, and the ceiling rises with age and progression.

- **K–2 is more structured.** Young children get more scaffolding, guidance, and guardrails so they learn the fundamentals and can always succeed. The floor here is deliberately _supported_ — a starter template, a guided first step, a constrained set of choices — never a blank, unguided void.
- **Later grades and higher levels open up.** As children age up and progress through levels, activities become progressively more open-ended, handing over more creative freedom toward the high ceiling. Even within a single activity, early levels are more structured and later levels more open.

Structure early, openness later. Both ends must exist: a fully-open experience with no scaffolding fails young kids (they get lost); a fully-structured experience with no openness fails older kids (they hit a ceiling too soon).

## 4. Playground, not playpen

Children can experiment, take risks, and even "break" things on purpose, safely. Mischief is a creativity signal, not misbehavior. The mascot/adult voice is **curious, never corrective** — it wonders alongside; it doesn't announce right and wrong.

## 5. Measure creation, not completion

Track soft, non-comparative signals — **things built, times iterated (run → tweak → run), creations shared, peer remixes** — not "lessons completed" or "badges earned."

## 6. The adult is a guide, not a proctor

The teacher/parent experience is **Catalyst** (optional sparks, never requirements) → **Connector** (pair kids by their creations) → **Consultant** (wondering prompts) → **Collaborator** (builds alongside). Dashboards surface "what they made," not "who finished."

## 7. Screen use, not screen time

Maximize _creative_ time on screen. Where possible, pair an activity with an **unplugged twin** — the same constructionist activity in physical materials — as a genuine equal, not a consolation.

## 8. Localizable and culturally grounded from day one

All strings keyed and localizable (EN / 中文 and beyond) — never baked into a build. Where an activity draws on a culture's heritage, embed the wisdom **in the making** (discovered by doing), keep myth and history distinct, and have native/heritage reviewers validate it.

## 9. Safe exploration: the unknown is explorable, not hazardous

> Bright Boost makes the unknown explorable, not hazardous: every experiment gives the learner a meaningful choice, a visible consequence, and a safe way back. Surprise may change the path, but never access, assessment, safety, or dignity.

This is the operational form of "playground, not playpen" (principle 4). Internally we call the lens **the Fool / Safe Wonder** — the mature explorer who steps into the unknown on purpose, with a way back. That name never reaches learners: child-facing language stays age-appropriate, culturally portable, and easy to localize (for example: **Try, Notice, Change, Keep, Go back**).

### The Safe Exploration Contract

Every new game or substantial exploratory feature identifies, before it is built:

- the **meaningful unknown** it makes explorable;
- the **variable(s) the learner controls** — at least one;
- how the **consequence becomes visible**;
- its **checkpoint / undo / restore / branch** behavior — the safe way back;
- its **variation mode** (defined below): deterministic, seeded, generative, or remix;
- its **grade-band scaffolding** (the banded expressions below);
- its **reflection or next-choice** behavior (the spiral's Reflect, principle 1);
- its **teacher/facilitator controls** (principle 6);
- its **accessibility, localization, privacy, and payload bounds**;
- **confirmation that variation never affects mastery, access, XP, or ranking**.

### The four variation modes

A ticket names exactly which mode(s) it uses, so it can be judged objectively. The modes describe two axes — where variation comes from and how content is assembled — so they can combine: a generative experience is normally seeded too, and a ticket names both.

- **Deterministic** — the content never varies; the unknown lives in the learner's own choices and their visible consequences. (A fixed maze explored by different routes is deterministic.)
- **Seeded** — variation comes from a stored seed: purposeful, replayable, and versioned. The same seed and settings replay the same experience, and tests can pin it.
- **Generative** — content is assembled at runtime from **validated building blocks** within declared bounds; never arbitrary code, never outside grade-band or safety rules.
- **Remix** — variation is sourced from a learner's (or, with scoped permission, a peer's) prior creation, preserving lineage: the original, the remix, and the relationship between them.

### Banded expressions

The contract scales with principle 3's progression — one contract, distinguished expressions:

- **K–2** — a **supported starting state**, never a blank canvas; one variable at a time; concrete verbs (for example Try, Notice, Change, Keep, Go back — final state names belong to the shared-controls work, #838); the way back is one obvious action.
- **Grades 3–5** — predictions before experiments, repeated trials, and side-by-side comparison of outcomes; more than one variable may open up; version language ("before / after") is allowed.
- **Grades 6–8 (future)** — open investigation: learner-framed questions, multi-variable experiments, and comparison across their own versions and peers' remixes, still inside the same safety rules.

### Platform rules for exploration

- **Unknown does not automatically mean random.** A meaningful unknown can be deterministic.
- **Learning-state randomness is purposeful, seeded, replayable, and versioned** — the same seed and settings replay the same experience, and tests can pin it.
- **Expected experimental outcomes are learning data; infrastructure failures are not.** A failed save or engine call is restored, logged, and surfaced — never silently reported as a valid learner outcome.
- **Security, privacy, accessibility, factual accuracy, grade-band rules, and teacher assignments outrank surprise or delight.** Surprise chooses only among experiences that are registered, visible, unlocked, grade-appropriate, and appropriate to the learner's completion state and context.
- **K–2 receives a supported starting state**, never a blank canvas (principle 3).
- **Child-created extensions use validated building blocks**; they do not execute arbitrary code.
- **Essential navigation and objectives are never hidden** behind an easter egg, randomness, hover, motion, or discovery-only UI — and there is always a visible route back to the ordered learning path.
- **Process measures favor** creations, revisions, comparisons, returns-to-edit, shares, and remixes over completion alone (principle 5).

Safe exploration happens **within** the deliberately ordered, gated learning structure — inside content already unlocked — never as a bypass of set progression, mastery requirements, or teacher assignments.

## How we apply these

- **The creative-loop work** (Creation model, authoring, gallery, dashboard/game reframes) is the first implementation of the spiral: kid makes → shares → adult sees. New surfaces extend the spiral, not the score.
- **Every new activity** is checked against these principles and the team review checklist _before_ it is built: spiral present? creator not consumer? supported low floor with a ceiling that rises by grade/level? playground not playpen? measuring creation? adult as guide? localizable? **safe way back from every experiment?**
- **Every exploratory feature** answers the Safe Exploration Contract (principle 9) in its design doc or ticket before implementation begins.

When a design decision is unclear, resolve it toward creation, toward the spiral, and toward the right floor-and-ceiling for the age.
