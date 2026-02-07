import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeStreakFromProgress, ProgressLike } from "../streakFromProgress";

describe("computeStreakFromProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Helper to create a date string at noon local time for a given offset from "today"
   */
  function makeDate(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(12, 0, 0, 0);
    return d.toISOString();
  }

  it("returns zeros when no progress", () => {
    // Set a fixed date: Wednesday, Jan 15, 2025
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const result = computeStreakFromProgress([]);

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.didCompleteToday).toBe(false);
    expect(result.dayKeys).toEqual([]);
    expect(result.lastCompletedDayKey).toBe(null);
    expect(result.daysThisWeek).toBe(0);
  });

  it("returns streak=1 for one completion today", () => {
    // Set a fixed date: Wednesday, Jan 15, 2025
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      { status: "COMPLETED", updatedAt: makeDate(0) }, // today
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.didCompleteToday).toBe(true);
    expect(result.lastCompletedDayKey).toBe("2025-01-15");
  });

  it("returns streak=3 for 3 consecutive days ending today", () => {
    // Set a fixed date: Wednesday, Jan 15, 2025
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      { status: "COMPLETED", updatedAt: makeDate(0) }, // today (Jan 15)
      { status: "COMPLETED", updatedAt: makeDate(1) }, // yesterday (Jan 14)
      { status: "COMPLETED", updatedAt: makeDate(2) }, // 2 days ago (Jan 13)
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.didCompleteToday).toBe(true);
  });

  it("returns currentStreak=0 when last completion was 3 days ago", () => {
    // Set a fixed date: Wednesday, Jan 15, 2025
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      { status: "COMPLETED", updatedAt: makeDate(3) }, // 3 days ago (Jan 12)
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(1);
    expect(result.didCompleteToday).toBe(false);
    expect(result.lastCompletedDayKey).toBe("2025-01-12");
  });

  it("continues streak from yesterday even without completion today", () => {
    // Set a fixed date: Wednesday, Jan 15, 2025
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      { status: "COMPLETED", updatedAt: makeDate(1) }, // yesterday (Jan 14)
      { status: "COMPLETED", updatedAt: makeDate(2) }, // 2 days ago (Jan 13)
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.didCompleteToday).toBe(false);
  });

  it("calculates longestStreak correctly when there are gaps", () => {
    // Set a fixed date: Wednesday, Jan 15, 2025
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      // Current streak: just today
      { status: "COMPLETED", updatedAt: makeDate(0) }, // today (Jan 15)
      // Gap of 2 days
      // Previous streak of 4 days
      { status: "COMPLETED", updatedAt: makeDate(3) }, // Jan 12
      { status: "COMPLETED", updatedAt: makeDate(4) }, // Jan 11
      { status: "COMPLETED", updatedAt: makeDate(5) }, // Jan 10
      { status: "COMPLETED", updatedAt: makeDate(6) }, // Jan 9
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(4);
  });

  it("weekDaysActive has length 7 and corresponds to Sun..Sat", () => {
    // Set a fixed date: Wednesday, Jan 15, 2025
    // Week starts: Sunday Jan 12
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      { status: "COMPLETED", updatedAt: new Date(2025, 0, 12, 12).toISOString() }, // Sunday
      { status: "COMPLETED", updatedAt: new Date(2025, 0, 14, 12).toISOString() }, // Tuesday
      { status: "COMPLETED", updatedAt: new Date(2025, 0, 15, 12).toISOString() }, // Wednesday (today)
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.weekDaysActive).toHaveLength(7);
    // Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    expect(result.weekDaysActive[0]).toBe(true);  // Sunday
    expect(result.weekDaysActive[1]).toBe(false); // Monday
    expect(result.weekDaysActive[2]).toBe(true);  // Tuesday
    expect(result.weekDaysActive[3]).toBe(true);  // Wednesday
    expect(result.weekDaysActive[4]).toBe(false); // Thursday
    expect(result.weekDaysActive[5]).toBe(false); // Friday
    expect(result.weekDaysActive[6]).toBe(false); // Saturday
    expect(result.daysThisWeek).toBe(3);
  });

  it("ignores non-COMPLETED status", () => {
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      { status: "IN_PROGRESS", updatedAt: makeDate(0) },
      { status: "STARTED", updatedAt: makeDate(1) },
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.dayKeys).toEqual([]);
  });

  it("ignores invalid updatedAt values", () => {
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const progress: ProgressLike[] = [
      { status: "COMPLETED", updatedAt: null },
      { status: "COMPLETED", updatedAt: "invalid-date" },
      { status: "COMPLETED", updatedAt: makeDate(0) }, // valid
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.dayKeys).toHaveLength(1);
  });

  it("counts multiple completions on same day as 1 day", () => {
    vi.setSystemTime(new Date(2025, 0, 15, 10, 0, 0));

    const today = new Date(2025, 0, 15);
    const progress: ProgressLike[] = [
      { status: "COMPLETED", updatedAt: new Date(today.setHours(9)).toISOString() },
      { status: "COMPLETED", updatedAt: new Date(today.setHours(14)).toISOString() },
      { status: "COMPLETED", updatedAt: new Date(today.setHours(18)).toISOString() },
    ];

    const result = computeStreakFromProgress(progress);

    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.dayKeys).toEqual(["2025-01-15"]);
  });
});
