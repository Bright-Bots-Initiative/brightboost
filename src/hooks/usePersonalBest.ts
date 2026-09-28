import { useContext, useEffect, useState } from "react";
import { api } from "@/services/api";
import { AuthContext } from "@/contexts/AuthContext";

export interface PersonalBest {
  bestScore: number;
  bestStreak: number;
  playCount: number;
}

export interface PersonalBestSession {
  readonly userId: string;
  readonly token: string;
}

/** Capture the identity BEFORE issuing a request, never when it resolves. */
export function getPersonalBestSession(): PersonalBestSession | null {
  try {
    const token = localStorage.getItem("bb_access_token");
    const user: unknown = JSON.parse(localStorage.getItem("user") || "null");
    const id =
      user && typeof user === "object" && "id" in user ? user.id : null;
    return token && typeof id === "string" && id ? { userId: id, token } : null;
  } catch {
    return null;
  }
}

export function isPersonalBestSessionCurrent(
  session: PersonalBestSession | null,
): boolean {
  const current = getPersonalBestSession();
  return (
    current?.userId === session?.userId && current?.token === session?.token
  );
}

function keyFor(session: PersonalBestSession, gameKey: string): string {
  // A re-login has a fresh session even if it belongs to the same child.
  // This key stays in memory; never log or persist it.
  return JSON.stringify([session.userId, session.token, gameKey]);
}

let revision = 0;
const cache = new Map<string, { best: PersonalBest; revision: number }>();

/** User- and session-scoped records, including late-response isolation. */
export function usePersonalBest(gameKey: string): PersonalBest | null {
  // Re-render with sign-in/out even when the game remains mounted. Standalone
  // public games also work without a provider and must not issue auth requests.
  useContext(AuthContext);
  const session = getPersonalBestSession();
  const userId = session?.userId;
  const token = session?.token;
  const key = session ? keyFor(session, gameKey) : null;
  const [state, setState] = useState<{
    key: string | null;
    best: PersonalBest | null;
  }>(() => ({
    key,
    best: key ? (cache.get(key)?.best ?? null) : null,
  }));

  useEffect(() => {
    if (!userId || !token || !key) {
      setState({ key: null, best: null });
      return;
    }
    const owner = { userId, token };
    const cached = cache.get(key);
    setState({ key, best: cached?.best ?? null });
    if (cached) return;
    let cancelled = false;
    const startedAt = revision;
    void api
      .getGamePersonalBests()
      .then((bests) => {
        if (cancelled || !isPersonalBestSessionCurrent(owner)) return;
        for (const b of bests) {
          const recordKey = keyFor(owner, b.gameKey);
          // A completion that resolved after this GET began is newer evidence.
          if ((cache.get(recordKey)?.revision ?? -1) > startedAt) continue;
          cache.set(recordKey, {
            best: {
              bestScore: b.bestScore,
              bestStreak: b.bestStreak,
              playCount: b.playCount,
            },
            revision: startedAt,
          });
        }
        setState({ key, best: cache.get(key)?.best ?? null });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gameKey, key, userId, token]);

  // Never paint A's state for even one frame after a change to B/anonymous.
  return key && state.key === key ? state.best : null;
}

/** Adopt only the server record belonging to the request's original session. */
export function updatePersonalBestCache(
  gameKey: string,
  best: PersonalBest,
  session: PersonalBestSession | null = getPersonalBestSession(),
) {
  if (!session || !isPersonalBestSessionCurrent(session)) return;
  cache.set(keyFor(session, gameKey), {
    best: {
      bestScore: best.bestScore,
      bestStreak: best.bestStreak,
      playCount: best.playCount,
    },
    revision: ++revision,
  });
}

/** Test-only: drop cached records between independent cases. */
export function __resetPersonalBestCache() {
  cache.clear();
  revision = 0;
}
