import { useEffect, useState, useCallback } from 'react';
import {
  getCachedStreak,
  setCachedStreak,
  getPendingEvents,
  addPendingEvent,
  clearPendingEvents,
  StreakEvent,
} from '../lib/streakDB';
import { notify } from '../lib/notifications';
import { useApi } from '../services/api';

export function useStreak() {
  const [streak, setStreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const api = useApi();

  function formatUTCDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function isoToUTCDateString(iso: string | null): string | null {
    if (!iso) return null;
    return formatUTCDateString(new Date(iso));
  }

  function parseUTCDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  function getUTCMidnightDates() {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayOfWeekUTC = todayUTC.getUTCDay();
    const lastSundayUTC = new Date(todayUTC);
    lastSundayUTC.setUTCDate(todayUTC.getUTCDate() - dayOfWeekUTC);
    return { todayUTC, lastSundayUTC };
  }

  useEffect(() => {
    async function load() {
      try {
        const [cached, server] = await Promise.all([
          getCachedStreak(),
          api.get("/api/gamification/streak").catch(() => null),
        ]);

        const fallback = {
          currentStreak: 0,
          longestStreak: 0,
          lastCompletedAt: null,
          serverDateUTC: new Date().toISOString(),
          streakDays: [],
        };

        const base = server || cached || fallback;
        const { todayUTC, lastSundayUTC } = getUTCMidnightDates();
        base.streakDays = (base.streakDays || []).filter((dayStr: string) => {
          const dayDate = parseUTCDate(dayStr);
          return dayDate >= lastSundayUTC && dayDate <= todayUTC;
        });
        base.streakDays.sort();
        setStreak(base);
        setCachedStreak(base);
      } catch (err) {
        console.error("Failed to load streak data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [api]);

  function applyEventLocally(event: StreakEvent, current: any) {
    const eventDay = isoToUTCDateString(event.completedAt);
    const lastCompletedDay = isoToUTCDateString(current.lastCompletedAt || null);
    if (!eventDay || eventDay === lastCompletedDay) return current;

    const updatedStreakDaysSet = new Set(current.streakDays || []);
    updatedStreakDaysSet.add(eventDay);
    const updatedStreakDays = Array.from(updatedStreakDaysSet).sort();

    const today = parseUTCDate(eventDay);
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);

    let newCurrentStreak = 1;
    if (lastCompletedDay) {
      const lastDate = parseUTCDate(lastCompletedDay);
      if (lastDate.getTime() === yesterday.getTime()) {
        newCurrentStreak = (current.currentStreak || 0) + 1;
      }
    }

    const newLongestStreak = Math.max(current.longestStreak || 0, newCurrentStreak);
    return {
      currentStreak: Math.min(newCurrentStreak, 30),
      longestStreak: newLongestStreak,
      lastCompletedAt: event.completedAt,
      serverDateUTC: new Date().toISOString(),
      streakDays: updatedStreakDays,
    };
  }

  const completeModule = useCallback(async (moduleId: string) => {
    const completedAt = new Date().toISOString();
    const event: StreakEvent = { completedAt, moduleId };

    const newStreak = applyEventLocally(event, streak || {});
    setStreak(newStreak);
    await setCachedStreak(newStreak);
    await addPendingEvent(event);
  }, [streak]);

  const processQueue = useCallback(async () => {
  const pending = await getPendingEvents();
  if (pending.length === 0) return;

  try {
    const server = await api.get("/api/gamification/streak");

    const seen = new Set<string>();
    const deduped: StreakEvent[] = [];

    pending
      .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
      .forEach((event) => {
        const day = isoToUTCDateString(event.completedAt);
        if (day && !seen.has(day)) {
          seen.add(day);
          deduped.push(event);
        }
      });

    for (const event of deduped) {
      await api.post("/api/gamification/streak", {
        completedAt: event.completedAt,
        moduleId: event.moduleId,
        // Add any other required fields like studentId here if needed
      });
    }

    const updated = await api.get("/api/gamification/streak");
    setStreak(updated);
    await setCachedStreak(updated);
    await clearPendingEvents();
  } catch (err) {
    console.error("Failed to sync streak:", err);
  }
}, [api]);

  useEffect(() => {
    if (!streak?.lastCompletedAt) return;

    const now = new Date();
    const lastCompleted = new Date(streak.lastCompletedAt);
    const diffMs = now.getTime() - lastCompleted.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours > 12 && diffHours <= 24) {
      notify({
        title: 'Keep your streak!',
        body: 'Log in today to keep the fire going',
        type: 'info',
      });
    }
  }, [streak?.lastCompletedAt]);

  useEffect(() => {
    window.addEventListener('online', processQueue);
    return () => window.removeEventListener('online', processQueue);
  }, [processQueue]);

  useEffect(() => {
    function handleSimulateCompleteModule(e: any) {
      const { moduleId } = e.detail || {};
      completeModule(moduleId || 'test-module');
    }
    window.addEventListener('simulateCompleteModule', handleSimulateCompleteModule);
    return () => window.removeEventListener('simulateCompleteModule', handleSimulateCompleteModule);
  }, [completeModule]);

  return { streak, loading, completeModule, processQueue };
}

