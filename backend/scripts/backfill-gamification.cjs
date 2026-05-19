#!/usr/bin/env node
/**
 * Gamification backfill — one-time grant of XP + badges for students who
 * completed Pathways work before the Phase 1.5 XP system shipped.
 *
 * IDEMPOTENT. Walks existing PathwayMilestone / PathwayLabAttempt /
 * PathwayCtfSolve rows and writes XP events keyed on (userId, source,
 * sourceRefId) — so re-running this script is safe. Badges are upserted
 * via the existing unique (userId, slug) constraint.
 *
 * Run locally:  cd backend && node scripts/backfill-gamification.cjs
 * In Railway:   set RUN_GAMIFICATION_BACKFILL=true, deploy; predeploy.sh
 *               runs the script after migrations. Unset the var after
 *               (or leave it — the script is idempotent).
 *
 * The level curve here MUST stay in sync with calculateLevel() in
 * backend/src/services/gamification.ts (Recruit 1-10 @ 50 XP each, etc.).
 * If the curve changes there, change it here too.
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// XP values mirror backend/src/services/gamification.ts. Keep these in
// sync if the central award table changes.
const XP = {
  SECTION_COMPLETE: 10,
  QUIZ_ANSWER_CORRECT: 5,
  QUIZ_COMPLETE: 25,
  HOMEWORK_SUBMITTED: 30,
  MODULE_COMPLETE: 50,
  LAB_COMPLETE: 20,
  CTF_EASY: 10,
  CTF_MEDIUM: 25,
  CTF_HARD: 50,
  CTF_EXPERT: 100,
};

const BADGE_XP = {
  cyber_curious: 50,
  reader: 30,
  phishing_hunter: 75,
  password_pro: 50,
  sandbox_survivor: 40,
  first_flag: 50,
  flag_hunter: 100,
  flag_legend: 250,
  cryptography_master: 150,
  web_master: 150,
  forensics_master: 150,
  networks_master: 150,
  cyber_generalist: 200,
  capstone_creator: 200,
  threat_modeler: 75,
  incident_reporter: 75,
};

const CAPSTONE_SLUG = "capstone-security-plan";

function calculateLevel(totalXp) {
  let level = 1;
  let xpNeeded = 0;
  while (level < 100) {
    let cost;
    if (level <= 10) cost = 50;
    else if (level <= 25) cost = 100;
    else if (level <= 50) cost = 200;
    else if (level <= 75) cost = 400;
    else cost = 800;

    if (totalXp < xpNeeded + cost) return level;
    xpNeeded += cost;
    level++;
  }
  if (totalXp >= xpNeeded + 2000) return 100;
  return 99;
}

/** Awards XP only when no prior event exists with (userId, source, sourceRefId). */
async function awardXpEvent(userId, amount, source, sourceRefId, metadata) {
  const existing = await prisma.pathwayXpEvent.findFirst({
    where: { userId, source, sourceRefId },
    select: { id: true },
  });
  if (existing) return 0;

  await prisma.pathwayXpEvent.create({
    data: {
      userId,
      amount,
      source,
      sourceRefId,
      metadata: metadata ?? null,
    },
  });
  return amount;
}

/** Awards a badge if not already earned. Also emits the badge_earned XP
 *  event (also idempotent via the same source+ref key). */
async function awardBadgeIfMissing(userId, slug, metadata) {
  const existing = await prisma.pathwayBadge.findUnique({
    where: { userId_slug: { userId, slug } },
  });
  if (existing) return 0;

  await prisma.pathwayBadge.create({
    data: { userId, slug, metadata: metadata ?? null },
  });

  const xpAmount = BADGE_XP[slug] || 0;
  if (xpAmount > 0) {
    await awardXpEvent(userId, xpAmount, "badge_earned", slug, {
      badgeName: slug,
      backfilled: true,
    });
  }
  return xpAmount;
}

