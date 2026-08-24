# Set 2 Experience and Localization for K-2 and G3-5 — Audit

**Original manual verification:** 2026-07-27 with `jordan@test.com` (grade 4, class GRADE35, band `g3_5`) and `explorer@test.com` (band `k2`) · **Repository status refreshed:** 2026-08-23

## Current status

- #746 merged the English Set 2 key set.
- #747 merged the remaining inline UI key wiring and closed #731.
- #770 now contains all 222 Simplified Chinese keys across the five games, is updated with current `main`, and is ready for final review; it is not yet merged.
- Briefing `story`, `tips`, and some `controlInstructions` values remain inline `pickLocale()` content with incomplete non-English maps.
- Spanish/Vietnamese coverage and the gameplay/scoring findings below remain follow-up work.

## Test Matrix

| Game              | Issue       | Description                                                                                                                                                                                           | Grade Band | Tracked?                 | Priority   |
| ----------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------ | ---------- |
| Maze Map          | Gameplay    | Safe Pad copy/icon misleading                                                                                                                                                                         | k2 & g35   | tracked in issue #644    | p2         |
| Maze Map          | Translation | hardcoded inline UI text                                                                                                                                                                              | k2 & g35   | closed by merged PR #747 | ✅ shipped |
| Maze Map          | Translation | Missing all translation keys for Spanish and Vietnamese                                                                                                                                               | k2 & g35   |                          | p2         |
| Maze Map          | Translation | Chinese translation keys are complete in ready PR #770 (not yet merged).                                                                                                                              | k2 & g35   | ready PR #770            | p1         |
| Move and Measure  | Gameplay    | The QTE target zone and the score should be tied to the student's prediction                                                                                                                          | g35        | tracked in #690          | p2         |
| Move and Measure  | Gameplay    | For toss, instead of using a slider to pick the angle, show the ball's trajectory and let students adjust the throwing angle by changing the trajectory.                                              | k2 & g35   |                          | p2         |
| Move and Measure  | Score       | 5 points are rewarded if the retry score is higher than the original score. However, if the student already achieves full score in the first try, they won't be able to get the +5 improvement score. | k2 & g35   | tracked in issue #734    | p1         |
| Move and Measure  | Translation | Hardcoded inline UI text                                                                                                                                                                              | k2 & g35   | closed by merged PR #747 | ✅ shipped |
| Move and Measure  | Translation | Missing some translation keys in Spanish, missing all translation keys in Vietnamese                                                                                                                  | k2 & g35   |                          | p2         |
| Move and Measure  | Translation | Chinese translation keys are complete in ready PR #770 (not yet merged).                                                                                                                              | k2 & g35   | ready PR #770            | p1         |
| Sky Shield        | Translation | Missing some translation keys in Spanish, missing all translation keys in Vietnamese                                                                                                                  | k2 & g35   |                          | p2         |
| Sky Shield        | Translation | Chinese translation keys are complete in ready PR #770 (not yet merged).                                                                                                                              | k2 & g35   | ready PR #770            | p1         |
| Sky Shield        | Score       | Total score is calculated as (number of rounds) \* 20. However, in the gameplay, not all rounds have a score of 20.                                                                                   | k2 & g35   | tracked in issue #735    | p2         |
| Fast Lane         | Gameplay    | g35 content has not been implemented                                                                                                                                                                  | g35        | tracked in #620          | p1         |
| Fast Lane         | Score       | In some rounds, multiple lanes equally optimal. However, the current scoring mechanism only rewards full points to the first lane.                                                                    | k2 & g35   | tracked in issue #736    | p2         |
| Fast Lane         | Translation | hardcoded inline UI text                                                                                                                                                                              | k2 & g35   | closed by merged PR #747 | ✅ shipped |
| Fast Lane         | Translation | Missing some translation keys in Spanish; Missing all translation keys in Vietnamese                                                                                                                  | k2 & g35   |                          | p2         |
| Fast Lane         | Translation | Chinese translation keys are complete in ready PR #770 (not yet merged).                                                                                                                              | k2 & g35   | ready PR #770            | p1         |
| Qualify Tune Race | Gameplay    | g35 content has not been implemented                                                                                                                                                                  | g35        | tracked in #621          | p2         |
| Qualify Tune Race | Gameplay    | Make the car move upward instead of downward, or start the car closer to the top of the screen, so students have more time to react to upcoming obstacles                                             | k2 & g3-5  |                          | p2         |
| Qualify Tune Race | Gameplay    | The upgrade option "Steady Steering" currently does not change how the car behaves                                                                                                                    | k2 & g35   |                          | p2         |
| Qualify Tune Race | Score       | The current scoring mechanism rewards points only when round 2 improves compared with round 1. Therefore, if a student has a perfect run in both rounds, they still can't receive full scores.        | k2 & g35   | tracked in issue #737    | p2         |
| Qualify Tune Race | Translation | hardcoded inline UI text                                                                                                                                                                              | k2 & g35   | closed by merged PR #747 | ✅ shipped |
| Qualify Tune Race | Translation | Missing some translation keys in Spanish; Missing all translation keys in Vietnamese                                                                                                                  | k2 & g35   |                          | p2         |
| Qualify Tune Race | Translation | Chinese translation keys are complete in ready PR #770 (not yet merged).                                                                                                                              | k2 & g35   | ready PR #770            | p1         |

