/**
 * Pathways Gamification 1.5 — XP, levels, streaks, badges, daily goals.
 *
 * Everything in this module is additive and idempotent where it matters
 * (module completion can only award XP once per user; lab completion only
 * once per lab slug per user; badges are unique-keyed; daily-goal bonus
 * awards only when bonusAwarded was false).
 *
 * Designed for the second-chance-learner audience:
 *  - XP is positive-only (no deductions).
 *  - Streaks include a weekly "Streak Freeze" that absorbs one missed day
 *    without shaming the student.
 *  - Streak reset tone lives client-side ("Welcome back…"), but this module
 *    avoids emitting reset signals so the UI can frame them positively.
 */
import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

// ─── XP awards table ───────────────────────────────────────────────────────

export const XP_AWARDS = {
  SECTION_COMPLETE: 10,
  QUIZ_ANSWER_CORRECT: 5,
  QUIZ_COMPLETE: 25,
  HOMEWORK_SUBMITTED: 30,
  MODULE_COMPLETE: 50,
  LAB_COMPLETE: 20,
  LAB_HIGH_SCORE: 30,
  DAILY_GOAL_ALL_COMPLETE: 25,
  STREAK_MILESTONE_3: 0, // streak_starter badge has its own XP
  STREAK_MILESTONE_7: 50,
  STREAK_MILESTONE_30: 200,
} as const;

// ─── Badge catalog ─────────────────────────────────────────────────────────

export interface BadgeDef {
  name: string;
  description: string;
  xp: number;
  icon: string;
}

export const BADGES: Record<string, BadgeDef> = {
  // Engagement
  cyber_curious: {
    name: "Cyber Curious",
    description: "Completed your first module",
    xp: 50,
    icon: "🛡",
  },
  reader: {
    name: "Reader",
    description: "Completed all reading sections in a module",
    xp: 30,
    icon: "📖",
  },
  streak_starter: {
    name: "Streak Starter",
    description: "3-day streak",
    xp: 30,
    icon: "🔥",
  },
  streak_warrior: {
    name: "Streak Warrior",
    description: "7-day streak",
    xp: 50,
    icon: "⚡",
  },
  streak_legend: {
    name: "Streak Legend",
    description: "30-day streak",
    xp: 200,
    icon: "🌟",
  },
  polyglot: {
    name: "Polyglot",
    description: "Used the platform in two languages",
    xp: 40,
    icon: "🌐",
  },
  // Skill (lab-based)
  phishing_hunter: {
    name: "Phishing Hunter",
    description: "Perfect score in Phishing Showdown",
    xp: 75,
    icon: "🎯",
  },
  password_pro: {
    name: "Password Pro",
    description: "Completed Password Strength Lab",
    xp: 50,
    icon: "🔑",
  },
  sandbox_survivor: {
    name: "Sandbox Survivor",
    description: "Completed a lab without hints",
    xp: 40,
    icon: "🧪",
  },
  // Behavior
  compliance_aware: {
    name: "Compliance Aware",
    description: "Engaged with all GRC Lens callouts in a track",
    xp: 40,
    icon: "📋",
  },
  helper: {
    name: "Helper",
    description: "Recognized by facilitator for helping a peer",
    xp: 60,
    icon: "🤝",
  },
  // Portfolio
  threat_modeler: {
    name: "Threat Modeler",
    description: "Submitted a threat model",
    xp: 75,
    icon: "🗺",
  },
  incident_reporter: {
    name: "Incident Reporter",
    description: "Submitted incident response artifact",
    xp: 75,
    icon: "📝",
  },
  capstone_creator: {
    name: "Capstone Creator",
    description: "Submitted final capstone",
    xp: 200,
    icon: "🏆",
  },
};

export type BadgeSlug = keyof typeof BADGES;

// ─── Level math ────────────────────────────────────────────────────────────
// Curve: early levels feel fast, later ones feel earned. Used by xpToNextLevel
// and calculateLevel — keep both in sync.

function costForLevel(level: number): number {
  if (level <= 10) return 50;
  if (level <= 25) return 100;
  if (level <= 50) return 200;
  if (level <= 75) return 400;
  return 800;
}