async function backfillUser(user) {
  console.log(`\n=== Backfilling ${user.email ?? "(no email)"} (${user.name}) ===`);
  let totalAwarded = 0;
  const badgesAwarded = [];

  // ── 1. Milestones: section / quiz / homework / module-complete XP ──────
  const milestones = await prisma.pathwayMilestone.findMany({
    where: { userId: user.id },
  });

  let completedModuleCount = 0;
  let anyReadingCompleted = false;

  const SECTION_FIELDS = [
    "hookCompleted",
    "readingCompleted",
    "lessonCompleted",
    "practiceCompleted",
    "homeworkSubmitted",
    "quizCompleted",
  ];

  for (const m of milestones) {
    for (const field of SECTION_FIELDS) {
      if (m[field]) {
        totalAwarded += await awardXpEvent(
          user.id,
          XP.SECTION_COMPLETE,
          "section",
          `${m.moduleSlug}:${field}`,
          { trackSlug: m.trackSlug, backfilled: true },
        );
      }
    }

    // Quiz XP (base 25 + 5 × estimated correct answers from score).
    // Quiz banks vary in length; we cap correct-count at a sane bound.
    if (m.quizCompleted && m.quizScore !== null && m.quizScore !== undefined) {
      const estimatedCorrect = Math.min(
        4,
        Math.round((m.quizScore / 100) * 4),
      );
      const quizXp = XP.QUIZ_COMPLETE + estimatedCorrect * XP.QUIZ_ANSWER_CORRECT;
      totalAwarded += await awardXpEvent(
        user.id,
        quizXp,
        "quiz",
        m.moduleSlug,
        { score: m.quizScore, backfilled: true },
      );
    }

    if (m.homeworkSubmitted) {
      totalAwarded += await awardXpEvent(
        user.id,
        XP.HOMEWORK_SUBMITTED,
        "homework",
        m.moduleSlug,
        { backfilled: true },
      );
    }

    if (m.status === "completed") {
      totalAwarded += await awardXpEvent(
        user.id,
        XP.MODULE_COMPLETE,
        "module_complete",
        m.moduleSlug,
        { trackSlug: m.trackSlug, backfilled: true },
      );
      completedModuleCount++;
    }

    if (m.readingCompleted) anyReadingCompleted = true;
  }

  // ── 2. Module-derived badges ───────────────────────────────────────────
  if (completedModuleCount >= 1) {
    const a = await awardBadgeIfMissing(user.id, "cyber_curious");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("cyber_curious");
    }
  }
  if (anyReadingCompleted) {
    const a = await awardBadgeIfMissing(user.id, "reader");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("reader");
    }
  }
  const capstoneSubmitted = milestones.find(
    (m) => m.moduleSlug === CAPSTONE_SLUG && m.homeworkSubmitted,
  );
  if (capstoneSubmitted) {
    const a = await awardBadgeIfMissing(user.id, "capstone_creator");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("capstone_creator");
    }
  }

  // ── 3. Labs: LAB_COMPLETE per slug (first attempt only) + badges ───────
  // Every PathwayLabAttempt row represents a completion (no `completed`
  // flag exists in the schema). We award LAB_COMPLETE once per slug
  // (idempotent via awardXpEvent). We intentionally skip backfilling the
  // LAB_HIGH_SCORE bonus since reconstructing the "beat your best" event
  // chain from history is error-prone; future improvements will fire
  // those normally.
  const labAttempts = await prisma.pathwayLabAttempt.findMany({
    where: { userId: user.id },
    orderBy: { completedAt: "asc" },
  });

  const seenLabs = new Set();
  const bestScoreByLab = new Map();
  let everCompletedLabWithNoHints = false;

  for (const a of labAttempts) {
    if (!seenLabs.has(a.labSlug)) {
      totalAwarded += await awardXpEvent(
        user.id,
        XP.LAB_COMPLETE,
        "lab_complete",
        a.labSlug,
        { score: a.score, backfilled: true },
      );
      seenLabs.add(a.labSlug);
    }
    const prevBest = bestScoreByLab.get(a.labSlug) ?? 0;
    if ((a.score ?? 0) > prevBest) bestScoreByLab.set(a.labSlug, a.score ?? 0);
    if ((a.hintsUsed ?? 0) === 0 && (a.score ?? 0) > 0) {
      everCompletedLabWithNoHints = true;
    }
  }

  if (seenLabs.has("password-strength")) {
    const a = await awardBadgeIfMissing(user.id, "password_pro");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("password_pro");
    }
  }
  if ((bestScoreByLab.get("phishing-showdown") ?? 0) >= 90) {
    const a = await awardBadgeIfMissing(user.id, "phishing_hunter");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("phishing_hunter");
    }
  }
  if (everCompletedLabWithNoHints) {
    const a = await awardBadgeIfMissing(user.id, "sandbox_survivor");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("sandbox_survivor");
    }
  }

  // ── 4. CTF solves: XP per difficulty + count/category badges ───────────
  const ctfSolves = await prisma.pathwayCtfSolve.findMany({
    where: { userId: user.id },
    orderBy: { solvedAt: "asc" },
  });

  const categoryCounts = new Map();
  for (const s of ctfSolves) {
    const xpAmount =
      s.difficulty === "easy"
        ? XP.CTF_EASY
        : s.difficulty === "medium"
          ? XP.CTF_MEDIUM
          : s.difficulty === "hard"
            ? XP.CTF_HARD
            : XP.CTF_EXPERT;
    totalAwarded += await awardXpEvent(
      user.id,
      xpAmount,
      "ctf_solve",
      s.challengeSlug,
      { category: s.category, difficulty: s.difficulty, backfilled: true },
    );
    categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
  }

  if (ctfSolves.length >= 1) {
    const a = await awardBadgeIfMissing(user.id, "first_flag");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("first_flag");
    }
  }
  if (ctfSolves.length >= 5) {
    const a = await awardBadgeIfMissing(user.id, "flag_hunter");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("flag_hunter");
    }
  }
  if (ctfSolves.length >= 15) {
    const a = await awardBadgeIfMissing(user.id, "flag_legend");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("flag_legend");
    }
  }
  for (const [cat, count] of categoryCounts) {
    if (count >= 6) {
      const slug = `${cat}_master`;
      if (BADGE_XP[slug] !== undefined) {
        const a = await awardBadgeIfMissing(user.id, slug);
        if (a > 0) {
          totalAwarded += a;
          badgesAwarded.push(slug);
        }
      }
    }
  }
  if (categoryCounts.size >= 4) {
    const a = await awardBadgeIfMissing(user.id, "cyber_generalist");
    if (a > 0) {
      totalAwarded += a;
      badgesAwarded.push("cyber_generalist");
    }
  }

  // ── 5. Recompute the cached PathwayGamification row ────────────────────
  // Sum ALL XP events for this user (covers backfilled events + any
  // pre-existing). The cached state row is the source-of-truth for level
  // reads, so it must reconcile with the event log after backfill.
  const sum = await prisma.pathwayXpEvent.aggregate({
    where: { userId: user.id },
    _sum: { amount: true },
  });
  const trueTotalXp = sum._sum.amount ?? 0;
  const newLevel = calculateLevel(trueTotalXp);

  await prisma.pathwayGamification.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      totalXp: trueTotalXp,
      currentLevel: newLevel,
    },
    update: {
      totalXp: trueTotalXp,
      currentLevel: newLevel,
    },
  });

  console.log(`  XP awarded this run: ${totalAwarded}`);
  console.log(`  Total XP after:      ${trueTotalXp}`);
  console.log(`  Level:               ${newLevel}`);
  console.log(
    `  Badges awarded:      ${badgesAwarded.length ? badgesAwarded.join(", ") : "(none)"}`,
  );

  return {
    user: user.email ?? user.name,
    xpAwarded: totalAwarded,
    totalXp: trueTotalXp,
    level: newLevel,
    badges: badgesAwarded,
  };
}

