/**
 * Password Strength Lab — interactive password experimentation.
 *
 * Live strength meter, heuristic crack-time estimate, side-by-side
 * comparison of three patterns (random / passphrase / common+modified),
 * "Beat the Dictionary" demonstration that common passwords fall in
 * milliseconds.
 *
 * Output saved as the student's personal password policy artifact via
 * the standard LabShell attempt API.
 *
 * The crack-time math is intentionally educational, not forensic. We
 * use a fixed 100 guesses/second offline-attacker rate against the
 * estimated keyspace — enough to differentiate "weak" from "strong" by
 * orders of magnitude without claiming false precision.
 */
import { useMemo, useState } from "react";
import { KeyRound, ShieldAlert, ShieldCheck, ExternalLink } from "lucide-react";
import LabShell, { LabApi } from "./LabShell";

const LAB_SLUG = "password-strength";

interface PasswordStrengthLabProps {
  onExit: () => void;
}

// Top common-password seeds. Used only client-side, only to demonstrate
// that the easiest dictionary attack flattens these instantly. NEVER ship
// a real attack tool here.
const DICTIONARY_DEMO = [
  "password",
  "123456",
  "qwerty",
  "letmein",
  "iloveyou",
  "admin",
  "welcome",
  "monkey",
  "dragon",
  "football",
  "password1",
  "abc123",
  "111111",
  "12345678",
];

interface StrengthAnalysis {
  score: 0 | 1 | 2 | 3 | 4; // weak..excellent
  label: string;
  reasons: string[];
  estimatedCrackSeconds: number;
  isCommon: boolean;
}

function analyze(pw: string): StrengthAnalysis {
  if (!pw) {
    return {
      score: 0,
      label: "Empty",
      reasons: ["Type a password to see how strong it is."],
      estimatedCrackSeconds: 0,
      isCommon: false,
    };
  }

  const lowered = pw.toLowerCase();
  const isCommon = DICTIONARY_DEMO.some((c) => lowered === c || lowered.startsWith(c));

  let charset = 0;
  if (/[a-z]/.test(pw)) charset += 26;
  if (/[A-Z]/.test(pw)) charset += 26;
  if (/[0-9]/.test(pw)) charset += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) charset += 32;
  if (charset === 0) charset = 26;

  // 100 guesses/second offline attacker against full keyspace — slow on
  // purpose so the visible difference between 8 and 16 chars stays striking.
  const guesses = Math.pow(charset, pw.length);
  const seconds = isCommon ? 0.001 : guesses / 1e8;

  const reasons: string[] = [];
  if (pw.length < 8) reasons.push("Less than 8 characters — far too short.");
  else if (pw.length < 12) reasons.push("8–11 characters — better, but 12+ is recommended.");
  else if (pw.length < 16) reasons.push("12–15 characters — good length.");
  else reasons.push("16+ characters — strong length.");

  if (charset < 36) reasons.push("Limited character variety.");
  else if (charset < 62) reasons.push("Decent character variety.");
  else if (charset < 94) reasons.push("Strong character variety.");
  else reasons.push("Excellent character variety.");

  if (isCommon) {
    reasons.unshift("This appears on every common-password list — cracked instantly.");
  }

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (isCommon) score = 0;
  else if (seconds < 1) score = 0;
  else if (seconds < 60 * 60 * 24) score = 1;
  else if (seconds < 60 * 60 * 24 * 365) score = 2;
  else if (seconds < 60 * 60 * 24 * 365 * 1000) score = 3;
  else score = 4;

  const label = ["Cracked instantly", "Weak", "Fair", "Strong", "Excellent"][score];
  return { score, label, reasons, estimatedCrackSeconds: seconds, isCommon };
}

