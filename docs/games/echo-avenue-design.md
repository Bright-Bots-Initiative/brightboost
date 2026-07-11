# Echo Avenue — live two-performer sound-and-motion studio (design doc)

> Status: **source-reconciled** — this file now carries the externally authored, founder-reviewed
> design (reconciled against the original commission document on 2026-07-11), with the founder
> rulings and hardware-test additions kept as the clearly-marked delta layer (§11). Where the earlier
> repo transcription had drifted from the source, the source won (K–2 opening pads, Watch-the-Take
> actions, Reflect wording, cover pose at share) — and the code was aligned in the same commit.
> Lands against #676 (Set 3 "Mastery"), slot **`set3-game-3`**. Bar: `docs/design-principles.md`.

## 1. Concept

**Echo Avenue** is a live sound-and-motion studio in a side-scrolling neighborhood. Tapping a large
action pad makes one of two original Bright Boost performers move and sound at the same instant —
step, clap, turn, bounce, chime, or whoosh. The Lead's take repeats while the child overdubs the
Partner, creating call-and-response, overlaps, and pauses. The child replays, revises, names, and
shares the resulting audiovisual duet. There are no enemies, scores, stars, timers, leaderboards,
win/lose state, or correct rhythms; **the child decides when it is ready.**

**Theme-free litmus line:** *Kids improvise and layer a live two-performer sound-and-motion loop,
experience every choice immediately, and save the resulting performance for others to experience.*

## 2. Provenance (trimmed) + transformation table

Inspired by **classic side-scrolling two-player cooperation patterns** — the kinetic interaction
DNA, not any protected expression or combat premise. That general DNA transforms as follows:

| Reference DNA | Echo Avenue translation |
| --- | --- |
| Continuous side-view action stage | A freely explorable, bidirectional performance canvas — no forced march, encounter gates, or stage clear |
| Two-character cooperation | Lead + Partner overdub; distinct original silhouettes, not twins/siblings or red/blue counterparts |
| Action buttons used alone or together | Movement-sound gestures that form phrases and harmonies |
| Chained actions and positioning | Call-and-response, simultaneous beats, pauses, and movement patterns |
| Responsive scenery | Curated sound spots such as a tunnel echo or puddle percussion |
| Enemies, damage, stage clear, score, timer | None; the child chooses when the take is ready |

**Original-IP boundary:** no third-party names, characters, story, moves, costumes, enemies,
weapons, stages, audiovisual assets, logos, combat aesthetics, health-bar HUD, combo notation, or
"for fans of" comparisons anywhere. All child-facing expression is original Bright Boost work.
Final naming and logo require launch-market trademark, app-store, and domain clearance.

## 3. Differentiation case

| Activity | Creative medium | Core verb | STEM lens | Feedback relationship |
| --- | --- | --- | --- | --- |
| Boost Track Builder | Spatial piece construction | Build → ride | Speed, curves, cause/effect | Build, then test |
| Machine game | Logical instruction construction | Program → watch | Sequencing, loops, debugging | Program, then execute |
| Waterworks | Systems construction | Route → storm-test | Flow, protection, tradeoffs | Build, then simulate |
| Data Dash authoring | Structured challenge authoring | Author → challenge | Categories and sorting | Compose, then peer-play |
| **Echo Avenue** | **Live audiovisual performance** | **Improvise → layer → listen** | **Rhythm fractions, ratios, repetition, and acoustics** | **Creation and feedback happen simultaneously** |

The three-axis difference is explicit: the **medium** is live performance, the **verb** is
improvise/overdub, and the **lens** is rhythmic subdivision, cycles, rests, meter, ratios,
synchronization, and acoustics. There is no board, route, quiz, command list, editable note grid,
move-card timeline, or "Run" button. Saved data may be structured, but the child's interface
remains a live instrument: tap, hear, see, layer.

## 4. Spike verdict + the hardware-sensitivity hedge (delta layer)

The Phase 1 latency spike (`/dev/echo-spike`, kept in-tree as the **audio regression harness**)
passed on founder hardware: **est. audible ≈13 ms** (+ ~30–45 ms touch input), **feels live**;
loop ran with **0 underruns**, worst pump gap 34 ms.

