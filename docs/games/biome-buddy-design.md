# Biome Buddy — build-a-creature organism lab (refined design doc)

> Status: **reviewable prototype landed (v1 loop + backend-free share)** — see §13. Everything before §13 is the refined design this prototype was built from; where the prototype deliberately stops short of the design (v2/v3 backend sections), §13 says so.
> Working title: **Biome Buddy** (placeholder — matches the "Bounce & Buds / Buddy Garden" naming family; rename freely).
> Bar: `docs/design-principles.md` (including principle 9, the Safe Exploration Contract). Precedents: `docs/games/waterworks-design.md` (standalone showcase, pure sim, device-local storage) and `docs/games/set3-track-maker-design.md` (creation-type game with backend gallery).
> Persistence target: a `Creation` (`type: "biome_buddy"`) once graduated from the standalone prototype.

---

## 0. What changed from the draft, and why (repo-driven refinements)

| Draft item                                                                                    | Refinement                                                                                                                                                                                                                                                                                                                                                            | Repo driver                                                                                                                   |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| "traits.json + game.js"                                                                       | One **pure TypeScript model** (`biomeBuddyModel.ts`): typed const data + pure lookup functions, unit-tested without React                                                                                                                                                                                                                                             | Repo is TypeScript strict (`rules/00-core.md`); Waterworks proves the pattern (`waterworksSim.ts` — pure, 100% unit-testable) |
| Five screens: Choose / Create / Test / Learn / Revise                                         | Mapped onto the **Creative Learning Spiral** (Imagine → Create → Play → Share → Reflect); **Test + Learn merged**; a **Share/Name beat added** — the spiral requires it and the draft omitted it                                                                                                                                                                      | `docs/design-principles.md §1` — an activity without Share is incomplete; Waterworks §3 shows the mapping style               |
| "This is NOT right or wrong"                                                                  | Kept, and strengthened into the repo's house invariant: **feedback, never failure** — stat changes are information about fit, the mascot voice is _curious, never corrective_                                                                                                                                                                                         | `design-principles.md §4` "playground, not playpen"; Waterworks' "flood is feedback" invariant                                |
| "7 pickers but 'five traits'" (Sight, Hearing, Smell, Touch, Movement, Covering, Pattern = 7) | **v1 = five stat-driving pickers** (Eyes, Ears, Nose & Breathing, Movement, Body Covering) + **Pattern as a sixth, identity-only picker** (science card, no stat effect in v1). **Touch (pads / antennae / whiskers) is deferred to v2** with a possible fifth stat                                                                                                   | Draft self-conflicts; K–2 bar says fewer, larger choices (`rules/00-core.md`)                                                 |
| "must follow the existing theme… color scheme, font, emojis, layout, React framework"         | Concrete tokens named: `brightboost.{navy,blue,lightblue,yellow,green}` from `tailwind.config.ts`, `Baloo 2` kid-page font stack (Waterworks precedent — no font file is fetched; the stack falls back), existing `animate-pop` keyframes. ⚠️ **`brightboost-yellow` is `#FF9C81` (coral)** — the draft's "yellow [select] button" uses the token, not literal yellow | `tailwind.config.ts`; `src/pages/Waterworks.tsx` font stack                                                                   |
| "do not hardcode english keys"                                                                | Formalized per `rules/20-i18n.md`: every UI string is a `useTranslation()` key; copy lands in `en.json` **and** `es.json`; science content ships as localized data objects (`{ en, es }` maps, the Track Maker name-kit pattern)                                                                                                                                      | `rules/20-i18n.md`                                                                                                            |
| Free-text organism name                                                                       | **Name-kit** (structured pick-a-part naming, stored as ids) — no kid free text ever reaches a shared surface, so there is nothing to moderate                                                                                                                                                                                                                         | `race_track`'s schema-bounded name kit (`backend/src/services/raceTrack.ts`)                                                  |
| Storage: "matrix… lookup table"                                                               | Kept and typed. Stat = clamped sum of per-category contributions + biome modifiers (spec in §5). Matrix lives as data; one generic reader                                                                                                                                                                                                                             | Matches `gradeBandContent.ts` / data-driven game patterns                                                                     |
| No persistence plan                                                                           | **v1: device-local only** (Waterworks isolation contract — unlinked route, zero backend, `biomebuddy:*` localStorage keys, resilience contract). **v2: graduates to the existing `Creation` API**                                                                                                                                                                     | Waterworks storage contract; Track Maker's `POST /creations` → `PATCH` save-in-place flow                                     |
| — (new ask)                                                                                   | **§8 Companion**: a COMPLETE organism can become the kid's on-platform buddy, rendered as a deterministic layered SVG                                                                                                                                                                                                                                                 | `User.avatarUrl` / `BrightBoostRobot` / Shíxī-mascot precedents                                                               |
| — (new ask, 2026-09-02)                                                                       | **§12 Shareable Buddy snapshot**: a backend-free share link that carries only the closed-enum recipe; the recipient's app recomputes stats, name and sprite; "Make my own version" remixes a copy                                                                                                                                                                     | Reviewer access without accounts; first remix/provenance behaviour without persistence                                        |