## G3-5 Contents

- g3-5 contents for Maze Maps, Move and Measure, and Sky Shield have been implemented and approved.
- g3-5 content for Fast Lane and Qualify Tune Race has not been implemented.

## Scoring

- Scoring bugs for Move and Measure, Sky Shield, Fast Lane, Qualify Tune Race.
- Priority: p1 or p2

## Translation

- Briefing `story`, `tips`, and some `controlInstructions` values remain inline `pickLocale()` content with incomplete non-English maps; move them to complete locale-backed content. (p1)
- All games have some missing Spanish translation keys and/or incorrect lookups (p2).
- All games are missing Vietnamese translation keys (p2).
- All five games have complete Simplified Chinese key coverage in ready PR #770 (222/222 keys; not yet merged). (p1)

## Game Mechanics and Design Questions

- Maze Map: Safe Pad copy/icon misleading. (p2)
- Move and Measure: The QTE target zone and the score should be tied to the student's prediction. (p2)
- Move and Measure: For toss, instead of using a slider to pick the angle, show the ball's trajectory and let students adjust the throwing angle by changing the trajectory. (p2)
- Qualify Tune Race: Make the car move upward instead of downward, or start the car closer to the top of the screen, so students have more time to react to upcoming obstacles. (p2)
- Qualify Tune Race: The upgrade option "Steady Steering" currently does not change how the car behaves. (p2)

## Set 2 Games Translation Keys and Strings — Audit

### Summary

| Game                | EN  |       ES        |      ZH       |     VI     | Hardcoded | No Lookup bugs |
| ------------------- | :-: | :-------------: | :-----------: | :--------: | :-------: | :------------: |
| Maze Maps           | ✅  | ⚠️ Missing keys | ⚠️ ready #770 | ❌ Missing | briefing  |       ✅       |
| Move and Measure    | ✅  | ⚠️ Missing keys | ⚠️ ready #770 | ❌ Missing | briefing  |       ✅       |
| Sky Shield          | ✅  | ⚠️ Missing keys | ⚠️ ready #770 | ❌ Missing | briefing  |       ✅       |
| Fast Lane           | ✅  | ⚠️ Missing keys | ⚠️ ready #770 | ❌ Missing | briefing  |       ✅       |
| Qualify, Tune, Race | ✅  | ⚠️ Missing keys | ⚠️ ready #770 | ❌ Missing | briefing  |       ✅       |

### Maze Maps

