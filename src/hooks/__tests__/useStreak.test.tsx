/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";

const mem: Record<string, any> = {};
vi.mock("../../lib/streakDB", () => {
  return {
    getCachedStreak: vi.fn(async () => undefined as any),
    setCachedStreak: vi.fn(async (v: any) => {
      mem["streak"] = v;
      return "streak-key" as any;
    }),
    getPendingEvents: vi.fn(async () => mem["pending"] || []),
    addPendingEvent: vi.fn(async (e: any) => {
      const arr = mem["pending"] || [];
      arr.push(e);
      mem["pending"] = arr;
      return "pending-key" as any;
    }),
    clearPendingEvents: vi.fn(async () => {
      mem["pending"] = [];
    }),
  };
});

vi.mock("../../lib/xp", () => ({
  grantXp: vi.fn(async () => undefined),
}));

import * as apiModule from "../../services/api";
vi.mock("../../services/api", () => ({
  useApi: vi.fn(),
}));

import { useStreak } from "../useStreak";
import * as streakDB from "../../lib/streakDB";
import * as xp from "../../lib/xp";

function setupApiMock(options?: {
  initialServer?: any;
  afterSync?: any;
  enableBadge?: boolean;
}) {
  const getMock = vi.fn();
  const postMock = vi.fn().mockResolvedValue({});
  const progressMock = { badges: options?.enableBadge ? [] : ["something"] };

  let getCall = 0;
  getMock.mockImplementation(async (endpoint: string) => {
    if (endpoint === "/api/gamification/streak") {
      getCall++;
      if (getCall === 1) return options?.initialServer ?? null;
      return options?.afterSync ?? null;
    }
    if (endpoint === "/api/get-progress") {
      return progressMock;
    }
    return null;
  });

  (apiModule.useApi as any).mockReturnValue({
    get: getMock,
    post: postMock,
    put: vi.fn(),
    delete: vi.fn(),
  } as any);

  return { getMock, postMock };
}

describe("useStreak deterministic behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 10, 12, 0, 0))); // Jan 10, 2025 UTC noon
    (streakDB.clearPendingEvents as any).mockClear?.();
    (streakDB.setCachedStreak as any).mockClear?.();
    (streakDB.getCachedStreak as any).mockClear?.();
    (streakDB.getPendingEvents as any).mockClear?.();
    (streakDB.addPendingEvent as any).mockClear?.();
    (xp.grantXp as any).mockClear?.();
    mem["pending"] = [];
    mem["streak"] = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("increments streak across day boundary deterministically", async () => {
    setupApiMock({ initialServer: null, afterSync: null });

    const { result } = renderHook(() => useStreak());

    await act(async () => {});

    expect(result.current.streak.currentStreak).toBe(0);

    await act(async () => {
      await result.current.completeModule("stem-1");
    });
    expect(result.current.streak.currentStreak).toBe(1);

    vi.setSystemTime(new Date(Date.UTC(2025, 0, 11, 12, 0, 0))); // next day
    await act(async () => {
      await result.current.completeModule("stem-1");
    });
    expect(result.current.streak.currentStreak).toBe(2);
    expect(Array.isArray(result.current.streak.streakDays)).toBe(true);
  });

  it("awards badge on reaching 5-day streak during sync without side-effects", async () => {
    const pendingEvents = Array.from({ length: 5 }).map((_, i) => ({
      completedAt: new Date(Date.UTC(2025, 0, 10 + i, 12, 0, 0)).toISOString(),
      moduleId: "stem-1",
    }));
    (streakDB.getPendingEvents as any).mockResolvedValue(pendingEvents as any);

    const afterSync = {
      currentStreak: 5,
      longestStreak: 5,
      lastCompletedAt: new Date(Date.UTC(2025, 0, 14, 12, 0, 0)).toISOString(),
      serverDateUTC: new Date(Date.UTC(2025, 0, 14, 12, 0, 0)).toISOString(),
      streakDays: pendingEvents.map((e) => e.completedAt.split("T")[0]),
    };

    const { postMock } = setupApiMock({
      initialServer: { currentStreak: 0, longestStreak: 0, lastCompletedAt: null, serverDateUTC: new Date().toISOString(), streakDays: [] },
      afterSync,
      enableBadge: true,
    });

    const { result } = renderHook(() => useStreak());
    await act(async () => {});
    await act(async () => {
      await result.current.processQueue();
    });

    expect(postMock).toHaveBeenCalledWith("/api/add-badge", { badge: "Daily-Challenge" });
  });
});
