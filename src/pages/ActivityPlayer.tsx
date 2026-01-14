// src/pages/ActivityPlayer.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import SequenceDragDropGame from "@/components/activities/SequenceDragDropGame";
import { useTranslation } from "react-i18next";
import {
  LocalizedField,
  resolveText,
  resolveChoiceList,
} from "@/utils/localizedContent";

type StorySlide = { id: string; text: LocalizedField };
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

export default function ActivityPlayer() {
  const { slug, lessonId, activityId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [module, setModule] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [content, setContent] = useState<any>(null);

  // INFO state
  const [slideIndex, setSlideIndex] = useState(0);
  const [mode, setMode] = useState<"story" | "quiz">("story");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [incorrectIds, setIncorrectIds] = useState<string[]>([]);

  const startMsRef = useRef<number>(Date.now());

  useEffect(() => {
    startMsRef.current = Date.now();
  }, [slug, lessonId, activityId]);

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
          title: "Error",
          description: e?.message || "Failed to load activity.",
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

  const completeAndExit = async () => {
    if (!slug || !lessonId || !activityId) return;
    try {
      await api.completeActivity({
        moduleSlug: slug,
        lessonId: String(lessonId),
        activityId: String(activityId),
        timeSpentS: getTimeSpentS(),
      });
      toast({ title: "Activity Completed!", description: "+50 XP" });
      navigate(`/student/modules/${slug}`);
    } catch {
      toast({
        title: "Error",
        description: "Failed to save progress.",
        variant: "destructive",
      });
    }
  };

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
    const slides: StorySlide[] = Array.isArray(content?.slides)
      ? content.slides
      : [];
    const questions: StoryQuestion[] = Array.isArray(content?.questions)
      ? content.questions
      : [];

    if (content?.type !== "story_quiz" || slides.length === 0) {
      // fallback display
      const text = resolveText(
        t,
        content?.text ?? activity.content,
        activity.content,
      );
      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="text-xl font-bold">{activity.title}</div>
              <div className="text-gray-700 whitespace-pre-wrap">{text}</div>
              <div className="flex gap-2">
                <Button
                  onClick={() => navigate(`/student/modules/${slug}`)}
                  variant="outline"
                >
                  Back
                </Button>
                <Button onClick={completeAndExit}>Mark Complete</Button>
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
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigate(`/student/modules/${slug}`)}
            >
              Back
            </Button>
            <div className="text-sm text-gray-500">
              Slide {Math.min(slideIndex + 1, slides.length)}/{slides.length}
            </div>
          </div>

          <Card>
            <CardContent className="p-8 text-center min-h-[200px] flex items-center justify-center">
              <div className="text-xl font-semibold">
                {resolveText(t, current?.text)}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={slideIndex === 0}
              onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </Button>
            {slideIndex < slides.length - 1 ? (
              <Button
                onClick={() =>
                  setSlideIndex((i) => Math.min(slides.length - 1, i + 1))
                }
              >
                Next
              </Button>
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
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setMode("story")}>
            Back to Story
          </Button>
          <div className="text-sm text-gray-500">Quick Quiz</div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-2xl font-bold">{activity.title}</div>

            {questions.map((q) => {
              const isWrong = submitted && incorrectIds.includes(q.id);
              return (
                <div key={q.id} className="space-y-2">
                  <div className="font-semibold">
                    {resolveText(t, q.prompt)}
                    {isWrong && (
                      <span className="text-red-500 ml-2 text-sm">
                        (Try again!)
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {resolveChoiceList(t, q.choices).map((c, idx) => {
                      const selected = answers[q.id] === idx;
                      return (
                        <Button
                          key={idx}
                          variant={selected ? "default" : "outline"}
                          className={`justify-start ${isWrong && selected ? "border-red-500 text-red-600 bg-red-50" : ""}`}
                          onClick={() => {
                            setAnswers((prev) => ({ ...prev, [q.id]: idx }));
                            // Clear incorrect status for this specific question when they change answer
                            if (isWrong) {
                              setIncorrectIds((prev) =>
                                prev.filter((id) => id !== q.id),
                              );
                            }
                          }}
                        >
                          {c}
                        </Button>
                      );
                    })}
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
                    completeAndExit();
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
          <SequenceDragDropGame config={content} onComplete={completeAndExit} />
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
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-xl font-bold">{activity.title}</div>
            {/* Show text content if available */}
            <div className="text-gray-700 whitespace-pre-wrap">{text}</div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/student/modules/${slug}`)}
                variant="outline"
              >
                Back
              </Button>
              <Button onClick={completeAndExit}>Mark Complete</Button>
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