- All translation keys in English are implemented.
- Chinese translation keys are complete in ready PR #770 (not yet merged).
- Translation keys in Spanish and Vietnamese are still incomplete.
- Briefing title has inline locale values; story, tips, and controlInstructions remain English-only inline `pickLocale()` content.

#### Hardcoded English text (✅ fixed in #747)

- sweeper labels ("Loop Sweeper" & "Line Sweeper")
- chapterLabel: "AI Lab",

#### Missing translation keys & English source text (✅ fixed in #746)

"collisionHint": "Oops! Back to safety. Watch the pattern first."  
"hintSafePad": "Try the Safe Pad before moving past the Sweeper."  
"levelComplete": "All orbs collected! Great path!"  
"collectAll": "Collect all the Idea Orbs first!"  
"introTitle": "Maze Maps & Smart Paths"  
"introDesc": "Help Byte Bot collect the Idea Orbs. Watch the Sweepers and choose a smart path!"  
"letsGo": "Let's Go!"  
"watchFirst": "Watch the Sweeper's pattern first!"  
"watchDesc": "See how it moves in a loop? Watch one more cycle..."  
"readyToTry": "I see the pattern! Let me try."  
"exitA": "Run straight through as fast as possible"  
"exitB": "Watch the pattern, wait at a safe spot, then move"  
"exitC": "Close your eyes and hope for the best"  
"exitQuestion": "Which path is smartest?"  
"exitRetry": "Not quite — try again!"  
"celebTitle": "You used a smart path!"  
"celebDesc": "You watched, planned, and chose a smart path. Smart systems look for patterns before they act."  
"orbsCollected": "Orbs"  
"movesUsed": "Moves"  
"phaseTutorial": "Tutorial"  
"phaseGuided": "Guided Play"  
"phaseMain": "Main Challenge"  
"tutorialHint": "Collect all Idea Orbs and reach the Goal!"  
"guidedHint": "Watch the Sweeper. Use the Safe Pad!"  
"mainHint": "Two Sweepers! Plan a smart path."  
"movesLabel": "Moves"

### Move and Measure

- All translation keys in English are implemented.
- Chinese translation keys are complete in ready PR #770 (not yet merged).
- Translation keys in Spanish and Vietnamese are still incomplete.
- Briefing title has inline locale values; story and tips remain English-only inline `pickLocale()` content.

#### Hardcoded English text (✅ fixed in #747)

- const NAMES = {
  dash: "Dash",
  jump: "Jump",
  toss: "Toss",
  };
- Prediction Hint ("You will compare your prediction with your actual result after the activity.")
- Measurement labels ("Distance:", "Height:")
- Event Compare page (Prediction, Actual, How far off was your prediction?, Continue)
- Compare Results page ("Predicted:", "Actual:", "Difference:")
- chapterLabel: "Body Lab"

#### Missing translation keys & English source text (✅ fixed in #746)

- Missing translation keys in all language:

  "great": "Great!"  
   "good": "Good!"  
   "tryHarder": "Keep trying!"  
   "tipFocus": "Focus on timing"  
   "tipPower": "Control your power"  
   "tipAim": "Aim carefully"  
   "exitA": "I guessed"  
   "exitB": "I measured and compared"  
   "exitC": "I asked a friend"  
   "retryLabel": "Retry!"  
   "predictTitle": "Make a Prediction"  
   "predictText": "Before you try, predict where you think you'll land!"  
   "low": "Low"  
   "high": "High"  
   "yourPrediction": "Your prediction:"  
   "start": "Start!"  
   "event1": "Event 1 of 3"  
   "tap": "TAP!"  
   "event2": "Event 2 of 3"  
   "holdMe": "HOLD ME!"  
   "release": "RELEASE!"  
   "event3": "Event 3 of 3"  
   "throw": "THROW!"  
   "diffCorrect": "Nice! You calculated the difference correctly."  
   "diffTryAgain": "Not quite. Try again!"  
   "correct": "Correct!"  
   "notQuite": "Not quite — but good thinking!"  
   "improveText": "Choose a tip, then retry that event!"  
   "results": "Results"  
   "before": "Before"  
   "after": "After"  
   "youImproved": "You improved!"  
   "keepPracticing": "Keep practicing!"  
   "exitCorrect": "That's right! Measuring helps us know!"  
   "exitWrong": "The best way is to measure and compare!"

