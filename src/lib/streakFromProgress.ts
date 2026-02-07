/**
 * Compute streak statistics from progress records.
 * Uses LOCAL day keys (YYYY-MM-DD) derived from Date objects in local time.
 */

export type ProgressLike = {
  status?: string;
  updatedAt?: string | null;
};

export type StreakStats = {
  currentStreak: number;
  longestStreak: number;
  dayKeys: string[];
  weekDaysActive: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  daysThisWeek: number;
  didCompleteToday: boolean;
  lastCompletedDayKey: string | null;
  todayKey: string;
};

/**
 * Get local YYYY-MM-DD key from a Date object
 */
function toLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get the start of the current week (Sunday) in local time
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/**
 * Compute streak statistics from an array of progress records.
 * Only considers records with status === "COMPLETED".
 */
export function computeStreakFromProgress(
  progress: ProgressLike[],
): StreakStats {
  const now = new Date();
  const todayKey = toLocalDayKey(now);

  // Extract unique day keys from completed progress
  const daySet = new Set<string>();
  for (const p of progress) {
    if (p.status !== "COMPLETED" || !p.updatedAt) continue;
    try {
      const date = new Date(p.updatedAt);
      if (isNaN(date.getTime())) continue;
      daySet.add(toLocalDayKey(date));
    } catch {
      // Invalid date, skip
    }
  }

  const dayKeys = Array.from(daySet).sort();

  // Early return if no completions
  if (dayKeys.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      dayKeys: [],
      weekDaysActive: [false, false, false, false, false, false, false],
      daysThisWeek: 0,
      didCompleteToday: false,
      lastCompletedDayKey: null,
      todayKey,
    };
  }

  const lastCompletedDayKey = dayKeys[dayKeys.length - 1];
  const didCompleteToday = lastCompletedDayKey === todayKey;

  // Calculate yesterday's key
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = toLocalDayKey(yesterday);

  // Current streak: only active if last completion is today or yesterday
  let currentStreak = 0;
  if (lastCompletedDayKey === todayKey || lastCompletedDayKey === yesterdayKey) {
    // Count backwards from last completed day
    const lastDate = new Date(lastCompletedDayKey + "T00:00:00");
    let checkDate = new Date(lastDate);

    while (daySet.has(toLocalDayKey(checkDate))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate longest streak across all days
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const key of dayKeys) {
    const date = new Date(key + "T00:00:00");
    if (prevDate === null) {
      tempStreak = 1;
    } else {
      const diff = Math.round(
        (date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    prevDate = date;
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate week days active (Sun=0 through Sat=6)
  const weekStart = getWeekStart(now);
  const weekDaysActive: boolean[] = [false, false, false, false, false, false, false];

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(weekStart);
    checkDate.setDate(checkDate.getDate() + i);
    const checkKey = toLocalDayKey(checkDate);
    weekDaysActive[i] = daySet.has(checkKey);
  }

  const daysThisWeek = weekDaysActive.filter(Boolean).length;

  return {
    currentStreak,
    longestStreak,
    dayKeys,
    weekDaysActive,
    daysThisWeek,
    didCompleteToday,
    lastCompletedDayKey,
    todayKey,
  };
}
