> **Canonical for:** the selected #720 engine integration contract and verification entry points.
> **Last verified against code:** 2026-10-18.
> **Status:** technical choices selected for the authorized integration; independent repository review and merge approval remain pending.
> **Source baseline:** `fc1bf82ce44e13468af5b3eb0edba05a17acb59b`, 2026-10-14.

# The Great Work — engine implementation

Read [the design](the-great-work-design.md), especially §§5–8.7 and 10, and
[shared-code architecture](../architecture/shared-code.md) before changing this module.
The S-2 import pattern stays: `@shared/greatwork-engine` in the frontend;
`@brightboost/greatwork-engine` in the backend. No rendering, Node, database,
clock, random generator or grade-band lookup enters `shared/greatwork-engine`.

## Public execution

`runMachine(level, program)` and `runMachineTraced(level, program)` delegate to
one `simulate()` iterator and one seven-phase `step()`. The result field list
remains `solved, cycles, cost, area, instructions, produced, mirrored?, error?`.
Traces expose the actual per-tick atoms, bonds, arm states, delivered molecules
and accumulated area. No score is submitted, XP awarded, record persisted, or
Set 3 module unlocked here; those consumer actions belong to later tickets.

Invalid input throws `MachineValidationError` with bounded path/code findings.
Collision, stall and tick limit are ordinary run outcomes. Each step copies its
state; caller inputs are copied before freezing. The readonly Map/Set types do
not claim to make JavaScript Map/Set mutators impossible for a hostile caller.
The server must still validate its saved envelope and impose a wall-clock/worker
budget under #722. The engine's deterministic ceilings are not a wall-clock guarantee.

## Selected integration choices

The October 15 integration request authorizes resolving the provisional mechanics.
The existing, test-pinned choices below are selected as the integration contract.
The engine retains its draft version until independent repository review; this
selection does not claim a human approval or authorize deployment. Keep downstream
consumers aligned if review changes one of these choices.

| Topic                         | Selected behavior                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RESET duration (§8.3)         | One shortest-path 60° return step per tick, minimum one tick. A 180° tie turns clockwise. Held molecules move with the arm. The tape advances only after returning.                                                                                                                                   |
| Tape end (§7)                 | Exhaustion holds position. REPEAT consumes one tick and jumps to chip zero. A three-chip beginner tape does not secretly loop; tutorial scaffolding must handle that explicitly.                                                                                                                      |
| Duplicate footprint (§5)      | Two adjacent cells, both input and output. Essence is replaced by the copied cardinal in its own cell. This resolves the design's literal `[0, ?]` locally.                                                                                                                                           |
| Glyph facing/coordinates (§5) | Templates carry facing and rotate around their anchor. Growth is a three-cell triangle; Compression a three-cell line; Realize a four-cell rhombus; Unification a five-cell flower.                                                                                                                   |
| Multi-arm sweep (§6.1/§10)    | Every arm-body cell and held atom walks the integer hex-distance ring for each 60° step. For reach three, `(3,0) → (2,1) → (1,2) → (0,3)`. This is a lattice convention, not a physical circular arc.                                                                                                 |
| Reaction identity             | Fixed output slots follow the glyph template. Inputs are matched as a multiset, including reversed reagent positions. In-place products retain IDs, bonds and grips; products on new cells get fresh monotonic IDs. Removed atoms lose incident bonds and grips.                                      |
| Single Bond cost              | 10 currency units; the design gives no cost. Other proposed costs follow its tables. No currency is awarded to learners.                                                                                                                                                                              |
| Bounds and walls              | Optional `LevelSpec.bounds` and `walls` supply collision geometry omitted by the proposed API. Default safety bounds are q/r ±256.                                                                                                                                                                    |
| Snapshot omissions            | `SimState` adds the missing bond graph and current delivery order. `TickResult` adds atom/bond lookup so a renderer can actually identify the board's atom IDs. The strict `RunResult` list is unchanged.                                                                                             |
| Resource ceilings             | 10,000 ticks, 128 parts, 4,096 chips, 128 target atoms, ±64 authored coordinates, and an 8,192 theoretical spawn budget; technical guardrails, not curriculum or progress rules.                                                                                                                      |
| Initial/fixed parts           | Fixed lesson parts participate in cost and area. Input/output parts cost zero. Passive glyph/dispenser/acceptor footprints cannot overlap; arm anchors and dynamic spokes are separate layers.                                                                                                        |
| Existing spike sentinel       | Retain `GREAT_WORK_ENGINE_STUB_ID` and `describeGreatWorkEngine` as compatibility exports until #721 adds a real UI consumer. Existing `/health` and root dataset remain compatibility probes, not evidence that gameplay or scoring is integrated. New code can inspect `GREAT_WORK_ENGINE_VERSION`. |

The exact authoritative seven-phase order, six-rotation matching, mirror rejection,
whole-history area and no-XP rule are preserved, not relaxed by these choices.
P2 track/MOVE/PIVOT instructions are recognized and rejected, never treated as WAIT.
Multi-grabber/reach combinations are implemented as #720 explicitly requests,
without making their later UI controls or any higher-band module available.

## Verification commands in an installed repository

```sh
npm run build:shared
npm run verify:shared
npm run test:engine
```

The last command includes a Node Vitest project and a mandatory Chromium project.
Both compare source execution with results/traces computed through the backend's
emitted package specifier. The browser project does not inherit Storybook's
path-with-spaces skip. `npm test` also collects both projects.

The freshness guard independently recompiles to an OS temporary directory and
compares filenames and bytes, including declarations and progression exports.
It never repairs before checking. `pretest`, root local-development hooks and
backend development hooks fail on stale output; explicit `build:shared` repairs it.
The canonical compiler is resolved from the root install first, backend second.
Any installed backend package is byte-compared too, including a copied package
rather than a symlink; backend launches require that package to be installed.
Existing emit-resolution tests now verify without rewriting shared/dist from
parallel workers. These are launch/test checks, not a live watcher: rebuild
and restart both consumers after shared-source edits.

See the review package's VALIDATION.md for checks actually executed. Registering
these commands is not proof they ran. Full repository CI, real Chromium parity,
Node 20 and the backend Docker build remain required before ticket closure.
Current delivery/review ownership and unresolved design choices must be recorded
before the draft leaves its review gate. #721–#725 are unchanged.
