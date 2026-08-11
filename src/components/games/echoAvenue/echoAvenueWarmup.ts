/**
 * Echo Avenue — AudioContext warm-up gate (design ruling 10).
 *
 * The ~1s engine wake must be paid on the Start screen's FIRST interaction
 * (a mood-preview tap, a volume nudge, the Start button — anything), never
 * by the child's first musical tap in the studio. This gate makes that
 * sequencing a testable contract:
 *   - warmOnFirstInteraction() starts the wake exactly once (idempotent);
 *   - isWarm() lets the tap path stay fully synchronous once running —
 *     a warm pad tap never awaits anything.
 */
export interface WarmableAudio {
  prewarm: () => Promise<void>;
}

export interface WarmupGate {
  /** Call on ANY Start-screen interaction. Idempotent; returns the single
   *  in-flight wake promise. */
  warmOnFirstInteraction: () => Promise<void>;
  isWarm: () => boolean;
  /** How many times the underlying prewarm actually ran (test hook). */
  wakeCount: () => number;
}

export function createWarmupGate(audio: WarmableAudio): WarmupGate {
  let warm = false;
  let pending: Promise<void> | null = null;
  let wakes = 0;
  return {
    warmOnFirstInteraction: () => {
      if (warm) return Promise.resolve();
      if (!pending) {
        wakes += 1;
        pending = audio.prewarm().then(() => {
          warm = true;
        });
      }
      return pending;
    },
    isWarm: () => warm,
    wakeCount: () => wakes,
  };
}
