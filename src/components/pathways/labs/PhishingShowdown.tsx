/**
 * Phishing Showdown — interactive phishing-detection lab.
 *
 * Three modes:
 *  - Training: 8 emails, no clock, full explanations after each call
 *  - Timed:    10 emails in 60 seconds with a 2×/3× combo multiplier
 *  - Boss:     5 sophisticated examples that fooled real people
 *
 * Difficulty tier (Recruit / Analyst / Veteran) modifies which examples
 * are eligible. Output is a "Red Flag Field Guide" listing the indicator
 * categories the student demonstrated they can spot. Mastery is concrete
 * behavior: did you correctly classify enough examples for that indicator
 * to count as recognized.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mail,
  Flame,
  Trophy,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import LabShell, { LabApi } from "./LabShell";

const LAB_SLUG = "phishing-showdown";

interface PhishingShowdownProps {
  onExit: () => void;
}

type Difficulty = "recruit" | "analyst" | "veteran";
type Mode = "training" | "timed" | "boss";
type RedFlag =
  | "sender_domain"
  | "urgency"
  | "credential_request"
  | "gift_card_request"
  | "lookalike_url"
  | "out_of_band_required"
  | "too_good_to_be_true"
  | "context_mismatch";

const FLAG_LABELS: Record<RedFlag, string> = {
  sender_domain: "Lookalike sender domain",
  urgency: "Manufactured urgency",
  credential_request: "Asks for credentials",
  gift_card_request: "Gift card or wire request",
  lookalike_url: "Lookalike URL",
  out_of_band_required: "Verify through a separate channel",
  too_good_to_be_true: "Too good to be true",
  context_mismatch: "Context doesn't match the sender",
};

interface Email {
  id: string;
  difficulty: Difficulty;
  mode: Mode | "any";
  from: string;
  subject: string;
  body: string;
  isPhishing: boolean;
  flags: RedFlag[]; // empty when isPhishing === false
  explanation: string;
}

// Hand-curated examples — entirely fictional, no real targets.
const EMAILS: Email[] = [
  // Training (Recruit)
  {
    id: "t1",
    difficulty: "recruit",
    mode: "any",
    from: "amaz0n-orders@account-verify.net",
    subject: "⚠ Your order is on hold — verify now",
    body: "We could not verify your account. Click here within 1 hour or your account will be closed.",
    isPhishing: true,
    flags: ["sender_domain", "urgency", "lookalike_url"],
    explanation:
      "Sender domain isn't actually Amazon's. The 1-hour clock is the pressure tactic.",
  },
  {
    id: "t2",
    difficulty: "recruit",
    mode: "any",
    from: "no-reply@chase.com",
    subject: "Your monthly statement is ready",
    body: "Your statement for October is available in the Chase mobile app and on chase.com. Reply STOP to opt out.",
    isPhishing: false,
    flags: [],
    explanation:
      "Real domain, no link to follow, no urgency, no ask. This is a normal notice.",
  },
  {
    id: "t3",
    difficulty: "recruit",
    mode: "any",
    from: "principal@your-school.edu",
    subject: "Urgent — student aid forms — please pay $50 by 5pm",
    body: "Please pay the $50 student aid processing fee at the link below by 5pm today.",
    isPhishing: true,
    flags: ["urgency", "context_mismatch"],
    explanation:
      "Schools don't ask for payment through email links. Real address can be spoofed.",
  },
  {
    id: "t4",
    difficulty: "recruit",
    mode: "any",
    from: "support@github.com",
    subject: "New sign-in to your account",
    body: "A new sign-in was detected from Chrome on Windows in Austin, TX. If this was you, no action is needed.",
    isPhishing: false,
    flags: [],
    explanation:
      "Notification of a real event, not a demand. No link required to act. Verify in the app if uncertain.",
  },
  // Training (Analyst)
  {
    id: "t5",
    difficulty: "analyst",
    mode: "any",
    from: "cfo@company-name.com",
    subject: "Quick favor — gift cards for client appreciation",
    body: "I'm in a meeting. Please buy ten $200 Amazon gift cards and reply with the codes. I'll explain later.",
    isPhishing: true,
    flags: ["gift_card_request", "urgency", "out_of_band_required"],
    explanation:
      "Any 'buy gift cards and send codes' request is a scam. Even if the address looks right, verify on the phone.",
  },
  {
    id: "t6",
    difficulty: "analyst",
    mode: "any",
    from: "hr-benefits@yourcompany-mail.com",
    subject: "Re-confirm your direct deposit by EOD",
    body: "Please re-verify your direct deposit info at the link below to keep this month's paycheck on schedule.",
    isPhishing: true,
    flags: ["sender_domain", "urgency", "credential_request"],
    explanation:
      "'yourcompany-mail.com' is a lookalike, not the real company domain. Payroll phishing is huge.",
  },
  {
    id: "t7",
    difficulty: "analyst",
    mode: "any",
    from: "alerts@bankofamerica.com",
    subject: "Account locked — reset your password",
    body: "We detected unusual activity. Reset your password here: https://bofa-secure-login.com/reset",
    isPhishing: true,
    flags: ["lookalike_url", "urgency"],
    explanation:
      "The sender may look right, but the link points to a lookalike URL. Always go to the bank's app directly.",
  },
  {
    id: "t8",
    difficulty: "analyst",
    mode: "any",
    from: "noreply@usps.gov",
    subject: "Package out for delivery",
    body: "Your USPS package is out for delivery today. Track at usps.com/track. No action required.",
    isPhishing: false,
    flags: [],
    explanation:
      "Domain checks out, link goes to the real usps.com path. No ask, no urgency — looks legitimate.",
  },
  // Boss (Veteran)
  {
    id: "b1",
    difficulty: "veteran",
    mode: "boss",
    from: "recruiter@li nkedin.com",
    subject: "$95K junior cybersecurity role — fully remote",
    body: "We saw your profile and want to fast-track you. Please send your resume and SSN to confirm identity for the background check.",
    isPhishing: true,
    flags: ["sender_domain", "credential_request", "too_good_to_be_true"],
    explanation:
      "Real recruiters never ask for SSN before an interview. The space in 'li nkedin' is the giveaway.",
  },
  {
    id: "b2",
    difficulty: "veteran",
    mode: "boss",
    from: "support@apple.com",
    subject: "Receipt for your $89.99 iCloud purchase",
    body: "Thanks for your purchase. If this wasn't you, click here to dispute the charge.",
    isPhishing: true,
    flags: ["urgency", "context_mismatch", "credential_request"],
    explanation:
      "Domain looks right. The trick: making you click 'dispute' in a panic. Real disputes go through appleid.apple.com, which you type yourself.",
  },
  {
    id: "b3",
    difficulty: "veteran",
    mode: "boss",
    from: "it-helpdesk@yourcompany.com",
    subject: "Microsoft 365 password expires in 24 hours",
    body: "Your password expires tomorrow. Re-authenticate to keep working: https://login.microsoftoffline.com/yourcompany",
    isPhishing: true,
    flags: ["lookalike_url", "urgency", "credential_request"],
    explanation:
      "Real IT uses real Microsoft URLs. 'microsoftoffline' is a lookalike. The 24-hour clock is engineered urgency.",
  },
  {
    id: "b4",
    difficulty: "veteran",
    mode: "boss",
    from: "ceo@yourcompany.com",
    subject: "Wire transfer — confidential",
    body: "Can you initiate a $48,200 wire to the attached account? Closing a deal — please don't loop legal in until I tell you.",
    isPhishing: true,
    flags: ["urgency", "out_of_band_required", "context_mismatch"],
    explanation:
      "Classic CEO fraud. Telling you to bypass normal process IS the red flag.",
  },
  {
    id: "b5",
    difficulty: "veteran",
    mode: "boss",
    from: "no-reply@github.com",
    subject: "Sign-in attempt from Russia",
    body: "Someone tried to sign in to your GitHub from Moscow. If this was you, no action needed. If not, review at github.com/settings/security.",
    isPhishing: false,
    flags: [],
    explanation:
      "Counterintuitive — this one's real. Genuine sender, no link asked-of you, you can navigate to settings yourself. The location alarm is the point.",
  },
];

interface ScoreState {
  correct: number;
  incorrect: number;
  combo: number;
  bestCombo: number;
  score: number;
  // Track each indicator's correct catches so the final guide is concrete.
  flagsCaught: Partial<Record<RedFlag, number>>;
  emailsSeen: number;
}

const INITIAL_SCORE: ScoreState = {
  correct: 0,
  incorrect: 0,
  combo: 0,
  bestCombo: 0,
  score: 0,
  flagsCaught: {},
  emailsSeen: 0,
};

export default function PhishingShowdown({ onExit }: PhishingShowdownProps) {
  return (
    <LabShell
      onExit={onExit}
      briefing={{
        title: "Phishing Showdown",
        subtitle:
          "Spot the phishing emails before they spot you. Three modes, three difficulty tiers.",
        estMinutes: 12,
        assumes: [
          "You've used email and have seen sketchy messages.",
          "You can read short text under time pressure.",
        ],
        outputDescription:
          "Your Red Flag Field Guide — a personal cheat sheet of phishing indicators you've shown you can spot.",
      }}
    >
      {(api) => <LabBody api={api} />}
    </LabShell>
  );
}

function LabBody({ api }: { api: LabApi }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("recruit");
  const [phase, setPhase] = useState<"choose" | "playing" | "done">("choose");

  if (phase === "choose") {
    return (
      <ModePicker
        difficulty={difficulty}
        setDifficulty={setDifficulty}
        onChoose={(m) => {
          setMode(m);
          setPhase("playing");
        }}
      />
    );
  }

  if (phase === "playing" && mode) {
    return (
      <PlayRound
        api={api}
        mode={mode}
        difficulty={difficulty}
        onDone={() => setPhase("done")}
        onPickAgain={() => setPhase("choose")}
      />
    );
  }

  return null;
}

function ModePicker({
  difficulty,
  setDifficulty,
  onChoose,
}: {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  onChoose: (m: Mode) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 flex items-center justify-center">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Pick a difficulty
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            You can replay at any tier — the goal is recognition, not score.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(["recruit", "analyst", "veteran"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDifficulty(d)}
            className={`px-3 py-3 min-h-[56px] rounded-lg border text-sm font-semibold capitalize transition-all active:scale-[0.98] ${
              difficulty === d
                ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-200 dark:border-indigo-500"
                : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Choose a mode
        </h3>
        <div className="space-y-2">
          <ModeCard
            mode="training"
            title="Training"
            description="8 emails, no clock. See the explanation after each call."
            onChoose={onChoose}
          />
          <ModeCard
            mode="timed"
            title="Timed Mode"
            description="10 emails in 60 seconds. 3 correct in a row = 2×. 5 in a row = 3×."
            onChoose={onChoose}
          />
          <ModeCard
            mode="boss"
            title="Boss Mode"
            description="5 sophisticated examples that fooled real people. Forensic explanations."
            onChoose={onChoose}
          />
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  title,
  description,
  onChoose,
}: {
  mode: Mode;
  title: string;
  description: string;
  onChoose: (m: Mode) => void;
}) {
  return (
    <button
      onClick={() => onChoose(mode)}
      className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-indigo-400 dark:hover:border-indigo-600 active:scale-[0.99] transition-all"
    >
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{description}</p>
    </button>
  );
}

function pickEmails(mode: Mode, difficulty: Difficulty): Email[] {
  if (mode === "boss") {
    return EMAILS.filter((e) => e.mode === "boss");
  }
  const tierOrder: Difficulty[] = ["recruit", "analyst", "veteran"];
  const allowed = tierOrder.slice(0, tierOrder.indexOf(difficulty) + 1);
  const pool = EMAILS.filter(
    (e) => e.mode !== "boss" && allowed.includes(e.difficulty),
  );
  const limit = mode === "timed" ? 10 : 8;
  // Cycle through the pool to fill the limit if pool is smaller.
  const out: Email[] = [];
  for (let i = 0; i < limit; i++) out.push(pool[i % pool.length]);
  return out;
}

function PlayRound({
  api,
  mode,
  difficulty,
  onDone,
  onPickAgain,
}: {
  api: LabApi;
  mode: Mode;
  difficulty: Difficulty;
  onDone: () => void;
  onPickAgain: () => void;
}) {
  const emails = useMemo(() => pickEmails(mode, difficulty), [mode, difficulty]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState<ScoreState>(INITIAL_SCORE);
  const [lastResult, setLastResult] = useState<null | { right: boolean; email: Email }>(null);
  const [timeLeft, setTimeLeft] = useState(mode === "timed" ? 60 : null);
  const [finished, setFinished] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (mode !== "timed" || finished) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null) return null;
        if (t <= 1) {
          setFinished(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, finished]);

  useEffect(() => {
    if (!finished || savedRef.current) return;
    savedRef.current = true;
    const fieldGuide = Object.entries(score.flagsCaught)
      .filter(([, count]) => (count ?? 0) >= 2)
      .map(([flag]) => flag as RedFlag);
    api.recordAttempt({
      labSlug: LAB_SLUG,
      mode,
      score: score.score,
      output: {
        kind: "red-flag-field-guide",
        mode,
        difficulty,
        correct: score.correct,
        incorrect: score.incorrect,
        bestCombo: score.bestCombo,
        fieldGuide,
        savedAt: new Date().toISOString(),
      },
    });
    onDone();
  }, [finished, score, mode, difficulty, api, onDone]);

  const handleAnswer = (saidPhishing: boolean) => {
    const email = emails[idx];
    const right = saidPhishing === email.isPhishing;
    setLastResult({ right, email });
    setScore((s) => {
      const combo = right ? s.combo + 1 : 0;
      const multiplier = combo >= 5 ? 3 : combo >= 3 ? 2 : 1;
      const award = right ? 10 * multiplier : 0;
      const flagsCaught = { ...s.flagsCaught };
      if (right && saidPhishing) {
        for (const f of email.flags) {
          flagsCaught[f] = (flagsCaught[f] ?? 0) + 1;
        }
      }
      return {
        correct: s.correct + (right ? 1 : 0),
        incorrect: s.incorrect + (right ? 0 : 1),
        combo,
        bestCombo: Math.max(s.bestCombo, combo),
        score: s.score + award,
        flagsCaught,
        emailsSeen: s.emailsSeen + 1,
      };
    });

    // Training mode pauses to show explanation; timed/boss auto-advance.
    if (mode === "training" || mode === "boss") return;
    advanceOrFinish();
  };

  const advanceOrFinish = () => {
    setLastResult(null);
    if (idx + 1 >= emails.length) {
      setFinished(true);
    } else {
      setIdx(idx + 1);
    }
  };

  if (finished) {
    return (
      <RoundResult
        score={score}
        mode={mode}
        difficulty={difficulty}
        onAgain={onPickAgain}
      />
    );
  }

  const current = emails[idx];
  const multiplier = score.combo >= 5 ? 3 : score.combo >= 3 ? 2 : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {mode}
          </span>
          <span className="text-xs text-slate-700 dark:text-slate-300">
            {idx + 1} / {emails.length}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {timeLeft !== null && (
            <span className="font-mono text-amber-700 dark:text-amber-300">⏱ {timeLeft}s</span>
          )}
          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-mono">{score.score}</span>
          </span>
          {score.combo >= 3 && (
            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-semibold">
              <Flame className="w-3.5 h-3.5" /> {multiplier}× combo
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 overflow-hidden">
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs space-y-0.5">
          <p className="font-mono text-slate-700 dark:text-slate-300">
            <span className="text-slate-500">From:</span> {current.from}
          </p>
          <p className="font-mono text-slate-700 dark:text-slate-300">
            <span className="text-slate-500">Subject:</span> {current.subject}
          </p>
        </div>
        <div className="p-3 sm:p-4 text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
          {current.body}
        </div>
      </div>

      {!lastResult ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAnswer(true)}
            className="px-4 py-4 min-h-[52px] rounded-lg bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
          >
            Phishing
          </button>
          <button
            onClick={() => handleAnswer(false)}
            className="px-4 py-4 min-h-[52px] rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
          >
            Safe
          </button>
        </div>
      ) : (
        <div
          className={`rounded-xl border p-4 ${
            lastResult.right
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/30"
              : "border-amber-300 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-950/30"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {lastResult.right ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            )}
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {lastResult.right ? "Correct" : "Worth a closer look"}
            </p>
          </div>
          <p className="text-sm text-slate-800 dark:text-slate-200">{lastResult.email.explanation}</p>
          {lastResult.email.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lastResult.email.flags.map((f) => (
                <span
                  key={f}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 font-medium"
                >
                  {FLAG_LABELS[f]}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-end">
            <button
              onClick={advanceOrFinish}
              className="px-4 py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-medium transition-all"
            >
              {idx + 1 >= emails.length ? "See results →" : "Next email →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundResult({
  score,
  mode,
  difficulty,
  onAgain,
}: {
  score: ScoreState;
  mode: Mode;
  difficulty: Difficulty;
  onAgain: () => void;
}) {
  const fieldGuide = Object.entries(score.flagsCaught)
    .filter(([, count]) => (count ?? 0) >= 2)
    .map(([flag]) => flag as RedFlag);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/30 dark:bg-indigo-950/30 p-5 text-center">
        <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <p className="text-xs uppercase tracking-widest text-indigo-700 dark:text-indigo-300 font-semibold">
          {mode} · {difficulty}
        </p>
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100 font-mono">
          {score.score}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
          {score.correct} correct, {score.incorrect} missed
          {score.bestCombo >= 3 && (
            <>
              {" "}
              · best combo <span className="font-mono">{score.bestCombo}</span>
            </>
          )}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Your Red Flag Field Guide
        </p>
        {fieldGuide.length === 0 ? (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            You'll unlock indicators by catching them at least twice in a round. Try again
            and look for the patterns that tripped you up.
          </p>
        ) : (
          <>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Indicators you've shown you can spot:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {fieldGuide.map((f) => (
                <span
                  key={f}
                  className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-medium"
                >
                  ✓ {FLAG_LABELS[f]}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onAgain}
          className="inline-flex items-center gap-2 px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-sm font-semibold transition-all"
        >
          <RotateCcw className="w-4 h-4" /> Pick another mode
        </button>
      </div>
    </div>
  );
}
