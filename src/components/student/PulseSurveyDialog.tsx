import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

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
  id,
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
      <RadioGroup
        value={value}
        onValueChange={onChange}
        className="flex gap-3"
      >
        {SCALE.map((n, i) => (
          <div key={n} className="flex flex-col items-center gap-1">
            <RadioGroupItem value={n} id={`${id}-${n}`} />
            <Label
              htmlFor={`${id}-${n}`}
              className="text-xs text-slate-500 cursor-pointer text-center leading-tight max-w-[60px]"
            >
              {n}
            </Label>
            {i === 0 || i === 4 ? (
              <span className="text-[10px] text-slate-400 text-center leading-tight max-w-[60px]">
                {SCALE_LABELS[i]}
              </span>
            ) : null}
          </div>
        ))}
      </RadioGroup>
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
  const api = useApi();
  const { toast } = useToast();

  const [confidence, setConfidence] = useState("");
  const [enjoyment, setEnjoyment] = useState("");
  const [willContinue, setWillContinue] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = confidence !== "";

  const reset = () => {
    setConfidence("");
    setEnjoyment("");
    setWillContinue("");
    setNote("");
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await api.post("/pulse", {
        courseId,
        kind,
        score: Number(confidence),
        answers: {
          enjoyment: enjoyment ? Number(enjoyment) : undefined,
          continue: willContinue ? Number(willContinue) : undefined,
          note: note.trim() || undefined,
        },
      });
      localStorage.setItem(`bb_pulse_${kind.toLowerCase()}_${courseId}`, "1");
      toast({ title: "Thanks for sharing!", description: "Your response was saved." });
      reset();
      onOpenChange(false);
      onSubmitted?.();
    } catch {
      toast({
        title: "Oops!",
        description: "Could not save your response. Please try again.",
        variant: "destructive",
      });
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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip} disabled={submitting}>
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