Also fixed in this doc: the Air biome is fleshed out, the incomplete trait lists are filled with real biology, and "Antannea" → **antennae**.

---

## 1. Concept (one paragraph)

A child picks one of four biomes — **Earth 🌱, Water 💧, Fire 🔥 (desert/volcanic), Air 🌬️** — then builds an organism from **real, never-fictional** anatomical options: what kind of eyes, ears, nose/breathing, movement parts, and body covering it has. Four stat bars — **Sight 👁, Hearing 👂, Smell 👃, Agility 💨** — recompute live as parts change, because every part works differently in every biome (gills are amazing in a pond and useless in a desert). After a build, a **Test & Learn** walkthrough explains _why_ each bar moved, one bar at a time, in kid-sized sentences with the real science underneath. The child names their creature from a name-kit, saves it, revises it, and — once shared — can adopt it as their **Buddy**: a little companion that lives on their dashboard. The loop is _predict → build → test → understand → tweak → share_. There is no winning build and no failing build — only fit.

---

## 2. Spiral mapping — the five-screen workflow, refined

Per `design-principles.md §1`. The draft's five screens map cleanly; changes are marked **Δ**.

| Spiral      | Screen (draft name)                   | Concrete UI moment                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Imagine** | **1 · Choose**                        | Level picker + "My Buddies" gallery on the title. Progress dots across the top. Four large biome chips (K–2 direct taps) plus side arrows over a preview panel: original SVG biome scene behind a rounded white/70 card with a four-sentence kid-level description (temperature, animals, plants, sights) and "who lives here". A `brightboost-yellow` **Select** button with `animate-pop` advances. |
| **Create**  | **2 · Create**                        | Trait pickers as large icon+emoji option chips (K–2 targets), grouped by category; tapping any chip selects it AND pops its **science card** (§4). The four stat bars sit beside the Buddy in its home and animate on every change (**Δ live update**: instant feedback is the whole lesson; **Test it!** then advances to Test & Learn).                                                             |
| **Play**    | **3+4 · Test & Learn** (**Δ merged**) | Popup over a scene of the organism sprite in its biome. Page 1: all four bars, before→after. Arrow through one card per **changed** bar: what moved, _why_ in this biome (one kid sentence per changed part + expandable "Tell me more"), and a **wondering nudge**, never an instruction. **Got it!**                                                                                                |
| **Share**   | **Δ new · Name & Save**               | Name-kit (word + creature-word chips → "Swift Finfox" / "Aletazorro Veloz"), **Save** upserts in place (stable id — renaming never forks a copy), **Share my Buddy** (§12). v2 adds **Share to gallery** (`Creation.status`).                                                                                                                                                                         |
| **Reflect** | **5 · Revise**                        | Returns to Create with the previous advice tucked into a small **💡 Last test** chip that reopens the last Test & Learn walkthrough (read-only, no side effects). "Make my own version" from a shared Buddy loops back to Create with a COPY (§12).                                                                                                                                                   |

Grade bands, per the low-floor/high-ceiling rule and Waterworks §4: 🐣 **K–2 Guided** starts with two categories unlocked (Eyes + Movement) and unlocks the rest one **tested change** at a time (Ears → Nose & Breathing → Body Covering → Color & Pattern); 🌱 **3–5** and 🚀 **6–8** open with the full palette. The unlock counter measures iteration (design principle 5), never stat values — there is nothing to "get right".