export function calculateLevel(totalXp: number): number {
  let level = 1;
  let xpNeeded = 0;
  while (level < 100) {
    const cost = costForLevel(level);
    if (totalXp < xpNeeded + cost) return level;
    xpNeeded += cost;
    level++;
  }
  // Level 100 requires an extra 2000 XP beyond the 99-cap so it stays meaningful.
  return totalXp >= xpNeeded + 2000 ? 100 : 99;
}

export interface LevelTier {
  tier: string;
  color: string;
}

export function getLevelTier(level: number): LevelTier {
  if (level <= 10) return { tier: "Recruit", color: "slate" };
  if (level <= 25) return { tier: "Analyst Trainee", color: "cyan" };
  if (level <= 50) return { tier: "Cyber Apprentice", color: "indigo" };
  if (level <= 75) return { tier: "Operative", color: "amber" };
  if (level <= 99) return { tier: "Specialist", color: "emerald" };
  return { tier: "Pro", color: "fuchsia" };
}

export function xpToNextLevel(
  totalXp: number,
  currentLevel: number,
): { current: number; needed: number } {
  let xpForCurrentLevel = 0;
  for (let l = 1; l < currentLevel; l++) {
    xpForCurrentLevel += costForLevel(l);
  }
  const needed = currentLevel >= 100 ? 0 : costForLevel(currentLevel);
  return {
    current: Math.max(0, totalXp - xpForCurrentLevel),
    needed,
  };
}

// ─── Core: award XP ────────────────────────────────────────────────────────

export interface AwardResult {
  amount: number;
  newTotal: number;
  newLevel: number;
  leveledUp: boolean;
  tier: LevelTier;
  /** Badges earned as a side effect of this award (level up, streak ride). */
  newBadges: Array<{ slug: BadgeSlug; name: string; description: string; icon: string }>;
}

export async function awardXp(
  userId: string,
  amount: number,
  source: string,
  sourceRefId?: string,
  metadata?: Record<string, unknown>,
): Promise<AwardResult> {
  if (amount <= 0) {
    const state = await getOrCreateGamification(userId);
    return {
      amount: 0,
      newTotal: state.totalXp,
      newLevel: state.currentLevel,
      leveledUp: false,
      tier: getLevelTier(state.currentLevel),
      newBadges: [],
    };
  }

  // 1. Append to event log.
  await prisma.pathwayXpEvent.create({
    data: {
      userId,
      amount,
      source,
      sourceRefId: sourceRefId ?? null,
      metadata: metadata === undefined
        ? Prisma.JsonNull
        : (metadata as Prisma.InputJsonValue),
    },
  });

  // 2. Update cached state.
  const before = await getOrCreateGamification(userId);
  const newTotal = before.totalXp + amount;
  const newLevel = calculateLevel(newTotal);

  await prisma.pathwayGamification.update({
    where: { userId },
    data: { totalXp: newTotal, currentLevel: newLevel },
  });

  // 3. Update daily-goal progress (the XP-earned goal). Only the consumer
  //    callsite knows whether the action was a section/lab — that's tracked
  //    separately via updateDailyGoalProgress.
  await updateDailyGoalForXp(userId, amount);

  return {
    amount,
    newTotal,
    newLevel,
    leveledUp: newLevel > before.currentLevel,
    tier: getLevelTier(newLevel),
    newBadges: [],
  };
}

