export type SpacewarUpgradeKey =
  | "gravityControl"
  | "fasterRecharge"
  | "rhythmTiming"
  | "navigationAssist"
  | "shieldSurge";

export type SpacewarUpgrade = {
  id: string;
  key: SpacewarUpgradeKey;
  title: string;
  description: string;
};

export type Difficulty = "easy" | "normal" | "hard";

export type SpacewarMission = {
  goal: string;
  strategyTip: string;
  framing: string;
};

export type SpacewarRecapInput = {
  winner: number;
  player1Score: number;
  player2Score: number;
  difficulty: Difficulty;
  activeUpgradeIds: string[];
  timestamp?: string;
};

export type SpacewarMatchRecap = {
  winner: number;
  winnerLabel: string;
  player1Score: number;
  player2Score: number;
  difficulty: Difficulty;
  activeUpgradeIds: string[];
  strategyLabel: string;
  reflectionPrompt: string;
  nextChallenge: string;
  timestamp: string;
  scoreMargin: number;
};

export type SpacewarBestRecap = {
  player1Score: number;
  scoreMargin: number;
  timestamp: string;
};

const UPGRADE_MAP: Record<string, Omit<SpacewarUpgrade, "id">> = {
  "bounce-buds": {
    key: "gravityControl",
    title: "Gravity Control",
    description: "Practice smooth movement around the sun.",
  },
  "gotcha-gears": {
    key: "fasterRecharge",
    title: "Faster Recharge",
    description: "Use timing and pattern logic to choose better shots.",
  },
  "rhyme-ride": {
    key: "rhythmTiming",
    title: "Rhythm Timing",
    description: "Build rhythm before firing.",
  },
  "tank-trek": {
    key: "navigationAssist",
    title: "Navigation Assist",
    description: "Plan your path before boosting.",
  },
  "quantum-quest": {
    key: "shieldSurge",
    title: "Shield Surge",
    description: "Stay calm and recover after risky moments.",
  },
};

const MISSION_BY_DIFFICULTY: Record<Difficulty, SpacewarMission[]> = {
  easy: [
    {
      goal: "Win a duel against the CPU.",
      strategyTip: "Use short thrust bursts and avoid drifting into the sun.",
      framing: "Practice planning and safe movement before each shot.",
    },
    {
      goal: "Score 2 points before the CPU.",
      strategyTip: "Aim where the CPU ship is going, not where it is.",
      framing: "Try a calm pace and focus on good timing.",
    },
  ],
  normal: [
    {
      goal: "Use patience: fire fewer but better shots.",
      strategyTip: "Wait for clean angles after gravity pull changes direction.",
      framing: "Show strategy by choosing quality over quantity.",
    },
    {
      goal: "Avoid the sun for the whole round.",
      strategyTip: "If the sun pull gets strong, orbit out before attacking.",
      framing: "Demonstrate hazard awareness and movement control.",
    },
  ],
  hard: [
    {
      goal: "Try a harder difficulty after winning on Easy.",
      strategyTip: "Control momentum first, then pressure with smart shots.",
      framing: "Challenge yourself with deliberate strategy decisions.",
    },
    {
      goal: "Outmaneuver the CPU while protecting your score lead.",
      strategyTip: "When ahead, prioritize safe routes over risky duels.",
      framing: "Balance offense with hazard avoidance like an engineer.",
    },
  ],
};

export const SPACEWAR_BEST_RECAP_KEY = "brightboost.spacewar.bestRecap";

export function buildSpacewarUpgrades(completedActivityIds: string[]): SpacewarUpgrade[] {
  const completed = new Set(completedActivityIds);

  return Object.entries(UPGRADE_MAP)
    .filter(([id]) => completed.has(id))
    .map(([id, upgrade]) => ({ id, ...upgrade }));
}

export function buildSpacewarMission(difficulty: Difficulty, upgrades: SpacewarUpgrade[]): SpacewarMission {
  const seed = upgrades.length % MISSION_BY_DIFFICULTY[difficulty].length;
  return MISSION_BY_DIFFICULTY[difficulty][seed];
}

export function buildSpacewarMatchRecap(input: SpacewarRecapInput): SpacewarMatchRecap {
  const scoreMargin = input.player1Score - input.player2Score;

  let strategyLabel = "Momentum Master";
  if (input.player1Score === input.player2Score) {
    strategyLabel = "Comeback Builder";
  } else if (scoreMargin >= 3) {
    strategyLabel = "Sharp Shooter";
  } else if (input.player2Score >= input.player1Score && input.player2Score > 0) {
    strategyLabel = "Gravity Dodger";
  } else if (input.player1Score <= 2) {
    strategyLabel = "Careful Pilot";
  }

  const nextChallenge =
    input.difficulty === "easy"
      ? "Try a Normal duel and keep your movement steady."
      : input.difficulty === "normal"
        ? "Step up to Hard and focus on hazard avoidance."
        : "Replay Hard and aim for a wider score margin.";

  const reflectionPrompt =
    scoreMargin >= 0
      ? "What planning move helped you outmaneuver hazards this duel?"
      : "What is one strategy you can adjust to score earlier next duel?";

  return {
    winner: input.winner,
    winnerLabel: input.winner === 1 ? "Player 1" : "CPU",
    player1Score: input.player1Score,
    player2Score: input.player2Score,
    difficulty: input.difficulty,
    activeUpgradeIds: input.activeUpgradeIds,
    strategyLabel,
    reflectionPrompt,
    nextChallenge,
    timestamp: input.timestamp ?? new Date().toISOString(),
    scoreMargin,
  };
}

export function readBestSpacewarRecap(): SpacewarBestRecap | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(SPACEWAR_BEST_RECAP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SpacewarBestRecap;
    if (typeof parsed.player1Score !== "number" || typeof parsed.scoreMargin !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistBestSpacewarRecap(recap: SpacewarMatchRecap): SpacewarBestRecap {
  const candidate: SpacewarBestRecap = {
    player1Score: recap.player1Score,
    scoreMargin: recap.scoreMargin,
    timestamp: recap.timestamp,
  };

  const existing = readBestSpacewarRecap();
  const shouldReplace =
    !existing ||
    candidate.player1Score > existing.player1Score ||
    (candidate.player1Score === existing.player1Score && candidate.scoreMargin > existing.scoreMargin);

  if (shouldReplace) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(SPACEWAR_BEST_RECAP_KEY, JSON.stringify(candidate));
      }
    } catch {
      // Ignore localStorage limitations in private mode / blocked environments.
    }
    return candidate;
  }

  return existing;
}