---

## 3. Biomes

Stored as `Biome = "earth" | "water" | "fire" | "air"` (snake_case ids, English keys never shown raw — all labels via localized content).

| Biome        | Environment (preview copy source)                                                                                                                     | Reference fauna                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 🌱 **Earth** | Forest floor, jungle, rocky terrain; damp shade, leaf litter, tangled roots                                                                           | Insects, beetles, foxes, deer, snakes, tree frogs           |
| 💧 **Water** | Pond, wetland, swamp, ocean shallows; murky or clear water, currents                                                                                  | Fish, otters, ducks, axolotls, crabs                        |
| 🔥 **Fire**  | Hot & dry: desert dunes and volcanic rock; scarce water, extreme day/night swings (subtitle: "Desert & volcano" keeps the four-elements theme honest) | Camels, fennec foxes, sidewinders, thorny devils, scorpions |
| 🌬️ **Air**   | Windy cliff faces and high forest canopy; strong gusts, long sightlines, thin cool air, few places to hide                                            | Hawks, bats, gliding squirrels, dragonflies, mountain goats |

---

## 4. Trait catalog (filled in, real biology only)

Every option carries a **science card** with the draft's required seven parts: formal/scientific term · what it is · what it's used for · how it evolved · which animals usually have it · where in the world · what other body systems it affects — plus a "Tell me more" paragraph. Copy is **layered for the K–2 bar**: one digestible kid sentence per part up front, formal term in parentheses, and the deeper paragraph behind "Tell me more".

**v1 — five stat-driving categories** (each also allows a "none" option where that is itself a real adaptation):

| Category                | Options (formal term)                                                                                                                                                | Example science hook                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 👁 **Eyes**             | No eyes (troglobite — cave salamander) · Swivel eyes (independently rotating — chameleon) · Wide-set 360° prey eyes (rabbit, woodcock) · Compound eyes (dragonfly)   | Compound eyes see motion superbly but blur detail — great in open air, weaker in murky water |
| 👂 **Ears**             | Hidden ear holes (no pinna — birds, lizards) · Big ear flaps (**pinna** — fennec fox) · Jaw hearing (bone conduction — snakes) · Skin eardrum (**tympanum** — frogs) | Big pinnae funnel faint sounds _and_ dump desert heat — one part, two jobs                   |
| 👃 **Nose & Breathing** | Gills (**branchiae**) · Nose + lungs · Forked tongue + **Jacobson's organ** · **Spiracles** (insects breathe through side ports)                                     | Gills only work wet — the biome dependency lesson in one part                                |
| 💨 **Movement**         | Wings (powered flight) · Fins · Webbed feet · Claws (climbing/digging) · Padded paws                                                                                 | Webbed feet: brilliant paddles, clumsy on hot sand                                           |
| 🛡 **Body Covering**    | Short fur (**pelage**) · Long fur · Smooth scales · Keeled/rough scales · Hard shell (**scutes**) · Feathers (**plumage**)                                           | A shell is armor but costs agility everywhere — trade-offs, not right answers                |

**Sixth picker — Color & Pattern (identity-only in v1, no stat effect):** stripes (disruptive coloration) · spots · **countershading** · bright warning colors (**aposematism**) · plain camouflage (cryptic coloration). Each still gets a full science card; a future "Hiding" stat can activate this matrix without UI change.