async function getOrCreateGamification(userId: string) {
  return prisma.pathwayGamification.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

// ─── Idempotency helpers ───────────────────────────────────────────────────

async function alreadyAwarded(
  userId: string,
  source: string,
  sourceRefId: string,
): Promise<boolean> {
  const hit = await prisma.pathwayXpEvent.findFirst({
    where: { userId, source, sourceRefId },
    select: { id: true },
  });
  return !!hit;
}

/** Award XP only if no prior event matches (userId, source, sourceRefId). */
export async function awardXpOnce(
  userId: string,
  amount: number,
  source: string,
  sourceRefId: string,
  metadata?: Record<string, unknown>,
): Promise<AwardResult | null> {
  if (await alreadyAwarded(userId, source, sourceRefId)) return null;
  return awardXp(userId, amount, source, sourceRefId, metadata);
}

// ─── Badge awards ──────────────────────────────────────────────────────────

export interface BadgeAwardResult {
  slug: BadgeSlug;
  name: string;
  description: string;
  icon: string;
  award: AwardResult;
}

export async function awardBadge(
  userId: string,
  slug: BadgeSlug,
  metadata?: Record<string, unknown>,
): Promise<BadgeAwardResult | null> {
  const def = BADGES[slug];
  if (!def) return null;

  // Idempotent — unique (userId, slug) constraint.
  const existing = await prisma.pathwayBadge.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  if (existing) return null;

  await prisma.pathwayBadge.create({
    data: {
      userId,
      slug,
      metadata: metadata === undefined
        ? Prisma.JsonNull
        : (metadata as Prisma.InputJsonValue),
    },
  });

  const award = await awardXp(userId, def.xp, "badge_earned", slug, {
    badgeName: def.name,
  });

  return { slug, name: def.name, description: def.description, icon: def.icon, award };
}

// ─── Streak system ─────────────────────────────────────────────────────────

function toUtcDate(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function daysBetweenUtc(a: Date, b: Date): number {
  const ms = toUtcDate(b).getTime() - toUtcDate(a).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export interface ActivityResult {
  streak: number;
  longestStreak: number;
  freezeUsed: boolean;
  milestoneBadges: BadgeAwardResult[];
}

/**
 * Record one student "active today" tick. Idempotent within a UTC day.
 * Handles streak extension, 1-day-gap freeze absorption, and milestone
 * badge awards (3 / 7 / 30 days).
 */
export async function recordActivity(userId: string): Promise<ActivityResult> {
  const state = await getOrCreateGamification(userId);
  const today = toUtcDate(new Date());

  await maybeRefreshFreezes(userId, state, today);

  if (!state.lastActiveDate) {
    return await applyStreak(userId, 1, false);
  }

  const lastActive = toUtcDate(new Date(state.lastActiveDate));
  const gap = daysBetweenUtc(lastActive, today);

  if (gap === 0) {
    return {
      streak: state.currentStreak,
      longestStreak: state.longestStreak,
      freezeUsed: false,
      milestoneBadges: [],
    };
  }

  if (gap === 1) {
    return await applyStreak(userId, state.currentStreak + 1, false);
  }

  // gap >= 2. Use a freeze if it's a 2-day gap and one is available.
  // (We don't burn freezes on 3+ day gaps — those reset.)
  const fresh = await prisma.pathwayGamification.findUnique({ where: { userId } });
  if (gap === 2 && (fresh?.streakFreezesAvailable ?? 0) > 0) {
    await prisma.pathwayGamification.update({
      where: { userId },
      data: {
        streakFreezesAvailable: { decrement: 1 },
        streakFreezesUsedThisWeek: { increment: 1 },
        lastActiveDate: today,
      },
    });
    return {
      streak: state.currentStreak,
      longestStreak: state.longestStreak,
      freezeUsed: true,
      milestoneBadges: [],
    };
  }

  // Reset.
  return await applyStreak(userId, 1, false);
}

async function applyStreak(
  userId: string,
  newStreak: number,
  freezeUsed: boolean,
): Promise<ActivityResult> {
  const state = await prisma.pathwayGamification.findUnique({ where: { userId } });
  const longest = Math.max(state?.longestStreak ?? 0, newStreak);
  const today = toUtcDate(new Date());

  await prisma.pathwayGamification.update({
    where: { userId },
    data: {
      currentStreak: newStreak,
      longestStreak: longest,
      lastActiveDate: today,
    },
  });

  const milestoneBadges: BadgeAwardResult[] = [];
  if (newStreak === 3) {
    const b = await awardBadge(userId, "streak_starter");
    if (b) milestoneBadges.push(b);
  }
  if (newStreak === 7) {
    const award = await awardXpOnce(
      userId,
      XP_AWARDS.STREAK_MILESTONE_7,
      "streak_bonus",
      "7-day",
    );
    const b = await awardBadge(userId, "streak_warrior");
    if (b) milestoneBadges.push(b);
    void award;
  }
  if (newStreak === 30) {
    await awardXpOnce(
      userId,
      XP_AWARDS.STREAK_MILESTONE_30,
      "streak_bonus",
      "30-day",
    );
    const b = await awardBadge(userId, "streak_legend");
    if (b) milestoneBadges.push(b);
  }

  return { streak: newStreak, longestStreak: longest, freezeUsed, milestoneBadges };
}

async function maybeRefreshFreezes(
  userId: string,
  state: { lastFreezeRefresh: Date | null; streakFreezesAvailable: number },
  today: Date,
) {
  // Refresh once per ISO week: if last refresh was 7+ days ago, top up to 1
  // freeze available and zero out the weekly counter.
  if (state.lastFreezeRefresh) {
    const gap = daysBetweenUtc(state.lastFreezeRefresh, today);
    if (gap < 7) return;
  }
  await prisma.pathwayGamification.update({
    where: { userId },
    data: {
      streakFreezesAvailable: Math.max(state.streakFreezesAvailable, 1),
      streakFreezesUsedThisWeek: 0,
      lastFreezeRefresh: today,
    },
  });
}

// ─── Daily goals ───────────────────────────────────────────────────────────

export interface DailyGoalItem {
  slug: "complete_section" | "earn_xp" | "try_lab_or_quiz";
  label: string;
  target: number;
  current: number;
  completed: boolean;
}

const DEFAULT_GOALS: DailyGoalItem[] = [
  { slug: "complete_section", label: "Complete 1 section", target: 1, current: 0, completed: false },
  { slug: "earn_xp", label: "Earn 50 XP", target: 50, current: 0, completed: false },
  { slug: "try_lab_or_quiz", label: "Try 1 lab or quiz", target: 1, current: 0, completed: false },
];

export async function getOrCreateDailyGoals(userId: string) {
  const today = toUtcDate(new Date());
  const found = await prisma.pathwayDailyGoal.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (found) return found;
  return prisma.pathwayDailyGoal.create({
    data: {
      userId,
      date: today,
      goals: DEFAULT_GOALS as unknown as Prisma.InputJsonValue,
    },
  });
}

async function commitGoals(
  goalsRow: { id: string; allComplete: boolean; bonusAwarded: boolean; userId: string },
  goals: DailyGoalItem[],
) {
  const allComplete = goals.every((g) => g.completed);
  const shouldAwardBonus = allComplete && !goalsRow.bonusAwarded;
  await prisma.pathwayDailyGoal.update({
    where: { id: goalsRow.id },
    data: {
      goals: goals as unknown as Prisma.InputJsonValue,
      allComplete,
      bonusAwarded: shouldAwardBonus ? true : goalsRow.bonusAwarded,
    },
  });
  if (shouldAwardBonus) {
    await awardXp(
      goalsRow.userId,
      XP_AWARDS.DAILY_GOAL_ALL_COMPLETE,
      "daily_goal",
      "all_complete",
    );
  }
}

export async function updateDailyGoalProgress(
  userId: string,
  action: "section" | "lab",
) {
  const goalsRow = await getOrCreateDailyGoals(userId);
  const goals = (goalsRow.goals as unknown as DailyGoalItem[]).map((g) => ({ ...g }));
  let dirty = false;

  for (const g of goals) {
    if (g.completed) continue;
    if (g.slug === "complete_section" && action === "section") {
      g.current += 1;
      if (g.current >= g.target) g.completed = true;
      dirty = true;
    }
    if (g.slug === "try_lab_or_quiz" && action === "lab") {
      g.current += 1;
      if (g.current >= g.target) g.completed = true;
      dirty = true;
    }
  }

  if (!dirty) return;
  await commitGoals(goalsRow, goals);
}

/** Internal — bumps the XP-earned daily goal alongside any XP award. */
async function updateDailyGoalForXp(userId: string, amount: number) {
  const goalsRow = await getOrCreateDailyGoals(userId);
  const goals = (goalsRow.goals as unknown as DailyGoalItem[]).map((g) => ({ ...g }));
  let dirty = false;
  for (const g of goals) {
    if (g.completed) continue;
    if (g.slug === "earn_xp") {
      g.current += amount;
      if (g.current >= g.target) g.completed = true;
      dirty = true;
    }
  }
  if (!dirty) return;
  await commitGoals(goalsRow, goals);
}

// ─── Helpers for facilitator queries ───────────────────────────────────────

export interface CohortGamificationSummary {
  enrolled: number;
  avgLevel: number;
  totalXp: number;
  topBadge: { slug: string; name: string; count: number } | null;
  streakBuckets: { zero: number; oneToThree: number; fourToSeven: number; eightToFourteen: number; fifteenPlus: number };
  dailyGoalRateToday: { complete: number; total: number };
  topByXpThisWeek: Array<{ userId: string; name: string | null; email: string | null; xp: number }>;
}

export async function summarizeCohortGamification(
  userIds: string[],
): Promise<CohortGamificationSummary> {
  const enrolled = userIds.length;
  if (enrolled === 0) {
    return {
      enrolled: 0,
      avgLevel: 0,
      totalXp: 0,
      topBadge: null,
      streakBuckets: {
        zero: 0,
        oneToThree: 0,
        fourToSeven: 0,
        eightToFourteen: 0,
        fifteenPlus: 0,
      },
      dailyGoalRateToday: { complete: 0, total: 0 },
      topByXpThisWeek: [],
    };
  }

  const gam = await prisma.pathwayGamification.findMany({
    where: { userId: { in: userIds } },
  });

  // Treat unseeded students as level 1 / streak 0 in the aggregate.
  const totalLevel = gam.reduce((sum, g) => sum + g.currentLevel, 0) +
    (enrolled - gam.length); // each missing user contributes 1
  const avgLevel = Math.round((totalLevel / enrolled) * 10) / 10;
  const totalXp = gam.reduce((sum, g) => sum + g.totalXp, 0);

  const streakBuckets = {
    zero: 0,
    oneToThree: 0,
    fourToSeven: 0,
    eightToFourteen: 0,
    fifteenPlus: 0,
  };
  for (const uid of userIds) {
    const s = gam.find((g) => g.userId === uid)?.currentStreak ?? 0;
    if (s === 0) streakBuckets.zero++;
    else if (s <= 3) streakBuckets.oneToThree++;
    else if (s <= 7) streakBuckets.fourToSeven++;
    else if (s <= 14) streakBuckets.eightToFourteen++;
    else streakBuckets.fifteenPlus++;
  }

  const badges = await prisma.pathwayBadge.findMany({
    where: { userId: { in: userIds } },
    select: { slug: true },
  });
  const badgeCounts = new Map<string, number>();
  for (const b of badges) badgeCounts.set(b.slug, (badgeCounts.get(b.slug) ?? 0) + 1);
  let topBadge: { slug: string; name: string; count: number } | null = null;
  for (const [slug, count] of badgeCounts) {
    if (!topBadge || count > topBadge.count) {
      topBadge = { slug, name: BADGES[slug]?.name ?? slug, count };
    }
  }

  const today = toUtcDate(new Date());
  const goalsToday = await prisma.pathwayDailyGoal.findMany({
    where: { userId: { in: userIds }, date: today },
    select: { allComplete: true },
  });
  const dailyGoalRateToday = {
    complete: goalsToday.filter((g) => g.allComplete).length,
    total: enrolled,
  };

  // XP earned in the last 7 days, per user — for the top-10 list.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const weekly = await prisma.pathwayXpEvent.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, createdAt: { gte: sevenDaysAgo } },
    _sum: { amount: true },
  });
  const userInfo = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(userInfo.map((u) => [u.id, u]));
  const topByXpThisWeek = weekly
    .map((w) => ({
      userId: w.userId,
      name: userMap.get(w.userId)?.name ?? null,
      email: userMap.get(w.userId)?.email ?? null,
      xp: w._sum.amount ?? 0,
    }))
    .filter((r) => r.xp > 0)
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 10);

  return {
    enrolled,
    avgLevel,
    totalXp,
    topBadge,
    streakBuckets,
    dailyGoalRateToday,
    topByXpThisWeek,
  };
}
