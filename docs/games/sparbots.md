# SparBots: Training Tower

> **Canonical for:** the first K–2 AI specialty game and its Safe Exploration Contract. Last verified against code: 2026-11-11.

Teach a tiny classifier with example cards, watch it choose, then revise the
examples. Meet → Show → Train → Spar → Coach's Corner → Reflect → Bot Card
implements the Creative Learning Spiral. Four floors introduce pose, relevant
clues, mislabeled examples, and a partner whose mapping changes after round one.

## Safe Exploration Contract

| Concern             | Behavior                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meaningful unknown  | Which move will the bot select from these examples?                                                                                                                                         |
| Learner control     | Author, relabel or discard cards; select pose or light; name a bot from a closed kit.                                                                                                       |
| Visible consequence | An untimed beat shows the selected move, matching cards, confidence and spark outcome. Unknown clues and tied votes are named.                                                              |
| Safe way back       | One bench edit per experiment, shared Try / Keep / Go back controls, saved-version restore, unlimited practice and rematches. The tower remains reachable.                                  |
| Variation           | Seeded, version 1; fixed seed per floor. No wall-clock or unseeded random decisions.                                                                                                        |
| Scaffolding         | K–2 starter cards, six practice beats, one clue and one edit at a time, three sparks per round. Injected g3_5 uses five sparks; the four-floor scope stays the same. Missing band uses K–2. |
| Reflection          | Replay the deciding beat, identify its card, choose a wondering response and friendly finish. Locally save or print the named Bot Card.                                                     |
| Facilitator         | All play is step-based and untimed; pause by returning to the corner. Revisit any unlocked floor together. Unplugged twin: draw clue/move cards and let a partner sort and vote.            |
| Accessibility       | Native keyboard controls, text plus shape clues, large targets, visible announcements, reduced-effects control, EN/ES. No essential sound or motion.                                        |
| Privacy and bounds  | Device-only, student-scoped draft; 24 cards and 4096 UTF-8 bytes maximum; strict closed fields and enums. No free text, media capture, external model or child-to-child sharing.            |
| Assessment          | Match outcomes stay local. Platform completion is fixed 1/1 after all floors and reflection, with bounded creation/revision counts only. Seeds never vary access, XP, mastery or rankings.  |

Rounds stop after 18 beats if neither meter fills. A draw offers another try and
cannot clear a floor. Two won rounds clear a floor; an empty playbook abstains
and cannot win. Shuffle's mapping changes once, after round one, then stays
stable so revisions can be tested. A coach's call is offered once per round,
only on an unseen clue, and becomes an example only when explicitly kept.

The AI hub, registry and both progress writers use the same specialty identities.
SparBots requires the earned AI specialty and all Set 3 completions. The seed
helper is mirrored in both Prisma trees; existing target gates remain in force.
No production seed or migration is part of this change. `/dev/advanced` provides
the existing development-only preview with a separate local storage scope.

The supplied concept's title is provisional. Name clearance and a classroom
playtest remain rollout checks. Memory/bluff floors, self-training, server
gallery sharing and bot-versus-bot play are later releases.

## Review walkthrough

Start the development app using the repository setup and open `/dev/advanced`.
Use the AI preview; it does not need a learner account or write platform progress.

1. Choose AI and confirm. Expect the SparBots mission with a playable button.
2. Enter the tower using only Tab and Enter. Expect focus on the new screen heading.
3. Show six examples to Pip. Expect a keep/toss choice after each move.
4. Change a card in the corner. Expect other edits to wait until Try / Keep / Go back.
5. Try and restore the change. Expect the old card and an unchanged saved version.
6. Train and step through a round. Expect the bot to act from its cards, with a visible explanation.
7. Pause in the corner. Expect no clock, penalty or lost open floor.
8. Repeat at narrow width and 200% zoom in Spanish. Expect readable controls without horizontal scrolling.
9. Enable reduced motion and mute the device. Expect all clues and outcomes to remain visible.
10. Use a screen reader to follow a beat and the shared experiment controls. Expect the outcome and the focused heading to make sense without duplicate instructions.
11. Name and print the Bot Card. Expect only that card in print preview.

Close the preview and remove only its `brightboost:sparbots:v1:preview` device
draft to reset. Actual student access additionally requires seeded curriculum,
all Set 3 completions and the saved AI specialty. Automated tests cover the
four-floor loop, storage failures, server denials and EN/ES browser interaction;
the screen-reader and print checks above still require a human review.
