/**
 * useChallenges — fetch the student's CTF progress map.
 *
 * The server returns a compact { totalSolved, totalAttempts, solveMap,
 * hintsBySlug }. The hook layers full challenge content from the
 * client catalog on top so the UI can render the ladder with solve state.
 */
import { useCallback, useEffect, useState } from "react";
import { ALL_CTF_CHALLENGES, type CtfChallenge } from "@/constants/ctfChallenges";

export interface ChallengeProgress {
  totalSolved: number;
  totalAttempts: number;
  /** challengeSlug → solve metadata, only present once solved */
  solveMap: Record<string, { solvedAt: string; hintsUsed: number }>;
  /** challengeSlug → highest hints used on that challenge (0..3) */
  hintsBySlug: Record<string, number>;
}

export interface DisplayChallenge extends CtfChallenge {
  solved: boolean;
  solvedAt: string | null;
  hintsUsed: number;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useChallenges() {
  const [progress, setProgress] = useState<ChallengeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pathways/challenges", { headers: authHeader() });
      if (!res.ok) {
        setProgress({ totalSolved: 0, totalAttempts: 0, solveMap: {}, hintsBySlug: {} });
        return;
      }
      const data = (await res.json()) as ChallengeProgress;
      setProgress(data);
    } catch {
      setProgress({ totalSolved: 0, totalAttempts: 0, solveMap: {}, hintsBySlug: {} });
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  const challenges: DisplayChallenge[] = ALL_CTF_CHALLENGES.map((c) => {
    const solve = progress?.solveMap[c.slug];
    return {
      ...c,
      solved: !!solve,
      solvedAt: solve?.solvedAt ?? null,
      hintsUsed: progress?.hintsBySlug[c.slug] ?? 0,
    };
  });

  return { challenges, progress, loading, refresh: load };
}
