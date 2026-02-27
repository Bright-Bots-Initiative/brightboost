import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PulseKind = "PRE" | "POST";

interface PulseSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  kind: PulseKind;
  onSubmitted?: () => void;
}

const SCALE = ["1", "2", "3", "4", "5"] as const;
const SCALE_LABELS = ["Not at all", "A little", "Okay", "Pretty good", "Super confident!"];

function ScaleQuestion({
  question,
  value,
  onChange,
}: {
  id: string;
  question: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">{question}</p>
      <div className="flex gap-2">
        {SCALE.map((n, i) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all cursor-pointer min-w-[48px]",
              value === n
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <span className="text-lg font-bold">{n}</span>
            {(i === 0 || i === 4) && (
              <span className="text-[10px] leading-tight text-center max-w-[60px]">
                {SCALE_LABELS[i]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PulseSurveyDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  kind,
  onSubmitted,
}: PulseSurveyDialogProps) {
  const { toast } = useToast();

  const [confidence, setConfidence] = useState("");
  const [enjoyment, setEnjoyment] = useState("");
  const [willContinue, setWillContinue] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = confidence !== "";

  const reset = () => {
    setConfidence("");
    setEnjoyment("");
    setWillContinue("");
    setNote("");
    setSubmitting(false);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("bb_access_token");
      const { join: joinUrl, API_BASE: base } = await import("@/services/api");
      const res = await fetch(joinUrl(base, "/pulse"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          courseId,
          kind,
          score: Number(confidence),
          answers: {
            enjoyment: enjoyment ? Number(enjoyment) : undefined,
            continue: willContinue ? Number(willContinue) : undefined,
            note: note.trim() || undefined,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error || `Server error (${res.status})`,
        );
      }
      localStorage.setItem(`bb_pulse_${kind.toLowerCase()}_${courseId}`, "1");
      toast({ title: "Thanks for sharing!", description: "Your response was saved." });
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not save your response.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    reset();
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Quick Check-in ({kind})
          </DialogTitle>
          <DialogDescription>
            {courseName} — Tell us how you feel! This only takes a moment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <ScaleQuestion
            id="confidence"
            question="How confident do you feel about this subject?"
            value={confidence}
            onChange={setConfidence}
          />
          <ScaleQuestion
            id="enjoyment"
            question="How much are you enjoying learning?"
            value={enjoyment}
            onChange={setEnjoyment}
          />
          <ScaleQuestion
            id="continue"
            question="Would you keep learning more about this?"
            value={willContinue}
            onChange={setWillContinue}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Anything you want to share? (optional)
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              maxLength={500}
              placeholder="Type here..."
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Saving..." : "Submit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
