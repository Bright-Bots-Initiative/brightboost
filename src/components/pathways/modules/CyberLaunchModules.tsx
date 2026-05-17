/**
 * Cyber Launch Track — BrightBoost Pathways.
 *
 * Each module is now a thin wrapper around <ModuleStructure>, which renders
 * the full 6-section learning flow (Hook / Reading / Lesson / Practice /
 * Homework / Quiz). The substantive content lives in cyberLaunchContent.ts;
 * this file just maps module slugs to their content, supplies the final
 * quiz, and exports a router that ModulePlayer.tsx mounts.
 *
 * For module 1 (Cyber Foundations), the quiz prompts are i18n-keyed for
 * parity with the prior implementation. The other modules' quizzes are
 * English-only for now — see docs/pathways-translation-status.md.
 *
 * Capstone (module 7) skips the quiz section; its assessment is the
 * homework submission (the written security plan).
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Beaker, KeyRound, Mail } from "lucide-react";
import ModuleStructure from "./ModuleStructure";
import { CYBER_LAUNCH_CONTENT } from "./cyberLaunchContent";
import PasswordStrengthLab from "../labs/PasswordStrengthLab";
import PhishingShowdown from "../labs/PhishingShowdown";

interface ModuleProps {
  onComplete: (score: number) => void;
  onBack: () => void;
}

// ── StandaloneQuiz ─────────────────────────────────────────────────────────

interface QuizQuestion {
  q: string;
  opts: string[];
  ans: number;
}

function StandaloneQuiz({
  questions,
  onComplete,
}: {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(0);

  const total = questions.length;
  const q = questions[idx];

  const handleAnswer = (i: number) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === q.ans) setCorrect((c) => c + 1);
  };

  const handleNext = () => {
    if (idx + 1 >= total) {
      const score = Math.round((correct / total) * 100);
      onComplete(score);
      return;
    }
    setIdx(idx + 1);
    setSelected(null);
    setAnswered(false);
  };

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        Question {idx + 1} of {total}
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{q.q}</h3>
      <div className="space-y-2">
        {q.opts.map((opt, i) => {
          const isPicked = selected === i;
          const isCorrect = i === q.ans;
          const cls = !answered
            ? "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            : isCorrect
              ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/30"
              : isPicked
                ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/30"
                : "border-slate-200 dark:border-slate-700 opacity-60";
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered}
              className={`w-full text-left rounded-lg border p-3 transition-colors text-sm ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {selected === q.ans ? "Correct." : `The right answer was: ${q.opts[q.ans]}`}
          </p>
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
          >
            {idx + 1 >= total ? "Finish →" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Quiz banks per module ──────────────────────────────────────────────────

const FOUNDATIONS_QUIZ: QuizQuestion[] = [
  {
    q: "What does cybersecurity protect?",
    opts: ["Only passwords", "Systems, networks, and data", "Just websites", "Hardware only"],
    ans: 1,
  },
  {
    q: "Which four properties does cybersecurity try to keep true?",
    opts: [
      "Speed, Storage, Bandwidth, Latency",
      "Confidentiality, Integrity, Availability, Authentication",
      "Encryption, Backup, Logging, Monitoring",
      "Firewall, Antivirus, VPN, MFA",
    ],
    ans: 1,
  },
  {
    q: "Why is the cyber workforce growing so quickly?",
    opts: [
      "Companies are reducing tech budgets",
      "Attacks are decreasing",
      "Digital threats are increasing and there aren't enough defenders",
      "Cybersecurity is being automated away",
    ],
    ans: 2,
  },
  {
    q: "Which is the most accessible starting credential for someone 16+ with no prior experience?",
    opts: [
      "CISSP",
      "OSCP",
      "ISC2 Certified in Cybersecurity (CC)",
      "GIAC Security Expert",
    ],
    ans: 2,
  },
];

const SAFETY_QUIZ: QuizQuestion[] = [
  {
    q: "Most successful attacks start with…",
    opts: ["A zero-day exploit", "Brute-forcing a server", "A person clicking a link or handing over credentials", "Physical theft"],
    ans: 2,
  },
  {
    q: "According to current NIST guidance, what matters most for password strength?",
    opts: ["Special characters", "Frequent rotation", "Length and uniqueness", "Capital letters"],
    ans: 2,
  },
  {
    q: "Your phone keeps getting MFA push prompts at 2 AM that you didn't trigger. What do you do?",
    opts: [
      "Tap Approve so they stop",
      "Ignore them and go back to sleep",
      "Deny each one and change your password from a clean device",
      "Turn off MFA temporarily",
    ],
    ans: 2,
  },
  {
    q: "Why is verifying out-of-band important?",
    opts: [
      "It speeds up the response",
      "It bypasses an attacker who controls the channel that contacted you",
      "It logs the interaction",
      "It encrypts the conversation",
    ],
    ans: 1,
  },
];

const NETWORK_QUIZ: QuizQuestion[] = [
  {
    q: "What is the role of DNS?",
    opts: [
      "Encrypts traffic between two endpoints",
      "Translates domain names into IP addresses",
      "Filters malicious packets",
      "Stores user passwords",
    ],
    ans: 1,
  },
  {
    q: "What does the 'S' in HTTPS add?",
    opts: ["Speed", "Storage", "Security via TLS encryption", "A subdomain"],
    ans: 2,
  },
  {
    q: "On an open public WiFi network, which traffic is most at risk?",
    opts: [
      "HTTPS-encrypted traffic",
      "Traffic from a connected VPN",
      "Plain HTTP traffic that another device on the network can see",
      "Traffic going over cellular data",
    ],
    ans: 2,
  },
  {
    q: "Which device decides which traffic is allowed to pass based on a set of rules?",
    opts: ["Firewall", "DNS server", "Switch", "Modem"],
    ans: 0,
  },
];

const THREAT_QUIZ: QuizQuestion[] = [
  {
    q: "Which login pattern is the strongest indicator of compromise?",
    opts: [
      "A user typing their password wrong once and then succeeding",
      "Many failed login attempts followed by a successful one",
      "A single successful login during business hours",
      "A logout shortly after login",
    ],
    ans: 1,
  },
  {
    q: "What does 'impossible travel' mean in threat detection?",
    opts: [
      "A flight cancellation",
      "Two logins from one user in locations too far apart in too little time",
      "An employee who works remotely",
      "A VPN session",
    ],
    ans: 1,
  },
  {
    q: "What is the most valuable part of a post-incident report?",
    opts: [
      "A detailed timeline only",
      "A list of every command run",
      "Root cause and a recommendation that prevents the next one",
      "Quotes from affected users",
    ],
    ans: 2,
  },
  {
    q: "Which NIST framework guides incident response?",
    opts: ["SP 800-53", "SP 800-61", "SP 800-171", "SP 800-207"],
    ans: 1,
  },
];

const CAREER_QUIZ: QuizQuestion[] = [
  {
    q: "Which is NOT one of the five major cyber pillars in this module?",
    opts: [
      "Security Operations",
      "Offensive Security",
      "Quantum Cryptography Research",
      "Governance, Risk, and Compliance",
    ],
    ans: 2,
  },
  {
    q: "Why is the 'experience paradox' a real problem in cyber hiring?",
    opts: [
      "Entry-level postings often require 1-2 years of experience already",
      "There are no entry-level jobs",
      "Certifications are not respected",
      "Salaries are too low",
    ],
    ans: 0,
  },
  {
    q: "Which certification is generally the most accessible first step?",
    opts: ["CISSP", "ISC2 Certified in Cybersecurity (CC)", "OSCP", "CCIE"],
    ans: 1,
  },
  {
    q: "Which is a real path into cyber for someone without a CS degree?",
    opts: [
      "IT help desk → SOC analyst",
      "Military intelligence → contractor",
      "Self-taught + portfolio of CTF write-ups",
      "All of the above",
    ],
    ans: 3,
  },
];

const NETACAD_QUIZ: QuizQuestion[] = [
  {
    q: "Cisco Networking Academy coursework is…",
    opts: [
      "Paid subscription required",
      "Free and self-paced",
      "Only for college students",
      "Only available in the U.S.",
    ],
    ans: 1,
  },
  {
    q: "Which is a sensible first course for someone new to cyber?",
    opts: [
      "CCIE Security",
      "Introduction to Cybersecurity",
      "Advanced Penetration Testing",
      "Cloud Security Architect path",
    ],
    ans: 1,
  },
  {
    q: "What's the most reliable way to make progress on a multi-week course?",
    opts: [
      "A specific recurring schedule each week",
      "Cramming one Saturday a month",
      "Studying only when motivated",
      "Skipping the labs",
    ],
    ans: 0,
  },
  {
    q: "Why share your study plan with someone else?",
    opts: [
      "It's required by Cisco",
      "Accountability makes follow-through measurably more likely",
      "It earns extra credit",
      "It saves bandwidth",
    ],
    ans: 1,
  },
];

// Capstone skips the quiz — its homework submission IS the assessment.

const QUIZ_BY_SLUG: Record<string, QuizQuestion[]> = {
  "cyber-foundations": FOUNDATIONS_QUIZ,
  "digital-safety-sim": SAFETY_QUIZ,
  "network-basics": NETWORK_QUIZ,
  "threat-detective": THREAT_QUIZ,
  "career-map": CAREER_QUIZ,
  "cisco-netacad-link": NETACAD_QUIZ,
};

// ── Module exports — each is a thin wrapper around ModuleStructure ─────────

function moduleFor(slug: string, props: ModuleProps) {
  const content = CYBER_LAUNCH_CONTENT[slug];
  if (!content) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Unknown module: {slug}</p>
      </div>
    );
  }
  const quiz = QUIZ_BY_SLUG[slug] ?? [];
  return (
    <ModuleStructure
      content={content}
      onBack={props.onBack}
      onComplete={props.onComplete}
      renderQuiz={({ onQuizComplete }) => (
        <StandaloneQuiz questions={quiz} onComplete={onQuizComplete} />
      )}
    />
  );
}

export function CyberFoundations(props: ModuleProps) {
  // Module 1's quiz prompts can be localized via i18n keys defined in
  // src/locales/*/pathways.json under pathways.modules.foundations.quiz.
  // If present, use them; otherwise fall back to the English bank above.
  const { t } = useTranslation();
  const localized = useMemo(() => {
    const items = t("pathways.modules.foundations.quiz", { returnObjects: true });
    if (!Array.isArray(items)) return null;
    // Only accept if shape matches.
    const ok = items.every(
      (it) => it && typeof it === "object" && typeof it.q === "string" && Array.isArray(it.opts),
    );
    if (!ok) return null;
    return items.map((it, i) => ({
      q: it.q,
      opts: it.opts,
      ans: FOUNDATIONS_QUIZ[i]?.ans ?? 0,
    })) as QuizQuestion[];
  }, [t]);

  const content = CYBER_LAUNCH_CONTENT["cyber-foundations"];
  const quiz = localized ?? FOUNDATIONS_QUIZ;
  return (
    <ModuleStructure
      content={content}
      onBack={props.onBack}
      onComplete={props.onComplete}
      renderQuiz={({ onQuizComplete }) => (
        <StandaloneQuiz questions={quiz} onComplete={onQuizComplete} />
      )}
    />
  );
}

