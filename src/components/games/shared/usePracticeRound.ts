import { useEffect, useMemo, useRef } from "react";

export const RETRY_MS = 1200;
export const ANSWER_MS = 2600;

// Count misses per prompt, not per life. A shown answer advances the lesson
// but is never passed to the game's correct-answer/scoring path.
export function usePracticeRound() {
  const misses = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );
  return useMemo(
    () => ({
      miss: () => (++misses.current <= 2 ? "retry" : "reveal"),
      reset: () => {
        misses.current = 0;
      },
      get waiting() {
        return timer.current !== null;
      },
      after(delay: number, action: () => void) {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          action();
        }, delay);
      },
    }),
    [],
  );
}