function formatCrackTime(seconds: number): string {
  if (seconds < 0.01) return "instantly";
  if (seconds < 60) return `${seconds.toFixed(1)} seconds`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} minutes`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < 31536000) return `${(seconds / 86400).toFixed(1)} days`;
  if (seconds < 31536000 * 1000) return `${(seconds / 31536000).toFixed(1)} years`;
  if (seconds < 31536000 * 1e6) return `${(seconds / 31536000 / 1000).toFixed(1)}K years`;
  if (seconds < 31536000 * 1e9) return `${(seconds / 31536000 / 1e6).toFixed(1)}M years`;
  return `${(seconds / 31536000 / 1e9).toFixed(1)}B years`;
}

const METER_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-emerald-600",
];

export default function PasswordStrengthLab({ onExit }: PasswordStrengthLabProps) {
  return (
    <LabShell
      onExit={onExit}
      briefing={{
        title: "Password Strength Lab",
        subtitle:
          "Experiment with passwords and see what makes one strong. Output: your personal password policy.",
        estMinutes: 8,
        assumes: [
          "You know what a password is.",
          "You've seen a website ask you to create one.",
        ],
        outputDescription:
          "A short, personal password policy saved to your profile — what you'll do for your most-important accounts.",
      }}
    >
      {(api) => <LabBody api={api} />}
    </LabShell>
  );
}

function LabBody({ api }: { api: LabApi }) {
  const [password, setPassword] = useState("");
  const [savedOk, setSavedOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [policyNotes, setPolicyNotes] = useState("");

  const analysis = useMemo(() => analyze(password), [password]);

  const bestScoreSeen = analysis.score;

  const save = async () => {
    setSaving(true);
    await api.recordAttempt({
      labSlug: LAB_SLUG,
      score: bestScoreSeen * 25, // 0..100
      output: {
        kind: "password-policy",
        topScore: bestScoreSeen,
        policyNotes,
        savedAt: new Date().toISOString(),
      },
    });
    setSaving(false);
    setSavedOk(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 flex items-center justify-center">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Try a password
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Type and watch the meter shift. Nothing leaves your browser.
          </p>
        </div>
      </div>

      <div>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Try a password here…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 p-3 text-base font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${METER_COLORS[analysis.score]} transition-all duration-300`}
              style={{ width: `${(analysis.score / 4) * 100}%` }}
            />
          </div>
          <span
            className={`text-sm font-semibold ${
              analysis.score >= 3
                ? "text-emerald-700 dark:text-emerald-400"
                : analysis.score === 2
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-red-700 dark:text-red-400"
            }`}
          >
            {analysis.label}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-2">
            Est. time to crack
          </span>
          <span className="font-mono">{formatCrackTime(analysis.estimatedCrackSeconds)}</span>
        </p>
        {analysis.reasons.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400">
            {analysis.reasons.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-slate-400 dark:text-slate-600 shrink-0">·</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Three pattern comparison */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Try these three patterns
          </p>
        </div>
        <ComparisonRow value="Password1!" label="Common + modified" onPick={setPassword} />
        <ComparisonRow value="X7q$pN!2vWzL" label="Random 12-char" onPick={setPassword} />
        <ComparisonRow
          value="correct horse battery staple"
          label="4-word passphrase"
          onPick={setPassword}
        />
        <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-relaxed">
          The passphrase looks easy but is longer than the random one — and length is what
          matters most. Tap any row to load it.
        </p>
      </div>

      {/* Beat the dictionary */}
      <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-950/20 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
          <p className="text-sm font-semibold text-red-900 dark:text-red-200">
            Beat the Dictionary
          </p>
        </div>
        <p className="text-xs text-red-900 dark:text-red-200/90">
          Every password on this list is in every attacker's first guess. They take{" "}
          <strong>milliseconds</strong> to crack.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {DICTIONARY_DEMO.map((d) => (
            <button
              key={d}
              onClick={() => setPassword(d)}
              className="text-[11px] font-mono px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          What we recommend
        </p>
        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1.5">
          <li>
            · Use a <strong>passphrase</strong> (3–4 unrelated words) for things you have to
            remember.
          </li>
          <li>
            · Use a <strong>password manager</strong> for everything else. Two free options:
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 pl-3">
          <a
            href="https://bitwarden.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            Bitwarden <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://keepassxc.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
          >
            KeePassXC <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <p className="text-[11px] text-slate-500">
          Neither company sponsors this — both are free and open-source.
        </p>
      </div>

      {/* Personal policy artifact */}
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
          Your personal password policy
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
          Write your own one-paragraph policy. Example: "I'll use a 16-character random
          password manager entry for email and bank. I'll use a 4-word passphrase for
          everything I have to type by hand."
        </p>
        <textarea
          value={policyNotes}
          onChange={(e) => setPolicyNotes(e.target.value)}
          rows={4}
          placeholder="My password policy: …"
          className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <div className="mt-3 flex items-center justify-end gap-3">
          {savedOk && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Saved to profile ✓
            </span>
          )}
          <button
            onClick={save}
            disabled={saving || policyNotes.trim().length === 0}
            className="px-5 py-3 sm:py-2 min-h-[44px] rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700 text-white text-sm font-semibold transition-all"
          >
            {saving ? "Saving…" : "Save my policy →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  value,
  label,
  onPick,
}: {
  value: string;
  label: string;
  onPick: (v: string) => void;
}) {
  const a = useMemo(() => analyze(value), [value]);
  return (
    <button
      onClick={() => onPick(value)}
      className="w-full text-left flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 active:scale-[0.99] transition-all"
    >
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="text-sm font-mono text-slate-900 dark:text-slate-100 truncate">{value}</p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-xs font-semibold ${
            a.score >= 3
              ? "text-emerald-700 dark:text-emerald-400"
              : a.score === 2
                ? "text-amber-700 dark:text-amber-400"
                : "text-red-700 dark:text-red-400"
          }`}
        >
          {a.label}
        </p>
        <p className="text-[10px] font-mono text-slate-500">
          {formatCrackTime(a.estimatedCrackSeconds)}
        </p>
      </div>
    </button>
  );
}
