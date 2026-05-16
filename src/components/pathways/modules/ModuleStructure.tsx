/**
 * ModuleStructure — shared 6-section learning shell for Cyber Launch modules.
 *
 * Each module renders Hook → Reading → Lesson → Practice → Homework → Quiz
 * (the Capstone skips Quiz). The progress bar across the top lets a learner
 * see where they are at a glance and navigate to any unlocked section. The
 * Quiz unlocks only when the previous five sections have been marked done.
 *
 * Each section persists its completion to PathwayMilestone via
 * PATCH /api/pathways/student/milestones/section so a learner can leave and
 * resume. Homework submission posts to a dedicated endpoint that also flips
 * the section's completion bit.
 *
 * Quiz content stays in the existing module file — this shell hands off to
 * a render-prop so the existing per-module scenarios/scoring keep working.
 */
import { useMemo, useRef, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Lightbulb,
  PencilLine,
  PlayCircle,
  Sparkles,
  Lock,
  Check,
  ChevronRight,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import type { ModuleContent, ReadingSection, LessonScene, PracticeItem } from "./cyberLaunchContent";

const TRACK_SLUG = "cyber-launch";

const SECTIONS = ["hook", "reading", "lesson", "practice", "homework", "quiz"] as const;
export type SectionKey = (typeof SECTIONS)[number];

// Internal `hook` keys remain for schema/API consistency, but the student
// never sees that word — it's relabeled as "Why It Matters" everywhere.
const SECTION_META: Record<SectionKey, { label: string; icon: typeof BookOpen }> = {
  hook: { label: "Why It Matters", icon: Sparkles },
  reading: { label: "Read", icon: BookOpen },
  lesson: { label: "Lesson", icon: PlayCircle },
  practice: { label: "Practice", icon: Lightbulb },
  homework: { label: "Homework", icon: PencilLine },
  quiz: { label: "Quiz", icon: GraduationCap },
};

interface SectionProgress {
  hook: boolean;
  reading: boolean;
  lesson: boolean;
  practice: boolean;
  homework: boolean;
  quiz: boolean;
}

const ZERO_PROGRESS: SectionProgress = {
  hook: false,
  reading: false,
  lesson: false,
  practice: false,
  homework: false,
  quiz: false,
};

interface QuizHandoffArgs {
  /** Call when the quiz is finished with a 0-100 score. */
  onQuizComplete: (score: number) => void;
}

export interface ModuleStructureProps {
  content: ModuleContent;
  /** Existing module quiz rendered as the final stage. */
  renderQuiz: (args: QuizHandoffArgs) => React.ReactNode;
  onBack: () => void;
  /** Called when the module is fully complete with the final score (quiz score, or 100 for Capstone). */
  onComplete: (score: number) => void;
  /** Existing milestone progress for resume support. */
  initialProgress?: Partial<SectionProgress>;
  /** Existing homework response if the learner has already submitted. */
  initialHomework?: string;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Best-effort POST; failures are non-fatal — UI optimistic, server eventually consistent. */
function persistSection(moduleSlug: string, section: SectionKey, completed: boolean) {
  fetch("/api/pathways/student/milestones/section", {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ trackSlug: TRACK_SLUG, moduleSlug, section, completed }),
  }).catch(() => {});
}

