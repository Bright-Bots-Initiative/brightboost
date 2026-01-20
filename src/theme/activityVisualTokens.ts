export type VisualKey =
  | "story"
  | "quiz"
  | "game"
  | "reward"
  | "mission_cake"
  | "mission_hands"
  | "mission_plan"
  | "default";

export type ActivityVisualToken = {
  label: string;
  emoji?: string;
  iconName?: "BookOpen" | "Star" | "Zap" | "Check";
  bubbleClass: string;
  chipClass: string;
  borderClass?: string;
};

export const ACTIVITY_VISUAL_TOKENS: Record<VisualKey, ActivityVisualToken> = {
  story: {
    label: "Story",
    iconName: "BookOpen",
    bubbleClass:
      "bg-brightboost-lightblue/25 text-brightboost-navy ring-1 ring-brightboost-blue/20",
    chipClass:
      "bg-brightboost-lightblue/20 text-brightboost-navy border border-brightboost-blue/15",
  },
  quiz: {
    label: "Quiz",
    iconName: "Star",
    bubbleClass:
      "bg-brightboost-yellow/20 text-brightboost-navy ring-1 ring-brightboost-yellow/25",
    chipClass:
      "bg-brightboost-yellow/15 text-brightboost-navy border border-brightboost-yellow/20",
  },
  game: {
    label: "Game",
    iconName: "Zap",
    bubbleClass:
      "bg-brightboost-green/20 text-brightboost-navy ring-1 ring-brightboost-green/25",
    chipClass:
      "bg-brightboost-green/15 text-brightboost-navy border border-brightboost-green/20",
  },
  reward: {
    label: "Complete",
    iconName: "Check",
    bubbleClass:
      "bg-brightboost-yellow/25 text-brightboost-navy ring-1 ring-brightboost-yellow/30",
    chipClass:
      "bg-brightboost-yellow/20 text-brightboost-navy border border-brightboost-yellow/30",
    borderClass: "border-brightboost-yellow/30",
  },
  mission_cake: {
    label: "Mission: Bake a Cake",
    emoji: "🍰",
    bubbleClass:
      "bg-brightboost-yellow/20 text-brightboost-navy ring-1 ring-brightboost-yellow/25",
    chipClass:
      "bg-brightboost-yellow/15 text-brightboost-navy border border-brightboost-yellow/20",
  },
  mission_hands: {
    label: "Mission: Wash Your Hands",
    emoji: "🧼",
    bubbleClass:
      "bg-brightboost-lightblue/25 text-brightboost-navy ring-1 ring-brightboost-blue/20",
    chipClass:
      "bg-brightboost-lightblue/20 text-brightboost-navy border border-brightboost-blue/15",
  },
  mission_plan: {
    label: "Mission: Plan a Party",
    emoji: "🎉",
    bubbleClass:
      "bg-brightboost-green/20 text-brightboost-navy ring-1 ring-brightboost-green/25",
    chipClass:
      "bg-brightboost-green/15 text-brightboost-navy border border-brightboost-green/20",
  },
  default: {
    label: "Activity",
    iconName: "Star",
    bubbleClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    chipClass: "bg-slate-50 text-slate-700 border border-slate-200",
  },
};
