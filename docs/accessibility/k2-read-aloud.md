> **Canonical for:** K–2 read-aloud pilot (#717). Last verified against code: 2026-11-24.

# Read-aloud pilot decision and classroom check

**Proposed decision for the Experience pod lead:** use only an installed, local speech-synthesis voice that matches the language of an authored instruction. Keep the text in place. Start with game and activity instructions; leave story narration, quizzes, feedback and recorded content under #625. No autoplay, microphone, recording, external audio provider, or speech analytics. Browser synthesis avoids an audio asset pipeline and can work offline when a matching voice is already installed; voice quality and availability vary by device. Curated recordings offer consistent pronunciation but require translated recordings and offline distribution for each line. A hybrid remains possible later. [Voice locality](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService) is reported by the browser; an empty inventory or a remote-only match means text only.

**Release gate:** pod-lead sign-off, physical-device observations and an early-reader session have not been recorded. The new shared instruction surfaces are a review build behind `VITE_K2_READ_ALOUD=true`; leave the flag unset for general release. Existing Qubit Cove keeps its own user-initiated Listen entry and uses the same local-voice rules. To try the classroom pilot locally, run `VITE_K2_READ_ALOUD=true npm run dev` and sign in as a K–2 learner. Open a Foundation game briefing or a K–2 activity with answer choices. The controls read the short action instruction, not quiz content. During playback, Pause remembers the last word reported by the device; without word events, Resume repeats the short instruction.

**Desktop check (2026-11-24):** In Chromium with no installed English voice, the pilot showed the written Tank Trek instruction and the audio-unavailable message. The learner could start the mission. Automated voice fixtures cover playback, pause, resume, repeat, stop and language changes; they do not establish audible speech on a physical device.

| Physical device                | Verify before claiming support                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| iPad / iPhone, Safari          | For en, es, vi and zh-CN, note OS/browser, actual installed local voice and whether speech is audible offline. |
| Android phone / tablet, Chrome | Repeat the same matrix, including an uninstalled voice, touch controls, pause/resume, repeat and interruption. |

On each device start a K–2 activity with sound on. Verify silence until Listen; play, pause, resume, repeat and stop without resetting the game. Change the step, language and route during speech. Confirm no overlap and that a new screen never speaks automatically. Repeat with a keyboard and the device screen reader. A missing matching voice must leave readable instructions and a clear explanation. Do not mark a device or language supported without actual results.

For the facilitated check, use the pilot with an early reader and ask them to show the next action after listening. With permission, note only the instruction and whether they could act independently, replay count, confusion and where an adult needed to explain. No names, recordings or child account details. Record anonymized observations for #717 and the instruction-comprehension research; #625 remains open.