**Hedge:** live-tap feel is **device-dependent**. Mitigations, in order: (a) **quantization is the
shock absorber** — taps snap to the grid, so replay is always musical even when the live monitor
lags; (b) the studio **pre-warms the AudioContext on the Start screen's first interaction** so the
engine wake is never paid by the child's first musical tap; (c) a **budget-device spike is a
required gate before any classroom pilot** (not before build).

## 5. The engine (specified to unit-test precision)

- **Cycle model:** K–2 Guided = **4 pulses** @ 100 BPM, half-pulse snap (8 subdivisions);
  3–5 = **8 pulses** (16 subdivisions). 6–8 is a documented future mode (§7).
- **Events:** integer subdivision indices, never float seconds — persistence is exact, drift
  impossible by construction.
- **Quantization as scaffold:** "gentle automatic alignment keeps taps musical" — nearest
  subdivision with cycle-boundary wrap; band-configurable strength; no unquantized mode in v1.
- **Layers:** Lead/Partner record independently; re-record replaces one layer; per-layer volume;
  layer independence is a tested invariant.
- **Scheduling:** the spike's lookahead pattern (25 ms pump, ~120 ms horizon, AudioContext clock).
- **Sounds:** *(founder constraint — supersedes the source's "curated sample" wording)* every sound
  is **synthesized** from WebAudio primitives — zero audio assets, zero licensing surface — and
  loudness-normalized. Eight sounds in four families (steps / hands / bells / air), each paired
  with a distinct motion + pulse-light + trail signature (§8 silent mode).
- **Sound spots:** exactly **two** (tunnel echo, puddle percussion) — environmental interaction
  without level-builder drift.

## 6. Creative Learning Spiral (exact UI moments, per source)

| Stage | Exact UI moment |
| --- | --- |
| **Imagine** | An icon-led prompt asks, "What will your duo sound like — bouncy, smooth, or surprising?" The child can preview **Together**, **Echo**, and **Space**. Pause/Mute and reduced-sensory controls appear **before Start**; then a gentle starter pulse prevents a blank canvas. |
| **Create** | Large icon pads with motion previews. Every tap immediately moves the performer, sounds its voice, and (while recording) lands on the repeating pulse. The Partner arrives for a second live overdub while the first continues. Either layer can be re-recorded independently. |
| **Play / experience** | **Watch the Take** hides the controls and performs the complete routine, with pulse lights and motion trails that make its structure readable without sound. The child can choose **Join In** to improvise over it or **Change a Layer** to loop back to Create. No result or grade appears. |
| **Share** | The child chooses a structured title **and a cover pose**, then shares to the group. Private autosaves stay `IN_PROGRESS`; the ready-to-share action sets `COMPLETE` (sharing unfinished work would be a separate intentional `SHARED` choice). The gallery card offers **Watch / Listen** and never autoplays. |
| **Reflect** | After the replay, the mascot asks exactly ONE context-aware wondering question ("Where did your performers answer each other?" / "Where did quiet make the next sound stand out?" / a first-used new sound). The only action is **Back to my studio**; reflection is never graded or published. |

Naming and reflection are deliberately separate moments. The current title stays visible in the
studio, saving updates the same creation (never copies), and leaving preserves the draft.

## 7. Banding and scaffolding

| | K–2 Guided | Grades 3–5 | Grades 6–8 Open *(future mode — documented, not built)* |
| --- | --- | --- | --- |
| **Supported start** | Four-pulse cycle, steady starter pulse, Lead on stage, two sounds, one tap input | Eight-pulse cycle, both performers, four sound families | Choice of cycle and meter; open two-performer studio |
| **Create controls** | Two 64px+ icon pads; no dragging, swiping, required reading, or precision timing | Four pads per performer; re-record, mute, balance layers | Live effects, meter changes, syncopation, layered ratio experiments |
| **Rhythm support** | Gentle automatic alignment; icon pulse ring; rests happen naturally | Optional subdivision overlay and call-and-response guides | Optional 2:3 / 3:4 views, swing, acoustic comparisons |
| **Examples** | Animated icon grooves: Together, Echo, Space | Call-and-response, steady/varied, long/short phrases | Polyrhythm, syncopation, texture |
| **Openness** | Constrained palette opens through exploration | Broad palette, free overdubbing | Full palette, adjustable sound properties |

**K–2 opening sequence (source-reconciled):** a soft four-pulse example establishes the floor. The
child uses one input — **tap** — on icon-first **Step** and **Clap** pads. A first phrase brings in
the **Partner** plus **Chime / Whoosh** with an animated announcement; a first layered phrase
reveals the **tunnel-echo sound spot** plus **Stomp / Twinkle** (~6 sounds within the first
session — the fast-pacing review flag). Optional prompts ("Can one friend answer the other?" /
"What happens if one pulse stays quiet?") are ignorable at zero cost. **Unlocks respond to making,
never accuracy.**

**Accessibility floor:** every sound has a distinct motion, icon, and pulse-light pattern. Core
creation works with one pointer or keyboard; no multitouch, dragging, holding, simultaneous
presses, or rapid tapping. Accessible names, visible focus, high contrast, lossless pause/restart.
Loudness normalized; master/layer volume and reduced-motion controls independent. Audio is curated
and nonverbal — **no microphone, camera, voice, motion capture, or biometric data**; prompts move
the **character**, never the child. All strings use localization keys (EN/ES authored from day one,
selected zh-CN, repo-standard fallbacks).

## 8. What the child walks away with

A named, replayable **audiovisual duet**: two live-recorded performer layers; the child's timing,
rests, overlaps, and call-and-response choices; curated movement/sound selections; a structured
title, chosen mood, and **cover pose**. Timing makes artifacts meaningfully different — a sparse
echo, a together-pattern, a dense tunnel texture. The gallery is read-only and group-scoped:
approved-token titles only, first-name-only labels, **Watch / Listen**, never autoplay — never a
full name, email, score, rank, play count, or public reaction count.

**Silent mode is first-class:** the replay must be watchable and expressive with audio off (muted
classroom tablets are a primary environment) — distinct motions, pulse lights, and trails carry the
structure. This gets its own QA pass.

## 9. What we measure

Creation and iteration only: new drafts and saved duets; live takes recorded and layers replaced;
return-to-edit after watching; distinct sound/movement families explored; explicit shares; partner
remixes if that later feature is approved. Do **not** measure or display accuracy, "correct"
rhythm, speed, time-to-finish, score, stars, completion, rankings, streaks, public reactions, or
child comparisons. The Creation record supports save/share counts; take/layer signals need later
instrumentation (game telemetry is not persisted — see #672). Retain aggregate creation events,
never a child-linked stream of raw tap timing; deleting a creation deletes its replay payload.

## 10. Working-name proposals (from source)

1. **Echo Avenue** — selected; communicates the place and the call-and-response mechanic.
2. Kinetic Chorus. 3. Soundwalk Studio.
Working proposals, not trademark clearance (see §2 boundary note).

## 11. Founder rulings + hardware additions (the delta layer)

Replacing the source's open questions Q1–Q7:

1. **Q1 collaboration:** solo overdub guaranteed; same-device duet later; **no online co-op**.
2. **Q2 peer remix:** deferred past first release (creator-opt-in + facilitator-disableable when it comes).
3. **Q3 scenery:** **two** curated sound spots.
4. **Q4 scoreless frame:** completion wiring mirrors Boost Track Builder (standard shell, flat
   participation score, zero verdict UI in-game); the set-wide creation-shaped-finish question is
   now tracked as **#693** (leads-level decision).
5. **Q5 grades 6–8:** documented future mode (§7 column); build K–2 Guided + 3–5 only.
6. **Q6 gallery encouragement:** follows the **existing** gallery pattern (adult-only curated
   encouragement, existing visible counter) — no Echo-specific fork.
7. **Q7 placement:** slot **`set3-game-3`** (slot 1 = Track Builder #691; slot 2 reserved for the
   machine game; Waterworks placement deferred per #692).

Hardware-test additions: the §4 hedge; AudioContext pre-warm on Start-screen first interaction
(tested); the `/dev/echo-spike` route stays through the build as the audio regression harness.
Sounds synthesized, not sampled (supersedes the source's wording, §5).