#### Incorrect translation keys lookups (✅ fixed in #746)

games.moveMeasure.introText, should be games.moveMeasure.introDesc  
games.moveMeasure.dashInstr, should be games.moveMeasure.dashHint  
games.moveMeasure.jumpInstr, should be games.moveMeasure.jumpHint  
games.moveMeasure.tossInstr, should be games.moveMeasure.tossHint
games.moveMeasure.celebText, should be games.moveMeasure.celebDesc

### Sky Shield

- All translation keys in English are implemented.
- Chinese translation keys are complete in ready PR #770 (not yet merged).
- Translation keys in Spanish and Vietnamese are still incomplete.
- Briefing title has inline locale values; story and tips remain English-only inline `pickLocale()` content.

#### Hardcoded English text (✅ fixed in #747)

- chapterLabel: "Pattern Lab"

#### Missing translation keys in all languages & English source text (✅ fixed in #746)

"catchGood": "Great catch!"  
"catchMiss": "Oops! Try another lane."  
"predictGood": "You found the pattern!"  
"predictMiss": "Not quite -- keep watching!"  
"scanGood": "Scan correct!"  
"scanMiss": "That was a different color."  
"scanFirst": "Scan the mystery light first!"  
"practiceLabel": "Practice -- Catch the Light!"  
"catch": "Catch!"  
"patternLabel": "Pattern -- Watch and Predict!"  
"whichLane": "Which lane is next?"  
"watching": "Watching the pattern..."  
"scanLabel": "Scan -- Reveal the Mystery!"  
"scan": "Scan"  
"pickColor": "Pick the matching shield!"  
"challengeLabel": "Challenge Round!"  
"exitTitle": "Exit Ticket"
"seeResults": "See Results"  
"celebrationMsg": "You watched, noticed the pattern, and chose the right shield!"

#### Missing Spanish translation keys & English source text (✅ fixed in #713)

"patternReminderTitle": "You learned this pattern:",  
"patternReminderMessage": "Remember it! The mystery lights will follow this same pattern.",  
"challengePredict": "Which lane will the light fall into?",  
"challengeLabel": "Challenge",  
"challengeReveal": "The light is {{color}} and falls into lane {{lane}}!",  
"challengePredictCorrect": "✨ Great prediction! You spotted the pattern!",  
"challengePredictWrong": "🌟 Not quite. Keep watching the pattern.",  
"challengePatternReminder": "The pattern is",  
"exitWrong": "The answer is {{color}}. The pattern repeats!",  
"colorBlue": "Blue",  
"colorYellow": "Yellow",  
"colorPink": "Pink",

#### Spanish translation keys that need to be updated (✅ fixed in #713)

"exitQuestion": "Azul, azul, dorado, azul, azul, \_\_\_. ¿Qué sigue?" (English source text: "exitQuestion": "What comes next?")  
"exitCorrect": "Dorado" (English source text: "exitCorrect": "Correct! {{color}} comes next!")

#### Spanish translation keys that are no longer used in the game:

"exitWrongA": "Azul",  
"exitWrongB": "Rojo",

### Fast Lane

- All translation keys in English are implemented.
- Chinese translation keys are complete in ready PR #770 (not yet merged).
- Translation keys in Spanish and Vietnamese are still incomplete.
- Briefing title has inline locale values; story and tips remain English-only inline `pickLocale()` content.

#### Hardcoded English text (✅ fixed in #747)

- chapterLabel: "Signal School"

