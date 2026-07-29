# Set 2 Experience and Localization for K-2 and G3-5 — Audit

**Date:** 2026-07-27 · **Verified with:** `jordan@test.com` (grade 4, class GRADE35, band `g3_5`), `explorer@test.com` (band `k2`)

## Test Matrix

| Game              | Issue       | Description                                                                                                                                                                                          | Grade Band | Tracked?              | Priority                                                                       |
| ----------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------- | ------------------------------------------------------------------------------ |
| Maze Map          | Gameplay    | Safe Pad copy/icon misleading                                                                                                                                                                        | k2 & g35   | tracked in issue #644 | p2                                                                             |
| Maze Map          | Translation | hardcoded text                                                                                                                                                                                       | k2 & g35   |                       | p1                                                                             |
| Maze Map          | Translation | Missing all translation keys for English, Spainish, Chinese, and Vietnamese                                                                                                                          | k2 & g35   |                       | p1 for adding translation keys for English and Chinese, p2 for other languages |
| Move and Measure  | Gameplay    | The QTE target zone and the score should be tied to the student's prediction                                                                                                                         | g35        | tracked in #690       | p2                                                                             |
| Move and Measure  | Gameplay    | For toss, instead of using a slider to pick the angle, show the ball's trajectory and let students adjust the throwing angle by changing the trajectory.                                             | k2 & g35   |                       | p2                                                                             |
| Move and Measure  | Score       | 5 points are rewarded if the retry score is higher than the original score. However, if the student already achives full score in the first try, they won't be able to get the +5 improvement score. | k2 & g35   |                       | p1                                                                             |
| Move and Measure  | Translation | Hardcoded text                                                                                                                                                                                       | k2 & g35   |                       | p1                                                                             |
| Move and Measure  | Translation | Incorrect translation lookups in English                                                                                                                                                             | k2 & g35   |                       | p1                                                                             |
| Move and Measure  | Translation | Missing some translation keys in Spainish, missing all translation keys in Chinese and Vietnamese                                                                                                    | k2 & g35   |                       | p1 for Chinese, p2 for other languages                                         |
| Sky Shield        | Translation | Missing some translation keys in Spainish, missing all translation keys in Chinese and Vietnamese                                                                                                    | k2 & g35   |                       | p1 for Chinese, p2 for other languages                                         |
| Sky Shield        | Score       | Total score is calculated as (number of rounds) \* 20. However, in the gameplay, not all rounds have a score of 20.                                                                                  | k2 & g35   |                       | p2                                                                             |
| Fast Lane         | Gameplay    | g35 content has not been implemented                                                                                                                                                                 | g35        | tracked in #620       | p1                                                                             |
| Fast Lane         | Score       | In some rounds, multiple lanes equally optimal. However, the current scoring mechanism only reward full points to the first lane.                                                                    | k2 & g35   |                       | p2                                                                             |
| Fast Lane         | Translation | hardcoded text                                                                                                                                                                                       | k2 & g35   |                       | p1                                                                             |
| Fast Lane         | Translation | Missing all translation keys in Chinese and Vietnamese                                                                                                                                               | k2 & g35   |                       | p1 for Chinese, p2 for Vietnamese                                              |
| Qualify Tune Race | Gameplay    | g35 content has not been implemented                                                                                                                                                                 | g35        | tracked in #621       | p2                                                                             |
| Qualify Tune Race | Gameplay    | Make the car move upward instead of downward, or start the car closer to the top of the screen, so students have more time to react to upcoming obstacles                                            | k2 & g3-5  |                       | p2                                                                             |
| Qualify Tune Race | Gameplay    | The upgrade option "Steady Steering" currently does not change how the car behaves                                                                                                                   | k2 & g35   |                       | p2                                                                             |
| Qualify Tune Race | Score       | The current scoring mechanism reward points only when round 2 improves compared with round 1. Therefore, if a student has a perfect run in both rounds, they still can't receive full scores.        | k2 & g35   |                       | p2                                                                             |
| Qualify Tune Race | Translation | hardcoded text                                                                                                                                                                                       | k2 & g35   |                       | p1                                                                             |
| Qualify Tune Race | Translation | Missing all translation keys in Chinese and Vietnamese                                                                                                                                               | k2 & g35   |                       | p1 for Chinese, p2 for Vietnamese                                              |

## G3-5 Contents

- g3-5 contents for Maze Map and Move and Measure have been implemented and approved.
- g3-5 content for Sky Shield has been implemented and is waiting for review.
- g3-5 contents for Fast Lane and Qualify Tune Race has not been implemented.

## Scoring

- Scoring bugs for Move and Measure, Sky Shield, Fast Lane, Qualify Tune Race.
- Priority: p1 or p2

## Translation

- All games still have some hardcoded English texts. Replace these hardcoded texts (p1).
- Maze Map and Move and Measure have missing English translation keys and incorrect translation lookups. Fix these (p1).
- Maze Map, Move and Measure, Sky Shield have missing Spanish translation keys and/or incorrect lookups. Review and fix (p2).
- All games are missing Chinese translation keys (p1).
- All games are missing Vietnamese translation keys (p2).

## Game Mechanics and Design Questions

- Maze Map: Safe Pad copy/icon misleading. (p2)
- Move and Measure: The QTE target zone and the score should be tied to the student's prediction. (p2)
- Move and Measure: For toss, instead of using a slider to pick the angle, show the ball's trajectory and let students adjust the throwing angle by changing the trajectory. (p2)
- Qualify Tune Race: Make the car move upward instead of downward, or start the car closer to the top of the screen, so students have more time to react to upcoming obstacles. (p2)
- Qualify Tune Race: The upgrade option "Steady Steering" currently does not change how the car behaves. (p2)
