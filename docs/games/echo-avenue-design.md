# Echo Avenue — live two-performer sound-and-motion studio (design doc)

> Status: **approved design, build in progress.** Externally designed, founder-reviewed; this file is
> the repo transcription of that design with the founder-review rulings applied. Lands against #676
> (Set 3 "Mastery"), slot **`set3-game-3`**. Bar: `docs/design-principles.md`.
> Provenance: inspired by classic side-scrolling two-player cooperation patterns (see the
> transformation table, §2). All characters, sounds, names, and art are original.

## 1. Concept (one paragraph)

The child taps large action pads; each tap makes one of two original performers **move and sound at
the same instant** — step, clap, turn, bounce, chime, whoosh. Taps record into a repeating pulse
loop: the Lead's take loops while the child overdubs the Partner, creating call-and-response,
overlaps, and rests. Replay ("Watch the Take"), revise a layer, name it from structured tokens,
share the audiovisual duet to the group gallery. **No scores, stars, timers, verdicts, win/lose, or
correct rhythms anywhere.** Creation and feedback are simultaneous — a live instrument, not a batch
simulation.

## 2. Transformation table (classic pattern → Echo Avenue)

| Classic two-player side-scroller pattern | Echo Avenue |
|---|---|
| Two characters advance through a level | Two performers hold a stage; **the loop advances, not a level** |
| Timing judged: mistimed input = failure | **No judgment**: every tap lands (quantized); a "miss" cannot exist |
| Players compete or race | Lead and Partner **cooperate by construction** — the child is both |
| Progress = distance/score | Progress = **a made thing** (the duet) that persists and is shared |
| Sound reacts to gameplay | **Sound IS the gameplay**; motion and sound are one gesture |
| Levels authored by designers | The **phrase is authored by the child**; two curated sound spots are the only stagecraft |

## 3. Spike verdict + the hardware-sensitivity hedge (REQUIRED reading)

The Phase 1 latency spike (`/dev/echo-spike`, kept in-tree as the **audio regression harness** for
the whole build) passed on founder hardware: **est. audible ≈13 ms** (+ ~30–45 ms touch input),
**feels live**; loop ran with **0 underruns**, worst pump gap 34 ms.

**Hedge:** live-tap feel is **device-dependent** (Bluetooth audio, cheap Android tablets, and
throttled browsers can add 100 ms+). Mitigations, in order: (a) **quantization is the shock
absorber** — taps snap to the grid, so replay is always musical even when the live monitor lags;
(b) the studio **pre-warms the AudioContext on the Start screen's first interaction** so the engine
wake (~1 s) is never paid by the child's first musical tap; (c) a **budget-device spike is a
required gate before any classroom pilot** (not before build). If budget hardware fails the feel
test, the K–2 mode leans further into quantized playback-first interaction.

## 4. The engine (specified to unit-test precision)

- **Cycle model:** K–2 Guided = **4 pulses** @ 100 BPM (0.6 s/pulse), snap grid = **half-pulse**
  (8 subdivisions/cycle); 3–5 = **8 pulses**, half-pulse snap (16 subdivisions). Grades 6–8 is a
  **documented future mode** (finer grids, swing, longer cycles) — designed, not built in v1.
- **Events:** `{ t: subdivision index (integer), soundId, performer: "lead" | "partner" }` — integer
  grid positions, never float seconds, so persistence is exact and drift-impossible.
- **Quantization as scaffold:** raw tap time → nearest subdivision, **wrapping at the cycle
  boundary** (a tap a hair before the loop point lands on beat 1, not beat 9). Strength is
  band-configurable. There is no unquantized mode in v1.
- **Layers:** Lead and Partner record independently; re-record replaces one layer only; mute per
  layer; layer independence is a tested invariant.
- **Scheduling:** the spike's lookahead pattern (25 ms pump, ~120 ms horizon, all events scheduled
  on the AudioContext clock). Pure scheduling math (`pulsesToSchedule`, `eventTime`) is
  unit-tested against a mocked clock.
- **Synth voices:** every sound is a WebAudio node graph — **zero audio assets, zero licensing
  surface**. Eight sounds in four families (steps / hands / bells / air), loudness-normalized.
  Every sound is paired with a **motion + pulse-light + trail signature** (see §7, silent mode).
- **Sound spots:** exactly **two** curated stage spots (tunnel echo, puddle percussion) that color a
  performer's sound while passing — deliberately capped at two to resist level-builder drift.

## 5. Bands, unlock ladder (fast pacing — a founder-review flag), targets