**Deferred to v2 — Touch** (pads · antennae · whiskers/**vibrissae**), potentially with a fifth stat. _Team decision to confirm: 5+1 pickers in v1 as specced here, or fold Touch in at the cost of K–2 screen density._ The prototype ships 5+1.

---

## 5. Stats engine and data model

Four stats, each 0–100, clamped for the HUD: **sight, hearing, smell, agility**. Each stat's primary driver is one category (eyes→sight, ears→hearing, nose→smell, movement→agility); body covering and a few sensory options add secondary effects.

```ts
// src/components/biomeBuddy/biomeBuddyModel.ts — pure data + pure logic, no React
export const BIOMES = ["earth", "water", "fire", "air"] as const;
export const STATS = ["sight", "hearing", "smell", "agility"] as const;

export interface TraitOption {
  emoji: string;
  base: Partial<StatBlock>; // biome-independent contribution
  biomeMod: Record<Biome, Partial<StatBlock>>; // every biome present
}

// Example rows (the full matrix lives in the model file as typed const)
// nose.gills:          base { smell: 50 }
//   biomeMod water { smell:+25, agility:+5 } · fire { smell:-40, agility:-20 } · …
// covering.hard_shell: base { agility: -15 }
//   biomeMod earth { agility:-10 } · water { -15 } · fire { -5 } · air { -20 }

export function statValue(biome, traits, stat) {
  /* clamped sum over categories */
}
```

Authoring rules, unit-tested as invariants (`__tests__/biomeBuddyModel.test.ts`, exhaustive over all 7 680 selection × biome combinations):

1. Every option defines a mod for **all four biomes**.
2. Every stat clamps to 0–100 for every possible selection × biome.
3. **No selection maxes all four bars in any biome** (the test also pins "no more than two at 100") — trade-offs are the curriculum; the test stops future data edits from creating a "correct answer".
4. Every `(option, biome)` pair with a nonzero mod has an en+es **why-line** (and no why-line exists for a zero mod) — this is what Test & Learn reads.
5. Closed-enum recipe validation rejects unknown values **and unknown fields** at every level.
6. Same recipe → same stats (pure). 7. Same recipe → same sprite (§8).

---

## 6. UI spec deltas worth calling out

Kept from the draft as written: progress dots; the biome preview card composition (background scene, white overlay, four-sentence description, side arrows); Select/Test/Got it!/Save button placements; bars beside the Buddy with number + word band; Revise's non-intrusive advice chip.

Refinements: buttons are Tailwind-styled with `brightboost` tokens (Waterworks precedent, no shadcn dependency inside the game); bars are a small `StatBars` component (`role="meter"`, number, word band, ▲/▼ delta text — meaning never depends on color alone); biome backgrounds are original SVG scenes (no stock/licensed art), reduced-motion-safe; every interactive target is ≥44px with 56px primaries; science cards dock as a bottom sheet on phones so the bars stay visible; emoji usage follows house style (🌱💧🔥🌬️👁👂👃💨).

---

## 7. i18n plan (rule `20-i18n.md`)

UI copy under `biomeBuddy.*` in `src/locales/{en,es}/common.json` (116 keys each, shape-checked). Science-card content, why-lines, biome descriptions and name-kit labels are data-shaped, so they live as `{ en, es }` objects in `biomeBuddyContent.ts` read through a page-local locale hook (`useBuddyLocale`) — not scattered UI keys. Name-kit titles are stored as **ids** and rendered per language with locale word order (`{adjective} {noun}` / `{noun} {adjective}`).

`vi` / `zh-CN`: the page-scoped `LanguageToggle` offers only the locales the game is complete in (en, es), so no child-visible surface mixes languages. Adding a locale = translating the content tables + the 116 keys, then adding it to `BIOME_BUDDY_LOCALES`; heritage/native review per design principle 8.

---

## 8. Companion — the organism as the kid's on-platform helper (v3)

Once a creature reaches `COMPLETE`, a **"Make this my Buddy!"** button lets the kid adopt it. The Buddy then appears across the student experience (dashboard header, game-shell corner) with a wondering prompt pool — curious, never corrective. **How it renders — no images, no uploads:** `BuddySprite.tsx`, a **deterministic layered SVG** assembled from the closed-enum recipe (ring → limbs behind → body by covering → pattern overlay clipped to the body → covering detail → feet → head → ears → eyes → nose → biome accent). Same recipe = same sprite everywhere: Create scene, Test & Learn, gallery cards, share page, companion. Sizes `sm|md|lg`. Because every layer comes from a closed allowlist, the sprite is child-safe by construction. Landed in the prototype; the dashboard placement is v3.

---

## 9. Architecture (as landed)

```
src/components/biomeBuddy/
  biomeBuddyModel.ts       # pure: enums, trait matrix, stats, diff, bands/unlocks, recipe validation
  biomeBuddyContent.ts     # localized data: labels, science cards, why-lines, biomes, name kit, wonder pool
  biomeBuddyShare.ts       # pure: share payload codec (base64url JSON, strict), URL helpers
  biomeBuddyStorage.ts     # device-local gallery / draft / progress under biomebuddy:*:v1 (resilient)
  BuddySprite.tsx          # deterministic layered SVG (sm|md|lg, decorative or labelled)
  BiomeScene.tsx           # original SVG biome backdrops
  StatBars.tsx             # accessible meters with number + word band + delta text
  Overlay.tsx              # focus-managed dialog (trap, Escape, focus return, bottom sheet)
  ScienceCard.tsx          # option science popup (+ "Tell me more")
  ShareButton.tsx          # Web Share API → clipboard fallback → manual field; live-region status
  ProgressDots.tsx         # Choose · Create · Test · Name
  useBuddyLocale.ts        # page-local {en,es} picker driven by react-i18next
  screens/{Title,Choose,Create,TestLearn,Name}Screen.tsx
  BiomeBuddyGame.tsx       # the loop; remix seeding; Guided unlock ladder
  biomeBuddy.css           # page-scoped styles + reduced-motion
  __tests__/               # model invariants (exhaustive), share tampering, storage corruption,
                           # sprite determinism, game loop, responsive contracts
