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
    let cancelled = false;
    api.getGamePersonalBests().then((bests) => {
      if (cancelled) return;
      for (const b of bests) {
        cache.set(b.gameKey, {
          bestScore: b.bestScore,
          bestStreak: b.bestStreak,
          playCount: b.playCount,
        });
      }
      setPb(cache.get(gameKey) ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [gameKey]);

  return pb;
}

/** Call after a game completes to update the local cache. */
export function updatePersonalBestCache(gameKey: string, score: number, streak: number) {
  const existing = cache.get(gameKey);
  cache.set(gameKey, {
    bestScore: Math.max(existing?.bestScore ?? 0, score),
    bestStreak: Math.max(existing?.bestStreak ?? 0, streak),
    playCount: (existing?.playCount ?? 0) + 1,
  });
}
