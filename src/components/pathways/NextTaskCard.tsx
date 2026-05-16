/**
 * NextTaskCard — the big "what should I do next?" CTA on the Pathways home.
 *
 * Derives the recommended next task client-side from the milestones and
 * enrollments returned by `/api/pathways/student/home`. No additional API
 * round-trip — the data is already in hand by the time this card renders.
 *
 * Decision priority:
 *   1. A module currently `in_progress` → "Continue …"
 *   2. The first un-started module in the cohort's first active track → "Start …"
 *   3. Every module in every enrolled track is `completed` → "Track complete"
 *   4. No enrollments → "Join a cohort"
 */
import { Link } from "react-router-dom";
import { ArrowRight, Play, BookOpen, Award, KeyRound } from "lucide-react";
import { PATHWAY_TRACKS, type PathwayTrack, type PathwayModule } from "@/constants/pathwayTracks";

export interface NextTaskMilestone {
  trackSlug: string;
  moduleSlug: string;
  status: string;
  hookCompleted?: boolean;
  readingCompleted?: boolean;
  lessonCompleted?: boolean;
  practiceCompleted?: boolean;
  homeworkSubmitted?: boolean;
  quizCompleted?: boolean;
}

export interface NextTaskEnrollment {
  cohortId: string;
  cohortName: string;
  trackIds?: string[];
}

export type NextTask =
  | {
      type: "continue";
      title: string;
      subtitle: string;
      description?: string;
      ctaLabel: string;
      ctaPath: string;
      progress: number;
    }
  | {
      type: "start_next";
      title: string;
      subtitle: string;
      description?: string;
      ctaLabel: string;
      ctaPath: string;
    }
  | {
      type: "completed";
      title: string;
      subtitle: string;
      ctaLabel: string;
      ctaPath: string;
    }
  | {
      type: "join_cohort";
      title: string;
      subtitle: string;
      ctaLabel: string;
      ctaPath: string;
    };

/** Section flags for a module — Capstone uses 5, others use 6 (no quiz for capstone). */
function sectionFlags(m: NextTaskMilestone): boolean[] {
  const isCapstone = m.moduleSlug === "capstone-security-plan";
  const base = [
    !!m.hookCompleted,
    !!m.readingCompleted,
    !!m.lessonCompleted,
    !!m.practiceCompleted,
    !!m.homeworkSubmitted,
  ];
  return isCapstone ? base : [...base, !!m.quizCompleted];
}

function moduleProgressPercent(m: NextTaskMilestone): number {
  if (m.status === "completed") return 100;
  const flags = sectionFlags(m);
  const done = flags.filter(Boolean).length;
  return Math.round((done / flags.length) * 100);
}

/** Pick the first cohort that has any active tracks listed. */
function pickActiveTrack(enrollments: NextTaskEnrollment[]): {
  track: PathwayTrack;
  trackSlug: string;
} | null {
  for (const e of enrollments) {
    const ids = e.trackIds ?? [];
    for (const trackSlug of ids) {
      const track = PATHWAY_TRACKS.find((t) => t.slug === trackSlug && t.status === "active");
      if (track) return { track, trackSlug };
    }
  }
  // Fallback: if a cohort has no tracks specified but enrollment exists, pick
  // the first active track in the catalog so the learner gets a sensible CTA.
  const fallback = PATHWAY_TRACKS.find((t) => t.status === "active");
  if (fallback) return { track: fallback, trackSlug: fallback.slug };
  return null;
}

function firstUnstartedModule(
  track: PathwayTrack,
  milestones: NextTaskMilestone[],
): PathwayModule | null {
  for (const m of track.modules) {
    if (m.status !== "active") continue;
    const milestone = milestones.find(
      (ms) => ms.trackSlug === track.slug && ms.moduleSlug === m.slug,
    );
    if (!milestone || milestone.status === "not_started") return m;
  }
  return null;
}

export function computeNextTask(
  milestones: NextTaskMilestone[],
  enrollments: NextTaskEnrollment[],
): NextTask {
  if (!enrollments || enrollments.length === 0) {
    return {
      type: "join_cohort",
      title: "Get Started",
      subtitle: "Enter your cohort join code",
      ctaLabel: "Enter Code",
      ctaPath: "/student-login",
    };
  }

  // 1) In-progress module wins.
  const inProgress = milestones.find((m) => m.status === "in_progress");
  if (inProgress) {
    const track = PATHWAY_TRACKS.find((t) => t.slug === inProgress.trackSlug);
    const mod = track?.modules.find((m) => m.slug === inProgress.moduleSlug);
    return {
      type: "continue",
      title: "Continue Where You Left Off",
      subtitle: mod?.name ?? inProgress.moduleSlug,
      description: mod?.description,
      ctaLabel: "Resume",
      ctaPath: `/pathways/tracks/${inProgress.trackSlug}/${inProgress.moduleSlug}`,
      progress: moduleProgressPercent(inProgress),
    };
  }

  // 2) Next un-started module in the cohort's first active track.
  const active = pickActiveTrack(enrollments);
  if (active) {
    const next = firstUnstartedModule(active.track, milestones);
    if (next) {
      return {
        type: "start_next",
        title: "Up Next",
        subtitle: next.name,
        description: next.description,
        ctaLabel: `Start ${next.name}`,
        ctaPath: `/pathways/tracks/${active.trackSlug}/${next.slug}`,
      };
    }
  }

  // 3) Everything in active tracks is complete.
  return {
    type: "completed",
    title: "Track Complete",
    subtitle: "You're ready for your capstone showcase",
    ctaLabel: "View Your Achievements",
    ctaPath: "/pathways/profile",
  };
}

// ── Card ────────────────────────────────────────────────────────────────────

const ICON_BY_TYPE = {
  continue: Play,
  start_next: BookOpen,
  completed: Award,
  join_cohort: KeyRound,
} as const;

const GRADIENT_BY_TYPE = {
  continue: "from-indigo-600 to-indigo-800",
  start_next: "from-teal-600 to-cyan-700",
  completed: "from-emerald-600 to-emerald-700",
  join_cohort: "from-amber-600 to-orange-700",
} as const;

export function NextTaskCard({ task }: { task: NextTask }) {
  const Icon = ICON_BY_TYPE[task.type];
  const gradient = GRADIENT_BY_TYPE[task.type];

  return (
    <Link
      to={task.ctaPath}
      className={`
        block w-full bg-gradient-to-r ${gradient}
        rounded-2xl p-5 md:p-7
        shadow-lg hover:shadow-xl
        transition-all duration-200
        hover:-translate-y-0.5
        group
      `}
    >
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex-shrink-0 bg-white/20 rounded-xl p-3 md:p-4">
          <Icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-white/80 text-xs md:text-sm font-medium uppercase tracking-wide">
            {task.title}
          </div>
          <div className="text-white text-lg md:text-2xl font-bold mt-0.5 truncate">
            {task.subtitle}
          </div>
          {"description" in task && task.description && (
            <div className="text-white/80 text-sm mt-1 line-clamp-1 hidden sm:block">
              {task.description}
            </div>
          )}
          {task.type === "continue" && (
            <div className="mt-3 flex items-center gap-2 max-w-md">
              <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-white rounded-full h-2 transition-all"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-white/90 text-xs md:text-sm font-medium">
                {task.progress}%
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex items-center gap-2 text-white font-semibold text-sm md:text-base">
          <span className="hidden md:inline">{task.ctaLabel}</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