src/pages/BiomeBuddy.tsx        # /biome-buddy (shell, lang mirroring, #r= remix intake)
src/pages/BiomeBuddyShare.tsx   # /biome-buddy/share (presentation, remix/new actions, invalid state)
src/pages/BiomeBuddyReview.tsx  # /biome-buddy/review (reviewer intro → real experience)
src/locales/{en,es}/common.json # biomeBuddy.* keys
docs/games/biome-buddy-design.md
```

v2+ additions: `gameRegistry.ts` key `biome_buddy`; gallery thumbnails in `GroupGallery.tsx` via `BuddySprite`; the backend pieces below.

---

## 10. Backend — technical needs and upgrades (v2/v3, NOT in the prototype)

**No new infrastructure.** Everything rides the existing Express + Prisma + PostgreSQL (Railway + Supabase) stack. The work, in dependency order:

1. **Creation type registration** — `backend/src/services/creationContent.ts`: add `"biome_buddy"` to `CREATION_TYPES`; `validateBiomeBuddy` in a new `backend/src/services/biomeBuddy.ts`. Zod, `.strict()` at every level (mirror `validateRecipe`), version field, `.max()` bounds (rule `40-security.md`). Add the case to `deriveCreationTitle` (render from name-kit ids).
2. **Gallery serialization** — extend `creationContentSerializer.ts` for the recipe; add `"biome_buddy"` to `GALLERY_CONTENT_TYPES` in `backend/src/routes/creations.ts`.
3. **Shared trait constants** — the id enums must match between the frontend model and the backend validator; lift the id lists into `shared/` so they can't drift.
4. **Companion schema change** — root `prisma/schema.prisma` (authoritative) **and** `backend/prisma/schema.prisma` kept in sync (rule `30-database.md`): `User.companionCreationId String?` + relation `onDelete: SetNull` + index. The **#646** baseline landed on 2026-07-06 and both migration trees hold the same migrations (rules/30-database.md, #789/#828) — add a normal migration to both trees; never `db push` against non-local databases.
5. **Companion endpoint** — extend `profile.ts`: `PUT /api/profile/companion { creationId }` — `requireAuth` + student role; verify author via `req.user` (never a body-supplied id), `type === "biome_buddy"`, `status === "COMPLETE"`; explicit Prisma `select`.
6. **Tests (Red-Green, rule `10-testing.md`)** — validator rejects a 4-trait payload, an out-of-enum option, an unknown key; companion route rejects another author's creation and a non-COMPLETE creation; serializer round-trips the recipe.
7. **Explicitly not needed:** image storage/CDN (sprites are client-derived SVG), moderation pipeline (no free text by construction), new auth surface. Optional later: an XP event on first COMPLETE — `design-principles.md §5` says measure creation, not completion, so v1 skips it deliberately.

---

## 11. Rollout

**v1 · Standalone reviewable prototype (landed — §13):** unlinked, auth-free routes with the full loop, pure model + invariant tests, deterministic sprite, device-local gallery, backend-free share + remix, en + es.

**v2 · Platform graduation:** creation type + validator + serializer (§10.1–3), Track-Maker-style save/share flow, gallery thumbnails, `gameRegistry` entry, grade-band scaffolding polish, Touch category decision.

**v3 · Companion + community:** schema change + companion endpoint (§10.4–5), dashboard/game-shell Buddy with wondering prompts, teacher gallery visibility, remix-a-classmate's-creature loop with server-side lineage.

---

## 12. Shareable Buddy snapshot (backend-free, landed)

```
/biome-buddy/share#r=<base64url(JSON)>
JSON = { v: 1, b: <biome>, t: [eyes, ears, nose, movement, covering], p: <pattern>, n: [adjective, noun] }
```

- **Fragment, not query**: the payload never reaches a server, log, or analytics beacon.
- **Payload = recipe only**: schema version + closed-enum ids. Never stats, names as text, or any identifier of a person, device, group, session, or account.
- **On load**: length cap (400 chars) → base64url charset check → JSON parse → strict wire shape (exactly `v,b,t,p,n`; five string trait ids; two string name ids) → `validateRecipe` (every enum, no unknown fields) → recompute stats / name / sprite from trusted model data. A tampered `stats` field is **rejected**, not ignored.
- **Malformed** → friendly "this link got scrambled" state with a way back. Never a crash.
- **Same link, any language**: labels render from ids in the recipient's active language.
- **Make my own version** → `/biome-buddy#r=<same payload>` seeds a NEW build from a deep copy (fresh local id, name step required); the fragment is replaced out of the URL so refresh/back never re-seeds; the source link and any saved original are never mutated.
- **Build a new Buddy** → `/biome-buddy`.

