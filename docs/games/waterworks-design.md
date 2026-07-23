# 都江堰水利工坊 · Waterworks — v2 standalone showcase (design doc)

> Status: **design — pending approval.** No game code is written yet.
> Placement: **standalone showcase** — one unlinked route (`/waterworks`), no auth, device-local
> persistence, zero backend. Set 3 candidacy (#676) is a *possible future placement*, decided later.
> Bar: `docs/design-principles.md`. Reviewed-prototype feedback from both pod leads is the
> requirements spec baked in below.

---

## 1. Concept + heritage framing

A child designs a river system on a sandbox grid using parts inspired by the real, still-working
**Dujiangyan waterworks** (都江堰, Chengdu, built ~256 BC under Li Bing): the **鱼嘴 Fish Mouth**
that splits the river, the **飞沙堰 Flying Sand Weir** that spills excess water safely away, and the
**宝瓶口 Bottle-Neck** that throttles flow so fields drink without drowning. The child lays channels,
places fields, runs the water, then storm-tests with Rain — and discovers *by doing* why each of Li
Bing's inventions exists: the flood comes first, the wisdom follows. **小石犀 (Shíxī)**, the little
stone rhino mascot (after the stone rhinos Li Bing set in the river), watches and *wonders* — never
grades. There is **no game-over**: a flood is feedback about the river, not failure of the child.

## 2. The sim, specified (unit-testable; numbers = prototype baseline)

Grid **14 × 9**. Fixed cells: **3 sources** (col 0, rows 3–5), **3 houses** at (r1,c10), (r7,c11),
(r8,c3). Cell water level ∈ **0..4**. Placeable parts: `channel 水渠`, `gate 水闸` (tap toggles
open/closed; erase removes), `fishmouth 鱼嘴`, `sandweir 飞沙堰`, `bottleneck 宝瓶口`, `field 农田`.
Conductors = source, channel, fishmouth, sandweir, bottleneck, open gate. A run = **16 ticks × 180 ms**.

Each tick (order matters):
1. **Source inflow:** every source's next level = **4**.
2. **Spread (max, not sum):** every cell with `water > 0` that can emit (not land/house/closed gate)
   offers `water − loss` to each orthogonal neighbor that can receive; a cell's next level is the
   **max** offer. `loss = 1` when either side is a field, else 0 (channels carry full strength).
   **鱼嘴 emits only N, S, E** (never back west) — so it *splits* the river when the child digs
   channels both above and below it.
3. **Rain (storm test, toggled):** conductors +1, fields +2, capped at 4.
4. **Part rules (after rain, so protectors keep protecting):** source pinned to 4;
   **宝瓶口 caps its cell at 2**; **飞沙堰 caps its cell at 1** and shows a 💦 drain animation when
   it sheds (incoming > 1); land/house/closed-gate pinned to 0.
5. **Commit + feedback:** field with `water ≥ 1` accrues `wTicks`, else resets;
   **watered = wTicks ≥ 2** (sustained flow, 🌱→🌾 green); **flooded = water ≥ 4** (🌊 dark blue).
   A **house floods visually** when any orthogonal neighbor holds water ≥ 4.
6. **Invariants (unit-tested):** the sim never halts, throws, or locks on flood; editing and Clear
   are always available after a run; water levels always clamp to 0..4.

## 3. Spiral mapping (every stage a concrete UI moment)

| Stage | Moment |
|---|---|
| **Imagine** | Title screen: Shíxī bobbing, "What will you build? 你想造什么？", pick a band. |
| **Create** | Tap a part, tap the land. Live hint bar describes the selected part. Starter channel already dug (Guided/3–5) — never a blank void for the young ones. |
| **Play** | **Let it flow! 放水啦！** runs 16 ticks of real water; **Rain 下雨** storm-tests. Floods darken fields/houses — feedback, not failure. |
| **Share** | Explicit **Save** → named build lands in **My Waterworks** (device-local gallery); Create (＋) card in the gallery starts a fresh river. |
| **Reflect** | After each run, **Shíxī asks ONE wondering question** from a context-aware pool (flood happened / clean run / a just-unlocked part was used / evergreen). **Separate beat from save/naming** — the run-end card carries no name input (fixes the prototype's conflation). |

## 4. Bands + scaffolding (the leads' spec, as requirements)

**Bands:** 🐣 **K–2 Guided** · 🌱 **3–5** · 🚀 **6–8 Open**.
- Guided + 3–5 open with a **starter channel** (row 4, cols 1–3). 6–8 opens blank (full ceiling).
- Guided palette starts **constrained: Channel + Field** (+ eraser). 3–5/6–8 get the full palette.
- 6–8 shows no goal banner (open build); Guided/3–5 show the band goal.

**Unlock ladder (Guided) — unlocks announce themselves, one celebratory beat each:**
| Trigger (progress, never punishment) | Unlocks | The announce |
|---|---|---|
| First field watered | **鱼嘴 Fish Mouth** | "You earned the Fish Mouth! 鱼嘴 — split your river two ways!" |
| 2+ fields watered in one run | **水闸 Gate** | "You earned the Gate! 水闸" |
| **First flood, however caused** (any field or house floods during any run — Rain not required) | **飞沙堰 Sand Weir** + **宝瓶口 Bottle-Neck** (two queued announces) | "The flood showed you why Li Bing built this! 飞沙堰" |

The flood-first-then-tools beat is deliberate: the child *feels the problem* before receiving the
2,300-year-old solution. **Reachability guarantee:** if no flood has occurred by the end of the
child's **3rd run**, Shíxī's run-end wondering question becomes a gentle storm invitation
("Your river has never seen a flood… want to try Rain? 🌧️") so every kid can reach the beat.
Each announce card includes **"Learn more"** → the part's heritage card (§7).

**Pattern book ("Show me ideas 📖"):** 3–4 browsable example river shapes (e.g. *The Split River*
两条河, *The Safe Farm* 平安农田, *The Storm-Proof Village* 防洪村) rendered as mini-thumbnails;
"Build from this" loads the shape (two-tap confirm protects current work). Possibility shown,
solution never dictated; extends How-to-Play. Every pattern is validated by test to water ≥1 field.

**Soft targets (dismissible chips, never requirements):**
- 🐣 water 1 field → water 2 fields → try Rain and keep every field green
- 🌱 water 3 fields using a 鱼嘴 → survive Rain with zero floods → keep every house dry in Rain
- 🚀 water every field with the fewest parts · design a river where Rain changes nothing

**Tutorial arrows:** first Guided visit only — two low-opacity animated arrows (palette → land;
→ Let it flow!). Dismissed forever after first placement + first run (stored in `waterworks:seen`).

## 5. Save model (specified up front; fixes the leads' bug findings)

- **Explicit Save saves the CURRENT build in place** — each build has a stable local id; saving
  again overwrites that entry (rename allowed, **never forks a new copy** — the prototype forked on
  every save; v2 must not).
- **Autosave on navigate-away** (to Levels, to gallery, or leaving the route) — nothing is lost,
  including the mid-edit unnamed river.
- **Duplicate-name guard:** auto-suffix ("小河" → "小河 2"), never a blocking error.
- **The current build's title is always visible** in the build top bar — "New River / 新河" until named.
- **Storage:** `localStorage` under namespaced keys — `waterworks:gallery:v1` (saved builds:
  `{id, name, band, cells, savedAt}`), `waterworks:draft:v1` (current build + band + unlock
  progress), `waterworks:seen:v1` (tutorial/help flags). **Corrupt-entry resilience:** every read
  is wrapped; an unparseable entry is skipped (never crashes the page); quota errors degrade to
  in-memory with a gentle "saving is off on this device" note. All unit-tested.
- Band switch mid-build **autosaves first**, then loads that band's fresh starter (state isolated).

## 6. Layout (the leads' notes)

- **Top corner (grouped):** My Waterworks · Levels · ❓ How-to-Play — navigation lives together.
- **Build-action row (under the grid):** Let it flow! · Rain · Clear — doing lives together.
- **Gallery:** a **Create (＋)** card first in the grid, so starting fresh never routes through
  Levels; tapping a saved river reopens it faithfully (parts + gate states, water reset).

## 7. Heritage cards — "Learn more about 鱼嘴!"

One tap-open card per real invention (鱼嘴 / 飞沙堰 / 宝瓶口), reachable from the unlock announce
and from the How-to-Play legend. Each card, in child language: **What it is** (the real thing at
Dujiangyan) · **What Li Bing built** (one sentence of history) · **What it does in YOUR river**
(the sim rule in kid words). Written best-effort in EN/ES/zh-CN.
> ⚠️ **Heritage/native review gate:** all three languages of heritage content are best-effort and
> **explicitly pending native-speaker and cultural review before any public promotion** (the Phase D
> zh-CN checklist is the review vehicle).

## 8. Page shell (cold-open presentable)

Standalone route **`/waterworks`** — registered beside `/try` (the existing public, no-auth route
pattern, `src/App.tsx:130`), **linked from nothing** (direct URL is the access gate). Header lockup:
🦏 **都江堰水利工坊 · Waterworks** + one-line credit *"Inspired by the 2,300-year-old Dujiangyan waterworks
of Chengdu · 灵感来自成都两千三百年历史的都江堰"* + the app's standard `LanguageToggle`. No login, no
PII; everything on-device. Page sets `document.documentElement.lang` to follow the language toggle
(the global `changeLanguage()` doesn't do this today — page-scoped effect here; a global fix is a
separate follow-up), and the page root carries a Chinese-capable system font stack
(`"PingFang SC", "Microsoft YaHei", "Noto Sans SC"` fallbacks — no external font fetch).

## 9. Principles checklist + open questions

| Principle | Verdict |
|---|---|
| Spiral is the spine | ✅ §3 — all five stages, Reflect separated from Share |
| Creators, not consumers | ✅ the river is theirs; gallery holds *their* works |
| Low floor / high ceiling / wide walls | ✅ starter channel + constrained palette + announced unlocks + pattern book (floor); 6–8 blank canvas + efficiency targets (ceiling); any river is valid (walls) |
| Playground, not playpen | ✅ floods are information; Rain invites safe mischief; Shíxī wonders, never corrects |
| Measure creation, not completion | ✅ no scores/stars/leaderboards at all in v1 — builds, runs, and saves are the artifacts |
| Adult is a guide | ✅ no grading surface exists |
| Screen use, not screen time | ✅ build–test–revise loop |
| Localizable from day one | ✅ EN/ES/zh-CN real (zh first-class), vi placeholder; all via shared locale files + `t()` |

**Decisions (approved 2026-07-09):**
1. **Unlock ladder approved, amended:** the 飞沙堰+宝瓶口 unlock triggers on the **first flood
   however caused** (not Rain specifically); if no flood by ~run 3, Shíxī gently invites the storm —
   the beat must be reachable by every kid (§4).
2. **Reflect/Save fully separated:** run-end card is the wondering question only; **no save-nag**
   (autosave covers safety).
3. **Houses:** fixed, all bands — protect-the-village is the authentic stake.
4. **No gallery delete in v1** (see fast-follows).
5. **No sound in v1** (see fast-follows).
6. zh-CN native/heritage review happens before any external share — acknowledged in §7.

**Named fast-follows (not in v1):**
- **Gallery delete (pre-classroom REQUIREMENT):** long-press/⋯ delete with a kid-safe confirm must
  ship **before classroom use** — shared devices will accumulate rivers. v1's quota-degradation path
  (graceful in-memory fallback, unit-tested) is the stopgap.
- **Water audio (delight):** gentle flowing-water / rain sound with a mute toggle.
- **Placeable houses (future-only):** kid-placed villages; deliberately out of scope for v1.
- **Global `document.documentElement.lang` fix in `changeLanguage()`** (app-wide; this page ships a
  page-scoped effect).

---
*Build order after approval: Phase B (sim engine + storage, unit-tested; components) → C (route,
locale keys, lang/font) → D (verify + round-trip + zh-CN review checklist) → E (PR, labels, leads).*
