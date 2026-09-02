import { useEffect, useState } from "react";
import { api } from "@/services/api";

export interface PersonalBest {
  bestScore: number;
  bestStreak: number;
  playCount: number;
}

const cache = new Map<string, PersonalBest>();

/**
 * Fetches the personal-best record for a specific gameKey.
 * Caches per session so repeated mounts don't re-fetch.
 */
export function usePersonalBest(gameKey: string): PersonalBest | null {
  const [pb, setPb] = useState<PersonalBest | null>(cache.get(gameKey) ?? null);

  useEffect(() => {
    if (cache.has(gameKey)) {
      setPb(cache.get(gameKey)!);
      return;
    }
    // Anonymous visitors (e.g. the public /try demo) can't have personal
    // bests — skip the authenticated fetch entirely so public surfaces
    // stay free of 401s. GameShell hides its PB chips when pb is null.
    if (!localStorage.getItem("bb_access_token")) {
      return;
    }
    let cancelled = false;
    api
      .getGamePersonalBests()
      .then((bests) => {
        if (cancelled) return;
        for (const b of bests) {
          cache.set(b.gameKey, {
            bestScore: b.bestScore,
            bestStreak: b.bestStreak,
            playCount: b.playCount,
          });
        }
        setPb(cache.get(gameKey) ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gameKey]);

  return pb;
}

/**
 * Sync the session cache from the record the server actually persisted (#640).
 *
 * Call this after a completion POST resolves, with the `personalBest` row from
 * the response. The backend reconciles GamePersonalBest on replays as well as
 * first completions, so this keeps the "Best" chip and the "New Record!" claim
 * measured against the persisted value instead of the one cached at first
 * mount — which never expired and so froze for the whole session.
 */
export function updatePersonalBestCache(gameKey: string, best: PersonalBest) {
  cache.set(gameKey, {
    bestScore: best.bestScore,
    bestStreak: best.bestStreak,
    playCount: best.playCount,
  });
}

/** Test-only: drop the module-level cache between cases. */
export function __resetPersonalBestCache() {
  cache.clear();
}
