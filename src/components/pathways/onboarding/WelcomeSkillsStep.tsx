/**
 * Step 2: Cyber Skills 101 quick tour.
 *
 * 7 skill cards walked one at a time. Each card has a short title +
 * explanation. Six are static instructional cards; one (Copy & Paste)
 * has a live validator that confirms the student can copy and paste a
 * string without losing/adding characters.
 *
 * Students can advance per-card ("I know this") or step through the
 * full set ("Got it"). Skip-the-whole-thing button advances to the
 * mission step with skillsTourSkipped=true.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  FolderTree,
  Clipboard,
  Search,
  HelpCircle,
  KeyRound,
  Lock,
  CheckCircle2,
} from "lucide-react";
import WelcomeLayout, { StepNav } from "./WelcomeLayout";
import { useOnboarding } from "./useOnboarding";

interface SkillCard {
  slug: string;
  title: string;
  body: string;
  Icon: typeof Camera;
  body2?: string;
  /** Per-card optional interactive renderer. */
  Demo?: () => JSX.Element;
}

function ScreenshotDemo() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      <DemoRow
        label="Windows"
        kbd={["Windows", "Shift", "S"]}
        hint="select the area you want to capture"
      />
      <DemoRow
        label="Mac"
        kbd={["Cmd", "Shift", "4"]}
        hint="drag to select the area"
      />
      <DemoRow
        label="iPhone"
        kbd={["Side", "Volume Up"]}
        hint="press both briefly, then tap to edit"
      />
      <DemoRow
        label="Android"
        kbd={["Power", "Volume Down"]}
        hint="press both briefly, then preview"
      />
    </div>
  );
}

function DemoRow({
  label,
  kbd,
  hint,
}: {
  label: string;
  kbd: string[];
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
        {label}
      </p>
      <div className="mt-1 flex flex-wrap gap-1 items-center">
        {kbd.map((k, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-slate-400 text-xs">+</span>}
            <kbd className="text-[11px] px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono text-slate-700 dark:text-slate-200">
              {k}
            </kbd>
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{hint}</p>
    </div>
  );
}

function FilePathDemo() {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
      <div className="flex items-center gap-1.5 text-sm">
        <FolderTree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-slate-700 dark:text-slate-300">home</span>
        <span className="text-slate-400">›</span>
        <FolderTree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-slate-700 dark:text-slate-300">student</span>
        <span className="text-slate-400">›</span>
        <FolderTree className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-slate-700 dark:text-slate-300">Documents</span>
      </div>
      <code className="mt-2 block text-xs font-mono text-indigo-700 dark:text-indigo-300">
        /home/student/Documents
      </code>
      <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
        The path is the directions to the file.
      </p>
    </div>
  );
}

function CopyPasteDemo() {
  const TARGET = "flag_practice_2026";
  const [value, setValue] = useState("");
  const isMatch = value === TARGET;
  const isClose = value.trim() === TARGET && value !== TARGET;
  return (
    <div className="mt-3 space-y-2">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-100 select-all">
        {TARGET}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder="Paste the string here…"
        className={`w-full rounded-lg border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 px-3 py-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
          isMatch
            ? "border-emerald-400 dark:border-emerald-600"
            : isClose
              ? "border-amber-400 dark:border-amber-600"
              : "border-slate-200 dark:border-slate-700"
        }`}
      />
      {isMatch && (
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Perfect — that's how clean a
          copy needs to be.
        </p>
      )}
      {isClose && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Close — there's extra whitespace at the start or end. A real flag
          would fail. Try again.
        </p>
      )}
      {!isMatch && !isClose && value.length > 0 && (
        <p className="text-xs text-slate-500">
          Not matching yet. Triple-click the line above to select all, then
          copy + paste.
        </p>
      )}
    </div>
  );
}

function InspectDemo() {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 text-sm">
      <ol className="space-y-1.5 text-slate-700 dark:text-slate-300 list-decimal list-inside">
        <li>Right-click anywhere on a webpage.</li>
        <li>
          Click <strong>Inspect</strong> (or
          <strong> Inspect Element</strong>).
        </li>
        <li>
          A panel opens showing the page's HTML, CSS, and network requests.
          We'll use this for some web challenges.
        </li>
      </ol>
      <p className="mt-2 text-xs text-slate-500">
        Keyboard shortcut: <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[11px]">F12</kbd>{" "}
        on most browsers.
      </p>
    </div>
  );
}

function GoodQuestionDemo() {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div className="rounded-lg border border-rose-300 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 p-3">
        <p className="text-[10px] uppercase tracking-wider text-rose-700 dark:text-rose-300 font-semibold mb-1">
          Not very useful
        </p>
        <p className="text-xs text-rose-900 dark:text-rose-200 italic">
          "It's not working :("
        </p>
      </div>
      <div className="rounded-lg border border-emerald-300 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 p-3">
        <p className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-semibold mb-1">
          Easy to help with
        </p>
        <p className="text-xs text-emerald-900 dark:text-emerald-200">
          "Trying the Caesar's Secret challenge. I submitted
          <span className="font-mono"> theflagisautumnleaves</span> but got
          'try again'. I shifted each letter back by 3. What am I missing?"
        </p>
      </div>
      <p className="sm:col-span-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
        Three ingredients: <strong>what you tried</strong>,{" "}
        <strong>what happened</strong>, <strong>what you expected</strong>.
      </p>
    </div>
  );
}

