// src/pages/ActivityPlayer.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SequenceDragDropGame from "@/components/activities/SequenceDragDropGame";
import RhymeRideUnityActivity from "@/components/activities/RhymeRideUnityActivity";
import BounceBudsUnityActivity from "@/components/activities/BounceBudsUnityActivity";
import GotchaGearsUnityActivity from "@/components/activities/GotchaGearsUnityActivity";
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

/** Fisher-Yates shuffle — returns a new shuffled array of indices [0..n-1] */
function shuffleIndices(n: number, seed: string): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  // Simple deterministic-ish seed from question id so order is stable per render
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  for (let i = indices.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) | 0;
    const j = ((h >>> 0) % (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export default function ActivityPlayer() {
  const { slug, lessonId, activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [content, setContent] = useState<any>(null);

  const slides: StorySlide[] =
    activity?.kind === "INFO" && Array.isArray(content?.slides)
      ? content.slides
      : [];

  // INFO state
  const [slideIndex, setSlideIndex] = useState(0);
  const [mode, setMode] = useState<"story" | "quiz">("story");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);
  const [completionData, setCompletionData] = useState<any>(null);
  const [showBreak, setShowBreak] = useState(false);

  const BREAK_SUGGESTIONS = [
    "Do 10 jumping jacks!",
    "Draw a picture of what you just learned!",
    "Tell someone nearby one cool thing you learned!",
    "Stretch your arms up high like a rocket!",
    "Look out the window and find something interesting!",
    "Take 5 deep breaths — in through your nose, out through your mouth!",
  ];

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

  useEffect(() => {
    if (!slug || !lessonId || !activityId) return;

    setLoading(true);
    // clear stale content to avoid “half-loaded” UI when rate-limited
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
        setContent(safeJsonParse(found.content || ""));
        // reset INFO local state
        setSlideIndex(0);
        setMode("story");
        setAnswers({});
        setSubmitted(false);
        setIncorrectIds([]);
      })
      .catch((e) => {
        toast({
          title: "Oops!",
          description: "Something went wrong loading this activity. Try again!",
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lessonId, activityId]); // avoid accidental reruns

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
    try {
      const res = await api.completeActivity({
        moduleSlug: slug,
        lessonId: String(lessonId),
        activityId: String(activityId),
        timeSpentS: getTimeSpentS(),
        result,
      });
      setCompletionData(res);
      toast({
        title: "Activity Completed!",
        description: res.reward?.xpDelta ? `+${res.reward.xpDelta} points!` : "Awesome, saved!"
      });

      // Track session completions for break-time interstitial
      const count = Number(sessionStorage.getItem("bb_session_completions") || "0") + 1;
      sessionStorage.setItem("bb_session_completions", String(count));
      if (count > 0 && count % 3 === 0) {
        setShowBreak(true);
      }
    } catch {
      toast({
        title: "Oops!",
        description: "We couldn't save that one. Try again!",
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
              Activity Complete!
            </h2>

            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-2">
                <div className="text-gray-500 text-lg">You earned</div>
                <div className="text-4xl font-black text-brightboost-navy bg-brightboost-yellow/25 px-6 py-3 rounded-full flex items-center justify-center gap-2">
                  <Star className="w-8 h-8 fill-brightboost-navy text-brightboost-navy" />
                  {reward?.xpDelta ? `+${reward.xpDelta}` : "+0"} points
                </div>
              </div>

              {isLevelUp && (
                <div className="p-3 bg-purple-100 rounded-lg animate-bounce border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700">
                    LEVEL UP! 🆙
                  </div>
                  <div className="text-sm text-purple-600">
                    You are getting stronger!
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
                  Unlocked {reward.newAbilitiesDelta} new abilit
                  {reward.newAbilitiesDelta > 1 ? "ies" : "y"}! ⚡
                </div>
              )}
            </div>

            <Button
              size="lg"
              className="w-full text-lg gap-2"
              onClick={() => navigate(`/student/modules/${slug}`)}
            >
              Done <ArrowRight className="w-5 h-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Break Time Interstitial */}
        <Dialog open={showBreak} onOpenChange={setShowBreak}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold flex items-center justify-center gap-2">
                <TreePine className="w-7 h-7 text-green-600" />
                Time for a Break!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-lg text-slate-700">
                Great work! You've finished 3 activities! Time to stretch, move around, or try something fun:
              </p>
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <p className="text-green-800 font-semibold text-lg">
                  {BREAK_SUGGESTIONS[Math.floor(Math.random() * BREAK_SUGGESTIONS.length)]}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              className="w-full text-lg"
              onClick={() => setShowBreak(false)}
            >
              Ready to keep going!
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Loading activity...</div>;
  }

  if (!module || !activity) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-lg font-semibold">Activity not found</div>
            <Button
              onClick={() =>
                navigate(slug ? `/student/modules/${slug}` : "/student/modules")
              }
            >
              Back to Module
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // INFO: story + quiz
  if (activity.kind === "INFO") {
    // slides is already defined at top level
    const questions: StoryQuestion[] = Array.isArray(content?.questions)
      ? content.questions
      : [];

    // Build a stable shuffled-index map per question so choices appear in random order
    // but stay consistent across re-renders. Key = question id, value = shuffled indices.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const shuffleMap: Record<string, number[]> = useMemo(() => {
      const map: Record<string, number[]> = {};
      for (const q of questions) {
        map[q.id] = shuffleIndices(q.choices.length, q.id);
      }
      return map;
    }, [questions]);

    if (content?.type !== "story_quiz" || slides.length === 0) {
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
              <div className="text-gray-700 whitespace-pre-wrap">{text}</div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/student/modules/${slug}`)}
                  variant="outline"
                >
                  Back
                </Button>
                <Button onClick={handleComplete}>Mark Complete</Button>
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

    if (mode === "story") {
      return (
        <div className="p-6 max-w-3xl mx-auto space-y-4">
          <ActivityHeader
            title={activity.title}
            visualKey="story"
            subtitle={`Slide ${Math.min(slideIndex + 1, slides.length)} of ${slides.length}`}
          />
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(`/student/modules/${slug}`)}
            >
              Back
            </Button>
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

              <div className="text-xl font-semibold">
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
                  aria-label="Go to previous slide"
                >
                  Back
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Previous Slide (←)</p>
              </TooltipContent>
            </Tooltip>

            {slideIndex < slides.length - 1 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() =>
                      setSlideIndex((i) => Math.min(slides.length - 1, i + 1))
                    }
                    aria-label="Go to next slide"
                  >
                    Next
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next Slide (→)</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={() => setMode("quiz")}>Start Quiz</Button>
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
          subtitle="Answer questions to complete the lesson!"
        />
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setMode("story")}>
            Back to Story
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            {questions.map((q) => {
              const isWrong = submitted && incorrectIds.includes(q.id);
              const promptId = `question-prompt-${q.id}`;
              return (
                <div key={q.id} className="space-y-2">
                  <div className="font-semibold" id={promptId}>
                    {resolveText(t, q.prompt)}
                    {isWrong && (
                      <span className="text-red-500 ml-2 text-sm">
                        (Try again!)
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
                            className={`justify-start ${isWrong && selected ? "border-red-500 text-red-600 bg-red-50" : ""}`}
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                  setIncorrectIds([]);
                }}
              >
                Reset
              </Button>
              <Button
                disabled={!allAnswered}
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
                    title: "Almost!",
                    description: `Check the hints and try again!`,
                  });
                }}
              >
                Submit
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
    if (key === "sequence_drag_drop") {
      return (
        <div className="p-6">
          <SequenceDragDropGame config={content} onComplete={handleComplete} />
        </div>
      );
    }
    if (key === "rhyme_ride_unity") {
      return (
        <div className="p-6">
          <RhymeRideUnityActivity
            config={content}
            onComplete={handleComplete}
          />
        </div>
      );
    }
    if (key === "bounce_buds_unity") {
      return (
        <div className="p-6">
          <BounceBudsUnityActivity
            config={content}
            onComplete={handleComplete}
          />
        </div>
      );
    }
    if (key === "gotcha_gears_unity") {
      return (
        <div className="p-6">
          <GotchaGearsUnityActivity
            config={content}
            onComplete={handleComplete}
          />
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
            <div className="text-gray-700 whitespace-pre-wrap">{text}</div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/student/modules/${slug}`)}
                variant="outline"
              >
                Back
              </Button>
              <Button onClick={handleComplete}>Mark Complete</Button>
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
          <div className="text-xl font-bold">Unsupported activity type</div>
          <Button
            onClick={() => navigate(`/student/modules/${slug}`)}
            variant="outline"
          >
            Back to Module
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
