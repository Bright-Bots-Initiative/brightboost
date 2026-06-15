// src/pages/ActivityPlayer.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import TankTrekGame from "@/components/games/TankTrekGame";
import QuantumQuestGame from "@/components/games/QuantumQuestGame";
import { GAME_COMPONENTS } from "@/components/games/gameRegistry";
import { useGradeBand } from "@/hooks/useGradeBand";
import { applyG35StoryOverrides } from "@/components/games/gradeBandContent";
import {
  getStudentArchetype,
  canAccessModule,
  isSpecializationModuleSlug,
} from "@/lib/moduleAccess";
import { HIDDEN_MODULE_SLUGS } from "@/constants/stemSets";
import { Check, Zap, Heart, Star, ArrowRight, TreePine } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import {
  LocalizedField,
  resolveText,
  resolveChoiceList,
} from "@/utils/localizedContent";
import { track } from "@/lib/analytics";
import ActivityHeader from "@/components/activities/ActivityHeader";
import { ACTIVITY_VISUAL_TOKENS } from "@/theme/activityVisualTokens";
import { ImageKey } from "@/theme/activityIllustrations";
import { ActivityThumb } from "@/components/shared/ActivityThumb";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type StorySlide = {
  id: string;
  text: LocalizedField;
  icon?: string;
  imageKey?: ImageKey;
};
type StoryQuestion = {
  id: string;
  prompt: LocalizedField;
  choices: LocalizedField[];
  answerIndex: number;
  hint?: LocalizedField;
};

function safeJsonParse(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    return { type: "text", text: raw };
  }
}