async function main() {
  console.log("Starting gamification backfill...\n");

  const usersWithActivity = await prisma.user.findMany({
    where: {
      OR: [
        { pathwayMilestones: { some: {} } },
        { pathwayLabAttempts: { some: {} } },
        { pathwayCtfSolves: { some: {} } },
      ],
    },
    select: { id: true, email: true, name: true },
  });

  console.log(`Found ${usersWithActivity.length} users with pathway activity\n`);

  const results = [];
  for (const user of usersWithActivity) {
    try {
      results.push(await backfillUser(user));
    } catch (err) {
      console.error(`  ERROR for ${user.email ?? user.name}:`, err.message);
      results.push({ user: user.email ?? user.name, error: err.message });
    }
  }

  console.log("\n========================================");
  console.log("BACKFILL COMPLETE");
  console.log("========================================");
  console.log(`Users processed:        ${results.length}`);
  const distributed = results.reduce((s, r) => s + (r.xpAwarded || 0), 0);
  console.log(`Total XP distributed:   ${distributed}`);
  const newBadges = results.reduce((s, r) => s + (r.badges?.length || 0), 0);
  console.log(`Total badges awarded:   ${newBadges}`);
  console.log("\nPer-user summary:");
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.user}: ERROR — ${r.error}`);
    } else {
      console.log(
        `  ${r.user}: +${r.xpAwarded} XP, total ${r.totalXp}, lvl ${r.level}, ${r.badges.length} badge(s)`,
      );
    }
  }
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