---

## 13. Reviewable prototype — what landed (2026-09-02)

| Area                  | Landed                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Routes                | `/biome-buddy` (game), `/biome-buddy/share` (presentation), `/biome-buddy/review` (reviewer intro → real experience). Public, no auth, linked from nothing. **Unlisted is not authentication.**                                                                                                                                                                                                              |
| Isolation             | Zero backend traffic (tested), zero PII, no analytics, no gameRegistry/Creation/companion wiring, no schema change.                                                                                                                                                                                                                                                                                          |
| Loop                  | Choose → Create → Test & Learn → Name & Save → Revise, with Guided unlock ladder, science cards, live bars, wondering nudges, "nothing moved" card, unlock announce.                                                                                                                                                                                                                                         |
| Model                 | 4 biomes × 5 categories (23 options) + 5 patterns; 4 stats; exhaustive invariant tests; 79 why-lines; 28 eight-part science cards; en + es.                                                                                                                                                                                                                                                                  |
| Sprite                | Deterministic layered SVG, `sm/md/lg`, decorative-or-labelled, reduced-motion aware, pointer-events off.                                                                                                                                                                                                                                                                                                     |
| Storage               | `biomebuddy:gallery:v1`, `biomebuddy:draft:v1`, `biomebuddy:progress:v1`; corrupt entries skipped, corrupt blobs read empty, quota failures degrade to in-memory with a gentle note; recipes re-validated on read.                                                                                                                                                                                           |
| Share                 | §12. Web Share API → clipboard → manual field; accessible status.                                                                                                                                                                                                                                                                                                                                            |
| Safe Exploration (p9) | Meaningful unknown: how a part behaves in a home. Variables: 5 parts + pattern + biome. Visible consequence: live bars + Test & Learn. Way back: Revise (recipe preserved), "Last test" chip, "Keep it" on delete. Variation mode: **deterministic** (same recipe → same result) + **remix** (share → copy; lineage = the link). Variation never touches mastery, access, XP, or ranking (nothing is wired). |
| Deliberately absent   | Creation API, gallery backend, `companionCreationId`, profile endpoint, migrations, group sharing, student identity, Touch category, vi/zh-CN content.                                                                                                                                                                                                                                                       |

## 14. Open questions for the pod

1. Confirm §4's 5+1 picker split vs. folding Touch into v2 with a fifth stat.
2. Where does v2 land in the set structure — Set 3 candidacy alongside Track Maker, or module-attached via `ActivityPlayer`?
3. Fire biome kid-facing name: the prototype shows "Fire · Desert & volcano". Keep, or rename the biome label outright? Ids stay `fire` either way.
4. Stat label for `agility` at K–2 ("Speedy Moves"?) — content-only change, decide with copy review.
5. Should a Guided (K–2) remix of a shared Buddy open all pickers, or honour the child's unlock ladder? The prototype honours the ladder (locked parts keep the shared choice).