/** Fisher-Yates shuffle — returns a new shuffled copy of indices [0..n-1] */
function shuffledIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function ActivityPlayer() {
  const { slug, lessonId, activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const gradeBand = useGradeBand();

  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [content, setContent] = useState<any>(null);

  // Band-aware view of the activity content. Applied at render time (not
  // parse time) because useGradeBand resolves async — the first paint may
  // still be on the k2 default. K-2 content passes through unchanged.
  const bandedContent = useMemo(
    () => applyG35StoryOverrides(content, slug, gradeBand),
    [content, slug, gradeBand],
  );

  const slides: StorySlide[] =
    activity?.kind === "INFO" && Array.isArray(bandedContent?.slides)
      ? bandedContent.slides
      : [];

  // INFO state
  const [slideIndex, setSlideIndex] = useState(0);
  const [mode, setMode] = useState<"story" | "quiz">("story");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
  const [completionData, setCompletionData] = useState<any>(null);
  const [showBreak, setShowBreak] = useState(false);
  // Per-question shuffled choice order: questionId → shuffled array of original indices
  const [shuffleMap, setShuffleMap] = useState<Record<string, number[]>>({});

  const breakSuggestions = t("activityPlayer.breakSuggestions", { returnObjects: true }) as string[];

  const startMsRef = useRef<number>(Date.now());

  useEffect(() => {
    startMsRef.current = Date.now();
  }, [slug, lessonId, activityId]);

  useEffect(() => {
    if (mode !== "story" || slides.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "ArrowLeft") {
        setSlideIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        if (slideIndex < slides.length - 1) {
          setSlideIndex((i) => Math.min(slides.length - 1, i + 1));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, slides.length, slideIndex]);

  // Guard: block activity deep-links into specialization-locked modules
  useEffect(() => {
    if (!slug || !isSpecializationModuleSlug(slug)) return;
    api.getAvatar().then((avatarData) => {
      const arch = getStudentArchetype(avatarData);
      if (!canAccessModule({ slug, archetype: arch })) {
        toast({
          title: t("modules.detail.locked"),
          description: t("modules.detail.unlockPrompt"),
          variant: "destructive",
        });
        navigate("/student/avatar", { replace: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!slug || !lessonId || !activityId) return;

    // Removed/archived modules (e.g. lost-steps / "Fix the Order") are hidden
    // from the module list but were still reachable by direct URL — block the
    // activity route too so they can't open into a broken half-state.
    if (HIDDEN_MODULE_SLUGS.has(slug)) {
      navigate("/student/modules", { replace: true });
      return;
    }

    setLoading(true);
    // clear stale content to avoid "half-loaded" UI when rate-limited
    setModule(null);
    setActivity(null);
    setContent(null);

    api
      .getModule(slug)
      .then((m) => {
        setModule(m);
        // locate activity
        const targetLessonId = String(lessonId);
        const targetActivityId = String(activityId);
        let found: any = null;
        m?.units?.forEach((u: any) => {
          u?.lessons?.forEach((l: any) => {
            if (String(l.id) !== targetLessonId) return;
            const a = l?.activities?.find(
              (x: any) => String(x.id) === targetActivityId,
            );
            if (a) found = a;
          });
        });
        if (!found) {
          setActivity(null);
          setContent(null);
          return;
        }
        setActivity(found);
        const parsed = safeJsonParse(found.content || "");
        setContent(parsed);
        track({
          kind: "game_started",
          game_id: parsed?.gameKey || String(found.id),
          module_slug: String(slug),
          activity_id: String(found.id),
          grade_band: gradeBand,
        });
        // reset INFO local state
        setSlideIndex(0);
        setMode("story");
        setAnswers({});
        setSubmitted(false);
        setIncorrectIds([]);
      })
      .catch(() => {
        toast({
          title: t("common.oops"),
          description: t("activity.loadError"),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lessonId, activityId]); // avoid accidental reruns

  // (Re)build the shuffled choice order whenever the band-resolved question
  // set changes — the grade band may resolve after the activity loads.
  useEffect(() => {
    const qs: StoryQuestion[] = Array.isArray(bandedContent?.questions)
      ? bandedContent.questions
      : [];
    const sMap: Record<string, number[]> = {};
    for (const q of qs) {
      sMap[q.id] = shuffledIndices(q.choices.length);
    }
    setShuffleMap(sMap);
  }, [bandedContent]);

  const getTimeSpentS = () => {
    const ms = Date.now() - startMsRef.current;
    return Math.max(1, Math.round(ms / 1000));
  };

  const handleComplete = async (result?: {
    gameKey?: string;
    score?: number;
    total?: number;
    streakMax?: number;
    roundsCompleted?: number;
  }) => {
    if (!slug || !lessonId || !activityId) return;
    const timeSpentS = getTimeSpentS();
    try {
      const res = await api.completeActivity({
        moduleSlug: slug,
        lessonId: String(lessonId),
        activityId: String(activityId),
        timeSpentS,
        result,
      });
      track({
        kind: "game_completed",
        game_id: result?.gameKey || content?.gameKey || String(activityId),
        module_slug: String(slug),
        activity_id: String(activityId),
        score: result?.score,
        time_spent_seconds: timeSpentS,
        grade_band: gradeBand,
      });
      setCompletionData(res);
      toast({
        title: t("activity.completed"),
        description: res.reward?.xpDelta ? t("activityPlayer.points", { count: res.reward.xpDelta }) : t("activity.saved")
      });

      // Track session completions for break-time interstitial
      const count = Number(sessionStorage.getItem("bb_session_completions") || "0") + 1;
      sessionStorage.setItem("bb_session_completions", String(count));
      if (count > 0 && count % 3 === 0) {
        setShowBreak(true);
      }
    } catch {
      toast({
        title: t("common.oops"),
        description: t("activity.saveError"),
        variant: "destructive",
      });
    }
  };

  if (completionData) {
    const { reward } = completionData;
    const isLevelUp = (reward?.levelDelta || 0) > 0;
    const rewardToken = ACTIVITY_VISUAL_TOKENS["reward"];

    return (
      <div className="p-6 min-h-screen flex items-center justify-center bg-slate-50">
        <Card
          className={`max-w-md w-full border-2 ${rewardToken.borderClass || "border-yellow-400"} bg-white shadow-xl animate-in zoom-in-50 duration-500`}
        >
          <CardContent className="p-8 space-y-6 text-center">
            <div className="flex justify-center mb-4">
              <div
                className={`p-4 rounded-full ${rewardToken.bubbleClass} w-20 h-20 flex items-center justify-center`}
              >
                <Check className="w-10 h-10" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-brightboost-navy">
              {t("activityPlayer.complete")}
            </h2>

            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="text-gray-500 text-lg">{t("activityPlayer.youEarned")}</div>
                <div className="text-4xl font-black text-brightboost-navy bg-brightboost-yellow/25 px-6 py-3 rounded-full flex items-center justify-center gap-2">
                  <Star className="w-8 h-8 fill-brightboost-navy text-brightboost-navy" />
                  {t("activityPlayer.points", { count: reward?.xpDelta ?? 0 })}
                </div>
              </div>

              {isLevelUp && (
                <div className="p-3 bg-purple-100 rounded-lg animate-bounce border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700">
                    {t("activityPlayer.levelUp")}
                  </div>
                  <div className="text-sm text-purple-600">
                    {t("activityPlayer.gettingStronger")}
                  </div>
                </div>
              )}

              {(reward?.energyDelta > 0 || reward?.hpDelta > 0) && (
                <div className="flex justify-center gap-4 pt-2">
                  {reward.energyDelta > 0 && (
                    <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-bold">
                      <Zap className="w-4 h-4 fill-blue-600" /> +
                      {reward.energyDelta}
                    </div>
                  )}
                  {reward.hpDelta > 0 && (
                    <div className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full font-bold">
                      <Heart className="w-4 h-4 fill-red-600" /> +
                      {reward.hpDelta}
                    </div>
                  )}
                </div>
              )}

              {reward?.newAbilitiesDelta > 0 && (
                <div className="text-blue-600 font-semibold bg-blue-50 p-2 rounded border border-blue-100">
                  {t(reward.newAbilitiesDelta > 1 ? "activityPlayer.unlockedPlural" : "activityPlayer.unlocked", { count: reward.newAbilitiesDelta })} {"⚡"}
                </div>
              )}
            </div>

            <Button
              size="lg"
              className="w-full text-lg gap-2"
              onClick={() => navigate(`/student/modules/${slug}`)}
            >
              {t("activityPlayer.done")} <ArrowRight className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Break Time Interstitial */}
        <Dialog open={showBreak} onOpenChange={setShowBreak}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold flex items-center justify-center gap-2">
                <TreePine className="w-7 h-7 text-green-600" />
                {t("activityPlayer.breakTitle")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-lg text-slate-700">
                {t("activityPlayer.breakBody")}
              </p>
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-green-800 font-semibold text-lg">
                  {breakSuggestions[Math.floor(Math.random() * breakSuggestions.length)]}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full text-lg"
              onClick={() => setShowBreak(false)}
            >
              {t("activityPlayer.breakReady")}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">{t("activityPlayer.loadingActivity")}</div>;
  }

  if (!module || !activity) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-lg font-semibold">{t("activityPlayer.notFound")}</div>
            <Button
              onClick={() =>
                navigate(slug ? `/student/modules/${slug}` : "/student/modules")
              }
            >
              {t("activityPlayer.backToModule")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // INFO: story + quiz
  if (activity.kind === "INFO") {
    // slides is already defined at top level
    const questions: StoryQuestion[] = Array.isArray(bandedContent?.questions)
      ? bandedContent.questions
      : [];

    // Quiz-only activity (story_quiz with slides=[] but questions present)
    const isQuizOnly = bandedContent?.type === "story_quiz" && slides.length === 0 && questions.length > 0;

    if (bandedContent?.type !== "story_quiz" || (slides.length === 0 && !isQuizOnly)) {
      // fallback display
      const text = resolveText(
        t,
        content?.text ?? activity.content,
        activity.content,
      );
      return (
        <div className="p-6 max-w-2xl mx-auto space-y-4">
          <ActivityHeader title={activity.title} visualKey="story" />
          <Card>
            <CardContent className="p-6 space-y-4">
              {/* Reading-comfort treatment for legacy free-text activities:
                  larger size, relaxed leading, capped line length. */}
              <div className="text-lg leading-relaxed max-w-prose text-gray-700 whitespace-pre-wrap">
                {text}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/student/modules/${slug}`)}
                  variant="outline"
                  className="min-h-[44px]"
                >
                  {t("activityPlayer.back")}
                </Button>
                <Button className="min-h-[44px] px-6" onClick={() => handleComplete()}>
                  {t("activityPlayer.markComplete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    const current = slides[slideIndex];
    const allAnswered = questions.every(
      (q) => typeof answers[q.id] === "number",
    );

    if (mode === "story" && !isQuizOnly) {
      return (
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          <ActivityHeader
            title={activity.title}
            visualKey="story"
            subtitle={t("activityPlayer.slideOf", { current: Math.min(slideIndex + 1, slides.length), total: slides.length })}
          />
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => navigate(`/student/modules/${slug}`)}
            >
              {t("activityPlayer.back")}
            </Button>
          </div>

          {/* Visual progress dots — pre-readers can't parse "Slide 2 of 5",
              but they can see filled vs hollow dots. Mirrors the dot pattern
              used by the Pathways welcome flow. */}
          <div
            className="flex items-center justify-center gap-1.5"
            aria-hidden="true"
          >
            {slides.map((s, i) => (
              <span
                key={s.id ?? i}
                className={`rounded-full transition-all duration-300 ${
                  i === slideIndex
                    ? "w-6 h-2.5 bg-brightboost-blue"
                    : i < slideIndex
                      ? "w-2.5 h-2.5 bg-brightboost-green"
                      : "w-2.5 h-2.5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <Card>
            <CardContent className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center gap-6">
              {current.imageKey ? (
                <ActivityThumb
                  imageKey={current.imageKey}
                  variant="story"
                  className="h-24 w-24 rounded-2xl"
                />
              ) : current.icon ? (
                <div className="text-6xl" aria-hidden>
                  {current.icon}
                </div>
              ) : null}

              {/* text-2xl + relaxed leading: comfortable for developing
                  readers (K-2 band reads this surface most). Slides are
                  authored as 1-3 short sentences, so the larger size never
                  produces a text wall. */}
              <div className="text-2xl font-semibold leading-relaxed max-w-prose">
                {resolveText(t, current?.text)}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  disabled={slideIndex === 0}
                  onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                  aria-label={t("activityPlayer.prevSlide")}
                  className="min-h-[44px] px-5"
                >
                  {t("activityPlayer.back")}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("activityPlayer.prevSlide")}</p>
              </TooltipContent>
            </Tooltip>

            {slideIndex < slides.length - 1 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() =>
                      setSlideIndex((i) => Math.min(slides.length - 1, i + 1))
                    }
                    aria-label={t("activityPlayer.nextSlide")}
                    className="min-h-[44px] px-6"
                  >
                    {t("activityPlayer.next")} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("activityPlayer.nextSlide")}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                onClick={() => setMode("quiz")}
                className="min-h-[44px] px-6"
              >
                {t("activityPlayer.startQuiz")} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      );
    }

    // Quiz
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <ActivityHeader
          title={activity.title}
          visualKey="quiz"
          subtitle={t("activityPlayer.quizSubtitle")}
        />
        <div className="flex items-center justify-between">
          {isQuizOnly ? (
            <Button variant="outline" onClick={() => navigate(`/student/modules/${slug}`)}>
              {t("activityPlayer.back")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setMode("story")}>
              {t("activityPlayer.backToStory")}
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {questions.map((q) => {
              const isWrong = submitted && incorrectIds.includes(q.id);
              const promptId = `question-prompt-${q.id}`;
              return (
                <div key={q.id} className="space-y-2">
                  <div className="font-semibold text-lg" id={promptId}>
                    {resolveText(t, q.prompt)}
                    {isWrong && (
                      <span className="text-red-500 ml-2 text-sm">
                        {t("activityPlayer.tryAgain")}
                      </span>
                    )}
                  </div>
                  <div
                    className="grid gap-2"
                    role="group"
                    aria-labelledby={promptId}
                  >
                    {(() => {
                      const resolved = resolveChoiceList(t, q.choices);
                      const order = shuffleMap[q.id] ?? q.choices.map((_, i) => i);
                      return order.map((origIdx) => {
                        const selected = answers[q.id] === origIdx;
                        return (
                          <Button
                            key={origIdx}
                            variant={selected ? "default" : "outline"}
                            aria-pressed={selected}
                            // h-auto + whitespace-normal: choices wrap instead
                            // of clipping; min-h-[44px] + py-3 keeps every
                            // choice a comfortable K-2 tap target.
                            className={`justify-start text-left h-auto min-h-[44px] py-3 whitespace-normal ${isWrong && selected ? "border-red-500 text-red-600 bg-red-50" : ""}`}
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [q.id]: origIdx }));
                              if (isWrong) {
                                setIncorrectIds((prev) =>
                                  prev.filter((id) => id !== q.id),
                                );
                              }
                            }}
                          >
                            {resolved[origIdx]}
                          </Button>
                        );
                      });
                    })()}
                  </div>
                  {isWrong && q.hint && (
                    <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-100 animate-in fade-in">
                      💡 {resolveText(t, q.hint)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Submit is the hero action; Reset is demoted to ghost so a
                K-2 student doesn't accidentally wipe all answers reaching
                for the primary button. */}
            <div className="flex gap-2 items-center">
              <Button
                disabled={!allAnswered}
                className="min-h-[44px] px-6 flex-1 sm:flex-none"
                onClick={() => {
                  const incorrect = questions.filter(
                    (q) => answers[q.id] !== q.answerIndex,
                  );
                  if (incorrect.length === 0) {
                    handleComplete();
                    return;
                  }
                  setSubmitted(true);
                  setIncorrectIds(incorrect.map((q) => q.id));
                  toast({
                    title: t("activityPlayer.almost"),
                    description: t("activityPlayer.checkHints"),
                  });
                }}
              >
                {t("activityPlayer.submit")}
              </Button>
              <Button
                variant="ghost"
                className="min-h-[44px] text-slate-500"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setIncorrectIds([]);
                }}
              >
                {t("activityPlayer.reset")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // INTERACT: mini-game
  if (activity.kind === "INTERACT") {
    const key = content?.gameKey;

    // Check registry first (covers new React games + old slug aliases)
    const RegistryGame = key ? GAME_COMPONENTS[key] : undefined;
    if (RegistryGame) {
      const gameConfig = { ...content, gradeBand };
      return (
        <div className="p-6">
          <RegistryGame config={gameConfig} onComplete={handleComplete} />
        </div>
      );
    }

    if (key === "tank_trek") {
      return (
        <div className="p-6">
          <TankTrekGame config={content} onComplete={handleComplete} />
        </div>
      );
    }
    if (key === "quantum_quest") {
      return (
        <div className="p-6">
          <QuantumQuestGame config={content} onComplete={handleComplete} />
        </div>
      );
    }

    // Fallback for unsupported or legacy interact
    const text = resolveText(
      t,
      content?.text ?? activity.content,
      activity.content,
    );

    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <ActivityHeader title={activity.title} visualKey="game" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Show text content if available */}
            <div className="text-lg leading-relaxed max-w-prose text-gray-700 whitespace-pre-wrap">
              {text}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/student/modules/${slug}`)}
                variant="outline"
                className="min-h-[44px]"
              >
                {t("activityPlayer.back")}
              </Button>
              <Button className="min-h-[44px] px-6" onClick={() => handleComplete()}>
                {t("activityPlayer.markComplete")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-xl font-bold">{t("activityPlayer.unsupported")}</div>
          <Button
            onClick={() => navigate(`/student/modules/${slug}`)}
            variant="outline"
          >
            {t("activityPlayer.backToModule")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