function MfaDemo() {
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
      <DemoStep n={1} title="Sign in" body="You enter your username and password." />
      <DemoStep n={2} title="Second factor" body="The site asks for a 6-digit code." />
      <DemoStep n={3} title="Approve" body="You open an authenticator app and read the code." />
    </div>
  );
}

function DemoStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
        Step {n}
      </p>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
        {title}
      </p>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{body}</p>
    </div>
  );
}

function PasswordManagerDemo() {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-3 space-y-2 text-sm">
      <p className="text-slate-700 dark:text-slate-300">
        A password manager is a safe vault for all your logins. It can:
      </p>
      <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300 pl-2">
        <li>• Remember every site's password (you only memorize one)</li>
        <li>• Generate strong, unique passwords automatically</li>
        <li>• Warn you when a site you use is breached</li>
      </ul>
      <p className="text-xs text-slate-600 dark:text-slate-400">
        Free option we recommend:{" "}
        <a
          href="https://bitwarden.com"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-700 dark:text-indigo-300 underline"
        >
          Bitwarden
        </a>
        .
      </p>
    </div>
  );
}

const SKILLS: SkillCard[] = [
  {
    slug: "screenshot",
    title: "Taking a screenshot",
    body: "Sometimes you'll need to show someone what's on your screen. Here's how on each device.",
    Icon: Camera,
    Demo: ScreenshotDemo,
  },
  {
    slug: "file-path",
    title: "What a file path looks like",
    body: "Files live in folders. A path tells you where. We'll see paths like /home/student/Documents.",
    Icon: FolderTree,
    Demo: FilePathDemo,
  },
  {
    slug: "copy-paste",
    title: "Copy and paste accurately",
    body: "When you copy a flag or password, even one extra space breaks it. Try copying the string below and pasting it into the box.",
    Icon: Clipboard,
    Demo: CopyPasteDemo,
  },
  {
    slug: "inspect",
    title: "What 'inspect element' means",
    body: "Web pages have a hidden source you can view in your browser. We'll use this for some challenges.",
    Icon: Search,
    Demo: InspectDemo,
  },
  {
    slug: "good-question",
    title: "How to ask a good question",
    body: "Including three things in your question makes you much more likely to get useful help quickly.",
    Icon: HelpCircle,
    Demo: GoodQuestionDemo,
  },
  {
    slug: "mfa",
    title: "What MFA means",
    body: "Multi-factor authentication. The second thing (besides your password) that proves it's really you.",
    Icon: KeyRound,
    Demo: MfaDemo,
  },
  {
    slug: "password-manager",
    title: "How a password manager works",
    body: "A safe place that remembers your passwords for you so you can use unique strong passwords everywhere.",
    Icon: Lock,
    Demo: PasswordManagerDemo,
  },
];

export default function WelcomeSkillsStep() {
  const navigate = useNavigate();
  const { patch } = useOnboarding();
  const [idx, setIdx] = useState(0);
  const card = SKILLS[idx];
  const Icon = card.Icon;
  const Demo = card.Demo;

  const advance = async (skipped = false) => {
    // Mark the whole tour viewed/skipped when finishing OR explicitly skipping.
    if (idx + 1 >= SKILLS.length) {
      await patch({ skillsTourViewed: true });
      navigate("/pathways/welcome/mission");
      return;
    }
    if (skipped) {
      await patch({ skillsTourViewed: true, skillsTourSkipped: true });
      navigate("/pathways/welcome/mission");
      return;
    }
    setIdx(idx + 1);
  };

  return (
    <WelcomeLayout
      step={2}
      title="A quick tour before we start"
      subtitle="Cyber work uses some everyday computer skills. Let's make sure you're comfortable with them. You can skip any you already know."
      showSkipToDashboard
    >
      <div className="space-y-5">
        {/* Inner progress dots within this step */}
        <div className="flex items-center gap-1">
          {SKILLS.map((s, i) => (
            <span
              key={s.slug}
              className={`h-1 rounded-full transition-all ${
                i === idx
                  ? "w-6 bg-indigo-500"
                  : i < idx
                    ? "w-3 bg-emerald-500"
                    : "w-3 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
          <span className="ml-2 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
            {idx + 1} / {SKILLS.length}
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {card.title}
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 leading-relaxed">
            {card.body}
          </p>
          {Demo && <Demo />}
        </div>

        <StepNav
          onBack={idx > 0 ? () => setIdx(idx - 1) : undefined}
          onNext={() => void advance(false)}
          nextLabel={idx + 1 >= SKILLS.length ? "Continue →" : "Got it →"}
          secondaryAction={
            <button
              onClick={() => void advance(true)}
              className="px-3 py-2 min-h-[44px] text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              Skip the rest
            </button>
          }
        />
      </div>
    </WelcomeLayout>
  );
}