export default function ModuleStructure({
  content,
  renderQuiz,
  onBack,
  onComplete,
  initialProgress,
  initialHomework,
}: ModuleStructureProps) {
  const sections = useMemo<SectionKey[]>(
    () => (content.skipQuiz ? ["hook", "reading", "lesson", "practice", "homework"] : [...SECTIONS]),
    [content.skipQuiz],
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState<SectionProgress>({ ...ZERO_PROGRESS, ...initialProgress });
  const current = sections[currentIdx];

  // Quiz unlocks only after the first five sections are complete (or the
  // skip-quiz capstone reaches its final section).
  const quizUnlocked =
    progress.hook && progress.reading && progress.lesson && progress.practice && progress.homework;

  const markCompleted = (section: SectionKey) => {
    setProgress((p) => {
      if (p[section]) return p; // idempotent
      persistSection(content.slug, section, true);
      return { ...p, [section]: true };
    });
  };

  const goNext = () => {
    if (currentIdx + 1 < sections.length) setCurrentIdx(currentIdx + 1);
  };

  const goTo = (idx: number) => {
    const target = sections[idx];
    if (target === "quiz" && !quizUnlocked) return;
    setCurrentIdx(idx);
  };

  const handleQuizComplete = (score: number) => {
    markCompleted("quiz");
    onComplete(score);
  };

  const handleCapstoneComplete = () => {
    // Capstone has no quiz — completing all 5 sections is the submission.
    onComplete(100);
  };

  return (
    <div className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 px-2 py-2 min-h-[44px] text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs text-slate-500">~{content.totalMinutes} min</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{content.title}</h1>

        {/* Progress bar */}
        <ProgressBar
          sections={sections}
          currentIdx={currentIdx}
          progress={progress}
          quizUnlocked={quizUnlocked}
          onSelect={goTo}
        />

        {/* Section content */}
        {current === "hook" && (
          <HookSection
            content={content}
            done={progress.hook}
            onContinue={() => {
              markCompleted("hook");
              goNext();
            }}
          />
        )}
        {current === "reading" && (
          <ReadingSectionView
            content={content}
            done={progress.reading}
            onContinue={() => {
              markCompleted("reading");
              goNext();
            }}
          />
        )}
        {current === "lesson" && (
          <LessonSectionView
            content={content}
            done={progress.lesson}
            onContinue={() => {
              markCompleted("lesson");
              goNext();
            }}
          />
        )}
        {current === "practice" && (
          <PracticeSectionView
            content={content}
            done={progress.practice}
            onContinue={() => {
              markCompleted("practice");
              goNext();
            }}
          />
        )}
        {current === "homework" && (
          <HomeworkSectionView
            content={content}
            moduleSlug={content.slug}
            done={progress.homework}
            initialResponse={initialHomework ?? ""}
            isCapstone={!!content.skipQuiz}
            onContinue={() => {
              markCompleted("homework");
              if (content.skipQuiz) handleCapstoneComplete();
              else goNext();
            }}
          />
        )}
        {current === "quiz" && !content.skipQuiz && (
          <div className="space-y-3">
            <SectionHeader
              icon={GraduationCap}
              title="Quiz"
              estMinutes={8}
              subtitle="The final assessment. Bring what you learned in the previous sections."
            />
            {quizUnlocked ? (
              renderQuiz({ onQuizComplete: handleQuizComplete })
            ) : (
              <LockedNotice />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────────────────────

function ProgressBar({
  sections,
  currentIdx,
  progress,
  quizUnlocked,
  onSelect,
}: {
  sections: SectionKey[];
  currentIdx: number;
  progress: SectionProgress;
  quizUnlocked: boolean;
  onSelect: (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-1">
      {sections.map((section, idx) => {
        const meta = SECTION_META[section];
        const Icon = meta.icon;
        const isCurrent = idx === currentIdx;
        const isDone = progress[section];
        const isLocked = section === "quiz" && !quizUnlocked;
        const base =
          "flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-colors min-w-[64px]";
        const cls = isLocked
          ? "text-slate-400 dark:text-slate-600 cursor-not-allowed"
          : isCurrent
            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-200 cursor-pointer"
            : isDone
              ? "text-emerald-700 dark:text-emerald-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
              : "text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800";
        return (
          <div key={section} className="flex items-center">
            <button
              type="button"
              onClick={() => onSelect(idx)}
              disabled={isLocked}
              className={`${base} ${cls}`}
            >
              <span className="relative">
                {isLocked ? <Lock className="w-4 h-4" /> : isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </span>
              <span>{meta.label}</span>
            </button>
            {idx < sections.length - 1 && (
              <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  estMinutes,
  subtitle,
}: {
  icon: typeof BookOpen;
  title: string;
  estMinutes: number;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
      <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <span className="text-xs text-slate-500">~{estMinutes} min</span>
        </div>
        {subtitle && <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function NextButton({ label = "Next →", onClick }: { label?: string; onClick: () => void }) {
  return (
    <div className="flex justify-end pt-2">
      <button
        onClick={onClick}
        className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-medium transition-all"
      >
        {label}
      </button>
    </div>
  );
}

function LockedNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
      <p className="font-semibold">Quiz is locked until the earlier sections are complete.</p>
      <p className="text-xs mt-1">Finish Hook, Reading, Lesson, Practice, and Homework first — then come back.</p>
    </div>
  );
}

/** Render a paragraph string with **bold** markers turned into <strong>. Plain-text only — no markdown. */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── Hook ────────────────────────────────────────────────────────────────────

function HookSection({
  content,
  done,
  onContinue,
}: {
  content: ModuleContent;
  done: boolean;
  onContinue: () => void;
}) {
  const { hook } = content;
  return (
    <div className="space-y-4">
      <SectionHeader icon={Sparkles} title={hook.title} estMinutes={hook.estMinutes} />
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
        {hook.paragraphs.map((p, i) => (
          <p key={i}>{renderInline(p)}</p>
        ))}
        <p className="text-indigo-700 dark:text-indigo-300 font-medium italic">{hook.closer}</p>
      </div>
      <NextButton label={done ? "Continue →" : "I'm ready →"} onClick={onContinue} />
    </div>
  );
}

// ── Reading ────────────────────────────────────────────────────────────────

function ReadingSectionView({
  content,
  done,
  onContinue,
}: {
  content: ModuleContent;
  done: boolean;
  onContinue: () => void;
}) {
  const { reading } = content;
  return (
    <div className="space-y-5">
      <SectionHeader
        icon={BookOpen}
        title="Reading"
        estMinutes={reading.estMinutes}
        subtitle="Substantive background. Take notes if it helps."
      />
      <div className="space-y-6">
        {reading.sections.map((section, i) => (
          <ReadingSectionBlock key={i} section={section} />
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Sources
        </p>
        <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          {reading.citations.map((c, i) => (
            <li key={i}>• {c}</li>
          ))}
        </ul>
      </div>
      <NextButton label={done ? "Continue →" : "Done reading →"} onClick={onContinue} />
    </div>
  );
}

function ReadingSectionBlock({ section }: { section: ReadingSection }) {
  return (
    <div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">{section.heading}</h3>
      <div className="space-y-2 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200">
        {section.paragraphs.map((p, i) => (
          <p key={i}>{renderInline(p)}</p>
        ))}
      </div>
      {section.callout && (
        <blockquote className="mt-3 pl-3 border-l-4 border-indigo-400 dark:border-indigo-600 text-sm text-indigo-900 dark:text-indigo-200 italic">
          {section.callout}
        </blockquote>
      )}
      {section.grcLens && (
        <div className="mt-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3 sm:p-4 rounded-r-lg">
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-200">
              {section.grcLens.title ?? "GRC Lens"}
            </span>
          </div>
          <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
            {renderInline(section.grcLens.body)}
          </p>
        </div>
      )}
      {section.keyTerms && section.keyTerms.length > 0 && (
        <div className="mt-3 rounded-lg bg-slate-100 dark:bg-slate-800/60 p-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Key terms</p>
          <dl className="text-sm space-y-1">
            {section.keyTerms.map((kt) => (
              <div key={kt.term}>
                <dt className="inline font-semibold text-slate-900 dark:text-slate-200">{kt.term}:</dt>{" "}
                <dd className="inline text-slate-700 dark:text-slate-400">{kt.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

// ── Lesson ─────────────────────────────────────────────────────────────────

function LessonSectionView({
  content,
  done,
  onContinue,
}: {
  content: ModuleContent;
  done: boolean;
  onContinue: () => void;
}) {
  const { lesson } = content;
  const [sceneIdx, setSceneIdx] = useState(0);
  const totalScenes = lesson.scenes.length;
  const onLast = sceneIdx === totalScenes - 1;

  return (
    <div className="space-y-4">
      <SectionHeader icon={PlayCircle} title="Lesson" estMinutes={lesson.estMinutes} subtitle={lesson.intro} />
      <div className="text-xs text-slate-500">Scene {sceneIdx + 1} of {totalScenes}</div>
      <LessonSceneView scene={lesson.scenes[sceneIdx]} />
      <div className="flex items-center justify-between pt-2 gap-3">
        <button
          onClick={() => setSceneIdx((i) => Math.max(0, i - 1))}
          disabled={sceneIdx === 0}
          className="px-3 py-3 sm:py-2 min-h-[44px] text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 disabled:opacity-40"
        >
          ← Previous
        </button>
        {onLast ? (
          <button
            onClick={onContinue}
            className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-medium transition-all"
          >
            {done ? "Continue →" : "Finish lesson →"}
          </button>
        ) : (
          <button
            onClick={() => setSceneIdx((i) => Math.min(totalScenes - 1, i + 1))}
            className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-medium transition-all"
          >
            Next scene →
          </button>
        )}
      </div>
    </div>
  );
}

function LessonSceneView({ scene }: { scene: LessonScene }) {
  const [picked, setPicked] = useState<number | null>(null);
  // Reset selection when the scene changes.
  const lastScene = useRef<string | null>(null);
  if (lastScene.current !== scene.title) {
    lastScene.current = scene.title;
    if (picked !== null) setPicked(null);
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{scene.title}</h3>
        {scene.accessibleEntry && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <ShieldCheck className="w-3 h-3" />
            Accessible Entry Path
          </span>
        )}
      </div>
      <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed">{scene.body}</p>
      {scene.choice && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{scene.choice.prompt}</p>
          {scene.choice.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setPicked(i)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                picked === i
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-600"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50"
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{opt.label}</p>
              {picked === i && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">{opt.feedback}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Practice ───────────────────────────────────────────────────────────────

function PracticeSectionView({
  content,
  done,
  onContinue,
}: {
  content: ModuleContent;
  done: boolean;
  onContinue: () => void;
}) {
  const { practice } = content;
  return (
    <div className="space-y-4">
      <SectionHeader icon={Lightbulb} title="Practice" estMinutes={practice.estMinutes} subtitle={practice.intro} />
      <div className="space-y-4">
        {practice.items.map((item, i) => (
          <PracticeItemView key={i} item={item} index={i} />
        ))}
      </div>
      <NextButton label={done ? "Continue →" : "Done with practice →"} onClick={onContinue} />
    </div>
  );
}

function PracticeItemView({ item, index }: { item: PracticeItem; index: number }) {
  const [picked, setPicked] = useState<Set<number>>(new Set());

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
        {index + 1}. {item.prompt}
      </p>
      {item.detail && <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{item.detail}</p>}
      <div className="space-y-1.5 mt-2">
        {item.options.map((opt, i) => {
          const chosen = picked.has(i);
          return (
            <button
              key={i}
              onClick={() => setPicked((p) => new Set(p).add(i))}
              className={`w-full text-left rounded-lg border p-2.5 transition-colors ${
                chosen
                  ? opt.correct
                    ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                    : "border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800/50"
                  : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{opt.label}</p>
              {chosen && (
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5">{opt.feedback}</p>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-500 mt-2">Tap any option to see the reasoning. Multiple may be correct.</p>
    </div>
  );
}

// ── Homework ───────────────────────────────────────────────────────────────

function HomeworkSectionView({
  content,
  moduleSlug,
  done,
  initialResponse,
  isCapstone,
  onContinue,
}: {
  content: ModuleContent;
  moduleSlug: string;
  done: boolean;
  initialResponse: string;
  isCapstone: boolean;
  onContinue: () => void;
}) {
  const { homework } = content;
  const [response, setResponse] = useState(initialResponse);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOk, setSubmittedOk] = useState(done);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pathways/student/milestones/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ trackSlug: TRACK_SLUG, moduleSlug, response }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          (body && (body.error || body.message)) || `${res.status} ${res.statusText}`,
        );
      }
      setSubmittedOk(true);
      onContinue();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "submission failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={PencilLine}
        title={homework.title}
        estMinutes={homework.estMinutes}
        subtitle={homework.prompt}
      />
      <ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-800 dark:text-slate-200 pl-1">
        {homework.instructions.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        onFocus={(e) => {
          // On mobile the soft keyboard hides the input — bring it back into view.
          if (typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches) {
            setTimeout(
              () => e.currentTarget?.scrollIntoView({ behavior: "smooth", block: "center" }),
              150,
            );
          }
        }}
        placeholder={homework.placeholder}
        rows={isCapstone ? 12 : 8}
        className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-[11px] text-slate-500">
        Saved when you submit. Your facilitator can review your response from their dashboard.
      </p>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">Couldn't submit: {error}</p>
      )}
      <div className="flex items-center justify-end gap-3">
        {submittedOk && !error && (
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Submitted ✓</span>
        )}
        <button
          onClick={onSubmit}
          disabled={submitting || response.trim().length === 0}
          className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 disabled:active:scale-100 dark:disabled:bg-slate-700 text-white text-sm font-medium transition-all"
        >
          {submitting ? "Submitting…" : isCapstone ? "Submit capstone →" : "Submit homework →"}
        </button>
      </div>
    </div>
  );
}