| Band | Cycle | Palette at start | Ladder |
|---|---|---|---|
| 🐣 K–2 Guided | 4 pulses | **2 sounds** (step + chime), Lead only | First recorded phrase → **Partner + clap + whoosh** (announced). First layered phrase → **a sound spot + stomp + twinkle** (announced). **~6 sounds within the first session.** |
| 🌱 3–5 | 8 pulses | all 8 sounds, both performers | Sound spots announced on first layered phrase |
| 🚀 6–8 | future mode (documented, not built) | — | — |

Unlocks respond to **making** (phrases recorded, layers made) — never to accuracy, and prompts are
ignorable at zero cost (tested: ignoring every suggestion still unlocks everything by making).
Soft targets are dismissible wonderings ("what would a rest sound like?"), never requirements.

## 6. Founder-review rulings (all applied)

1. **Solo overdub guaranteed** (one child is both performers); same-device duet later; **no online co-op**.
2. **Peer remix deferred** past first release.
3. **Two** curated sound spots, no more.
4. **Completion wiring mirrors Boost Track Builder exactly** — standard `GameShell`/`completeActivity`,
   flat participation-shaped `score/total`, **zero verdict UI in-game**. No new completion policy.
5. **6–8 is documented future intent** (this table), not built.
6. Gallery follows the existing creation-gallery pattern (group-scoped, read-only, **never
   autoplay**, first-name-only).
7. Slot **`set3-game-3`** (slot 2 stays reserved for the machine game in design).
8. **K–2 unlock pacing opens the palette fast** (§5) — review flag honored.
9. **Silent-mode is first-class** (§7) — review flag honored.
10. **AudioContext pre-warms on the Start screen's first interaction** — the engine wake is never
    paid by the child's first musical tap (tested in Phase 4).
11. The **spike route stays** through the build as the audio regression harness.

## 7. Silent mode is first-class (not fallback)

Muted classroom tablets are a primary environment. Every sound has a **distinct motion + pulse-light
+ trail signature** (step = stride + ground ripple; clap = arm snap + white flash; chime = spin +
rising sparkle; whoosh = glide + streak; …), and Watch-the-Take must be **watchable and expressive
with audio off** — the duet's structure (call-and-response, overlap, rest) must read visually.
This gets its own QA pass in Phase 6 and its own manual-QA step.

## 8. Persistence, safety, accessibility

- **`Creation` type `"sound_duet"`** (zero schema changes): `{ v, name, band, pulses, layers:
  { lead: Event[], partner: Event[] }, spots }` — strict-parsed with zod `.strict()` at every level
  (#668 divergence cited in code), validity guard (≥1 event, events in bounds, sound ids in the
  allowlist, per-layer event caps, payload-size cap).
- **Kid-safety:** titles from approved localized token pools only (no free text); no mic, no camera,
  no recording of the child — taps move the character, never capture the kid; no autoplay anywhere.
- **Accessibility floor (testable subset):** one-pointer operation; keyboard operable with visible
  focus; **≥64 px action pads**, ≥44 px everything else; `touch-action: manipulation`; no
  multitouch/drag/hold; `prefers-reduced-motion` guard on all animation; master + per-layer volume;
  loudness-normalized synthesis.
- **i18n:** every string keyed in the shared locale files; EN + ES real; zh-CN on selected surfaces
  (title tokens, mascot lines); vi placeholder. **Title-token pools are localized per language**
  (curated per-locale word pools), not word-by-word translations.

## 9. Spiral mapping

| Stage | Moment |
|---|---|
| **Imagine** | Mood previews (Together / Echo / Space) on the title screen; pause/mute + reduced-sensory controls surfaced **before** Start; a starter pulse so the canvas is never blank |
| **Create** | Tap pads — the performer moves and sounds NOW; record a Lead take, overdub the Partner |
| **Play** | The loop **is** playback — creation and feedback are simultaneous; Watch-the-Take replays the duet full-stage |
| **Share** | Token-based naming → save-in-place → group gallery (cover pose card, Watch/Listen, no autoplay) |
| **Reflect** | Mascot asks ONE context-aware wondering question (call-and-response heard / rests used / a new sound first used) — a separate moment from naming |

## 10. Measure creation, not completion

Iteration signals only: takes recorded, layers replaced, return-to-edit, sound families explored,
shares. **No scores, stars, timers, verdicts, streaks, or leaderboards.** The completion payload is
participation-shaped (mirrors Track Builder) and drives XP only; nothing in-game displays it.