export function DigitalSafetySim(props: ModuleProps) {
  // Digital Safety also hosts the two sandbox labs (Password Strength Lab and
  // Phishing Showdown). The labs are available from a header launcher in the
  // module shell; opening a lab swaps the module body until the student exits.
  const [activeLab, setActiveLab] = useState<null | "password" | "phishing">(null);

  if (activeLab === "password") {
    return <PasswordStrengthLab onExit={() => setActiveLab(null)} />;
  }
  if (activeLab === "phishing") {
    return <PhishingShowdown onExit={() => setActiveLab(null)} />;
  }

  const content = CYBER_LAUNCH_CONTENT["digital-safety-sim"];
  return (
    <div className="space-y-4">
      <DigitalSafetyLabLauncher onOpen={setActiveLab} />
      <ModuleStructure
        content={content}
        onBack={props.onBack}
        onComplete={props.onComplete}
        renderQuiz={({ onQuizComplete }) => (
          <StandaloneQuiz
            questions={QUIZ_BY_SLUG["digital-safety-sim"]}
            onComplete={onQuizComplete}
          />
        )}
      />
    </div>
  );
}

function DigitalSafetyLabLauncher({
  onOpen,
}: {
  onOpen: (lab: "password" | "phishing") => void;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-800/30 dark:bg-amber-950/20 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Beaker className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Sandbox Labs</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Hands-on practice. Try once or replay anytime — your best result is saved.
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <button
          onClick={() => onOpen("password")}
          className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 active:scale-[0.99] transition-all text-left"
        >
          <span className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Password Strength Lab
            </span>
            <span className="block text-[11px] text-slate-600 dark:text-slate-400">
              ~8 min · Build your password policy
            </span>
          </span>
        </button>
        <button
          onClick={() => onOpen("phishing")}
          className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 active:scale-[0.99] transition-all text-left"
        >
          <span className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-600/30 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
              Phishing Showdown
            </span>
            <span className="block text-[11px] text-slate-600 dark:text-slate-400">
              ~12 min · 3 modes · Earn your Red Flag Field Guide
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

export function NetworkBasics(props: ModuleProps) {
  return moduleFor("network-basics", props);
}

export function ThreatDetective(props: ModuleProps) {
  return moduleFor("threat-detective", props);
}

export function CyberCareerMap(props: ModuleProps) {
  return moduleFor("career-map", props);
}

export function CiscoNetacadLink(props: ModuleProps) {
  return moduleFor("cisco-netacad-link", props);
}

export function CyberCapstone(props: ModuleProps) {
  // Capstone: skipQuiz=true in its content; ModuleStructure will not render
  // the quiz section. Pass a no-op renderQuiz that won't actually be called.
  return moduleFor("capstone-security-plan", props);
}

// ── Router ─────────────────────────────────────────────────────────────────

const MODULE_MAP: Record<string, React.FC<ModuleProps>> = {
  "cyber-foundations": CyberFoundations,
  "digital-safety-sim": DigitalSafetySim,
  "network-basics": NetworkBasics,
  "threat-detective": ThreatDetective,
  "career-map": CyberCareerMap,
  "cisco-netacad-link": CiscoNetacadLink,
  "capstone-security-plan": CyberCapstone,
};

export default function CyberLaunchModuleRouter({
  moduleSlug,
  onComplete,
  onBack,
}: {
  moduleSlug: string;
  onComplete: (score: number) => void;
  onBack: () => void;
}) {
  const Component = MODULE_MAP[moduleSlug];
  if (!Component) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Unknown module: {moduleSlug}</p>
      </div>
    );
  }
  return <Component onComplete={onComplete} onBack={onBack} />;
}