#### Missing translation keys & English source text (✅ fixed in #746)

- Missing translation keys in all languages

  "achStreak": "Signal Streak x5"  
   "achPerfect": "Perfect Driver"  
   "perfectPick": "Perfect pick! Best lane!"  
   "safePick": "Safe! Good choice!"  
   "cautionPick": "Careful! That lane might close soon."  
   "blockedPick": "Oops! That lane was blocked."  
   "introText": "Read the road signals and pick the safest lane to deliver your science supplies!"  
   "celebText": "You watched the signals and made smart choices!"  
   "bestStreak": "Best Streak"  
   "exitTitle": "Final Check!"  
   "exitPrompt": "Which lane is safest?"  
   "nextTurnLabel": "Next turn signals shown below"  
   "seeResults": "See Results"  
   "phasePractice": "Practice"  
   "phaseSignals": "Signal Training"  
   "phaseLookAhead": "Look Ahead"  
   "phaseChallenge": "Challenge"  
   "hintPractice": "Pick the lane with a green signal!"  
   "hintSignals": "Avoid red AND yellow signals."  
   "hintLookAhead": "Check both rows. Pick the lane that stays safe!"  
   "hintChallenge": "Use everything you learned!"  
   "roundOf": "Round {{n}} of {{total}}"  
   "nextTurnLabel": "Next turn signals shown below"  
   "nextRound": "Next"

### Qualify, Tune, Race

- All translation keys in English are implemented.
- Chinese translation keys are complete in ready PR #770 (not yet merged).
- Translation keys in Spanish and Vietnamese are still incomplete.
- Briefing title has inline locale values; story, tips, and controlInstructions remain English-only inline `pickLocale()` content.

#### Hardcoded English text (✅ fixed in #747)

- chapterLabel: "Race Lab"

#### Missing translation keys & English source text (✅ fixed in #746)

- Missing translation keys in all languages:

  "introText": "Drive your qualifying lap, pick ONE upgrade, then race again!"  
   "raceRun": "Race Run"  
   "qualifyRun": "Qualifying"  
   "bumps": "bumps"  
   "qualifyRun": "Qualifying"  
   "active": "Active"
  "controls": "← → or tap buttons to steer"  
   "whatChange": "What should we change?"  
   "raceNow": "Race Again!"  
   "next": Next  
   "correctAnswer": "That's right! Change only ONE thing for a fair test!"  
   "wrongAnswer": "The answer is ONE! Change one thing so you know what made the difference."  
   "seeBadge": "See Your Badge!"  
   "badgeName": "Big Challenge"  
   "badgeDesc": "Completed the Qualify, Tune, Race capstone!"  
   "finish": "Finish!"

#### Incorrect translation lookups (✅ fixed in #746)

games.qualifyTuneRace.qualifyResults, should be games.qualifyTuneRace.resultsTitle  
games.qualifyTuneRace.time, should be games.qualifyTuneRace.timeLabel  
games.qualifyTuneRace.smoothness, should be games.qualifyTuneRace.smoothnessLabel  
games.qualifyTuneRace.pickUpgrade, should be games.qualifyTuneRace.tuneTitle
games.qualifyTuneRace.gripTitle, should be games.qualifyTuneRace.gripTires  
games.qualifyTuneRace.speedTitle, should be games.qualifyTuneRace.speedBoost  
games.qualifyTuneRace.steeringTitle, should be games.qualifyTuneRace.steadySteering  
games.qualifyTuneRace.steeringDesc, should be games.qualifyTuneRace.steadyDesc  
games.qualifyTuneRace.whatBetter, should be games.qualifyTuneRace.whatGotBetter  
games.qualifyTuneRace.answerOne, should be games.qualifyTuneRace.exitCorrect  
games.qualifyTuneRace.answerTwo, should be games.qualifyTuneRace.exitWrongB  
games.qualifyTuneRace.answerAll, should be games.qualifyTuneRace.exitWrongA
