/**
 * Cyber Launch Track — BrightBoost Pathways
 *
 * 7 self-contained modules for teens (14-17).
 * Each exports a named component accepting { onComplete, onBack }.
 * Dark, clean, modern UI — indigo/teal/slate palette.
 */
import { useState } from "react";

// ── Shared types & helpers ────────────────────────────────────────────────

interface ModuleProps {
  onComplete: (score: number) => void;
  onBack: () => void;
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="w-full bg-slate-700 rounded h-1.5">
      <div
        className="bg-indigo-500 h-1.5 rounded transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ModuleShell({
  title,
  step,
  totalSteps,
  onBack,
  children,
}: {
  title: string;
  step: number;
  totalSteps: number;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            &larr; Back
          </button>
          <span className="text-xs text-slate-500">
            {step}/{totalSteps}
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        <ProgressBar current={step} total={totalSteps} />
        {children}
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
  onClick,
  selected,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}) {
  const base =
    "border rounded-lg p-4 transition-all duration-200 " +
    (selected
      ? "border-indigo-500 bg-indigo-900/40 shadow-lg shadow-indigo-500/10"
      : "border-slate-700 bg-slate-800 shadow-lg");
  const interactive = onClick
    ? " cursor-pointer hover:border-indigo-400 hover:bg-slate-750 active:scale-[0.98]"
    : "";
  return (
    <div className={`${base}${interactive} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {children}
    </button>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// MODULE 1 — CyberFoundations (Lesson)
// ═══════════════════════════════════════════════════════════════════════════

const CYBER_SLIDES = [
  {
    title: "What is Cybersecurity?",
    body: "Cybersecurity is the practice of protecting systems, networks, and data from digital attacks. Every device connected to the internet is a potential target — and defending them is a growing global priority.",
  },
  {
    title: "Why It Matters",
    body: "Data breaches cost businesses an average of $4.45 million per incident. Personal data — passwords, financial info, medical records — is constantly at risk. Critical infrastructure like power grids and hospitals depends on strong cyber defense.",
  },
  {
    title: "Real Breaches",
    body: "In 2017, a single breach exposed the personal data of 147 million people — names, Social Security numbers, birth dates. In 2020, a ransomware attack shut down a major hospital network, diverting emergency patients and delaying care for days.",
  },
  {
    title: "Who Works in Cyber?",
    roles: [
      { name: "Security Analyst", desc: "Monitors networks for threats and investigates alerts", pay: "$75K–$110K" },
      { name: "Penetration Tester", desc: "Legally hacks systems to find vulnerabilities before attackers do", pay: "$85K–$130K" },
      { name: "Incident Responder", desc: "Investigates breaches and leads the recovery effort", pay: "$70K–$105K" },
      { name: "Security Engineer", desc: "Designs and builds security architecture and tools", pay: "$95K–$145K" },
      { name: "GRC Analyst", desc: "Manages governance, risk, and compliance frameworks", pay: "$65K–$100K" },
      { name: "CISO", desc: "Chief Information Security Officer — leads the entire security program", pay: "$150K–$250K" },
    ],
  },
  {
    title: "The Opportunity",
    body: "There are nearly 470,000 unfilled cybersecurity jobs in the U.S. alone. The field is growing 33% faster than average — and it rewards curiosity, problem-solving, and persistence over any single degree or background.",
  },
];

const CYBER_QUIZ = [
  {
    q: "What does cybersecurity protect?",
    opts: ["Only passwords", "Systems, networks, and data", "Just websites", "Hardware only"],
    ans: 1,
  },
  {
    q: "Why is demand for cyber workers growing?",
    opts: [
      "Companies are reducing tech budgets",
      "Attacks are decreasing",
      "Digital threats are increasing and there aren't enough defenders",
      "Cybersecurity is being automated away",
    ],
    ans: 2,
  },
  {
    q: "Which role investigates breaches?",
    opts: ["GRC Analyst", "CISO", "Incident Responder", "Penetration Tester"],
    ans: 2,
  },
];

export function CyberFoundations({ onComplete, onBack }: ModuleProps) {
  const [step, setStep] = useState(0);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const totalSlides = CYBER_SLIDES.length;
  const inQuiz = step >= totalSlides;
  const totalSteps = totalSlides + CYBER_QUIZ.length;

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === CYBER_QUIZ[quizIdx].ans) {
      setQuizScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (!inQuiz) {
      setStep((s) => s + 1);
    } else if (quizIdx < CYBER_QUIZ.length - 1) {
      setQuizIdx((q) => q + 1);
      setSelected(null);
      setAnswered(false);
      setStep((s) => s + 1);
    } else {
      const score = Math.round((quizScore / CYBER_QUIZ.length) * 100);
      onComplete(score);
    }
  };

  const currentStep = step + 1;
  const slide = !inQuiz ? CYBER_SLIDES[step] : null;
  const quiz = inQuiz ? CYBER_QUIZ[quizIdx] : null;

  return (
    <ModuleShell title="Cyber Foundations" step={currentStep} totalSteps={totalSteps} onBack={onBack}>
      {slide && !("roles" in slide && slide.roles) && (
        <Card className="mt-4 space-y-3">
          <h2 className="text-lg font-semibold text-indigo-300">{slide.title}</h2>
          <p className="text-sm text-slate-300 leading-relaxed">{slide.body}</p>
        </Card>
      )}

      {slide && "roles" in slide && slide.roles && (
        <div className="mt-4 space-y-3">
          <h2 className="text-lg font-semibold text-indigo-300">{slide.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {slide.roles.map((r) => (
              <Card key={r.name} className="space-y-1">
                <p className="text-sm font-semibold text-white">{r.name}</p>
                <p className="text-xs text-slate-400">{r.desc}</p>
                <p className="text-xs text-teal-400 font-medium">{r.pay}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {quiz && (
        <div className="mt-4 space-y-4">
          <Card className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Knowledge Check</p>
            <p className="text-sm font-medium text-white">{quiz.q}</p>
          </Card>
          <div className="space-y-2">
            {quiz.opts.map((opt, i) => {
              let border = "border-slate-700";
              if (answered && i === quiz.ans) border = "border-teal-500";
              else if (answered && i === selected && i !== quiz.ans) border = "border-red-500";
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                  className={`w-full text-left p-3 rounded-lg border ${border} bg-slate-800 text-sm text-slate-300 hover:border-indigo-400 disabled:hover:border-slate-700 transition-colors ${
                    selected === i ? "ring-1 ring-indigo-500" : ""
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {answered && (
            <p className="text-xs text-slate-400">
              {selected === quiz.ans ? "Correct." : `Incorrect. The answer is: ${quiz.opts[quiz.ans]}`}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end mt-6">
        {!inQuiz && (
          <PrimaryButton onClick={handleNext}>
            {step < totalSlides - 1 ? "Next" : "Start Quiz"}
          </PrimaryButton>
        )}
        {inQuiz && answered && (
          <PrimaryButton onClick={handleNext}>
            {quizIdx < CYBER_QUIZ.length - 1 ? "Next Question" : "Finish"}
          </PrimaryButton>
        )}
      </div>
    </ModuleShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 2 — DigitalSafetySim (Activity)
// ═══════════════════════════════════════════════════════════════════════════

interface Email {
  from: string;
  subject: string;
  body: string;
  isPhish: boolean;
  flags?: string[];
}

const PHISH_EMAILS: Email[] = [
  {
    from: "support@amaz0n-security.net",
    subject: "URGENT: Your account will be suspended!",
    body: "Dear Customer, We detected unusual activity. Click here immediately to verify your identity or your account will be permanently locked within 24 hours.",
    isPhish: true,
    flags: ["Sender domain mismatch (amaz0n-security.net)", "Urgency/pressure tactics", "Suspicious link request"],
  },
  {
    from: "noreply@school.edu",
    subject: "Schedule change for next week",
    body: "Hi, your Tuesday class has been moved to Room 204. Please check the updated schedule on the school portal.",
    isPhish: false,
  },
  {
    from: "hr@your-company.com",
    subject: "Updated PTO policy",
    body: "Team, we've updated our PTO policy for the new year. Please review the attached document on the HR portal at your convenience.",
    isPhish: false,
  },
];

const PASSWORDS = [
  { pw: "password123", correct: "weak" },
  { pw: "Tr0ub4dor&3", correct: "strong" },
  { pw: "qwerty", correct: "weak" },
  { pw: "k9$Lm#vR2xQ!", correct: "strong" },
];

const WIFI_ACTIONS = [
  { action: "Online banking", safe: false },
  { action: "Browsing news", safe: true },
  { action: "Using a VPN", safe: true },
  { action: "Logging into email without VPN", safe: false },
];

const BREACH_STEPS = [
  "Change your password immediately",
  "Enable two-factor authentication",
  "Check if other accounts use the same password",
  "Monitor accounts for suspicious activity",
];

export function DigitalSafetySim({ onComplete, onBack }: ModuleProps) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);

  // Scenario 1: Phishing
  const [phishSelected, setPhishSelected] = useState<number | null>(null);
  const [phishSubmitted, setPhishSubmitted] = useState(false);
  const [flagsFound, setFlagsFound] = useState<Set<number>>(new Set());

  // Scenario 2: Passwords
  const [pwRatings, setPwRatings] = useState<Record<number, string>>({});
  const [pwSubmitted, setPwSubmitted] = useState(false);

  // Scenario 3: Social engineering
  const [seChoice, setSeChoice] = useState<string | null>(null);

  // Scenario 4: Wi-Fi
  const [wifiRatings, setWifiRatings] = useState<Record<number, boolean>>({});
  const [wifiSubmitted, setWifiSubmitted] = useState(false);

  // Scenario 5: Breach response
  const [breachOrder, setBreachOrder] = useState<number[]>([]);
  const [breachSubmitted, setBreachSubmitted] = useState(false);

  const totalSteps = 5;

  const handlePhishSubmit = () => {
    setPhishSubmitted(true);
    let pts = 0;
    if (phishSelected === 0) pts += 10; // correctly identified phishing email
    pts += Math.min(flagsFound.size, 3) * 5; // up to 15 for flags
    setScore((s) => s + pts);
  };

  const handlePwSubmit = () => {
    setPwSubmitted(true);
    let pts = 0;
    PASSWORDS.forEach((p, i) => {
      const rating = pwRatings[i];
      if (
        (p.correct === "weak" && rating === "weak") ||
        (p.correct === "strong" && rating === "strong")
      ) {
        pts += 5;
      }
    });
    setScore((s) => s + pts);
  };

  const handleSeChoice = (choice: string) => {
    setSeChoice(choice);
    if (choice === "verify") {
      setScore((s) => s + 20);
    }
  };

  const handleWifiSubmit = () => {
    setWifiSubmitted(true);
    let pts = 0;
    WIFI_ACTIONS.forEach((a, i) => {
      if (wifiRatings[i] === a.safe) pts += 5;
    });
    setScore((s) => s + pts);
  };

  const handleBreachSubmit = () => {
    setBreachSubmitted(true);
    let pts = 0;
    breachOrder.forEach((val, idx) => {
      if (val === idx) pts += 5;
    });
    setScore((s) => s + pts);
  };

  const toggleBreachItem = (idx: number) => {
    if (breachSubmitted) return;
    if (breachOrder.includes(idx)) {
      setBreachOrder(breachOrder.filter((i) => i !== idx));
    } else {
      setBreachOrder([...breachOrder, idx]);
    }
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return phishSubmitted;
      case 1: return pwSubmitted;
      case 2: return seChoice !== null;
      case 3: return wifiSubmitted;
      case 4: return breachSubmitted;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete(Math.min(score, 100));
    }
  };

  return (
    <ModuleShell title="Digital Safety Sim" step={step + 1} totalSteps={totalSteps} onBack={onBack}>
      {/* Scenario 1: Phishing */}
      {step === 0 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">Identify the phishing email, then tap the red flags.</p>
          <div className="space-y-3">
            {PHISH_EMAILS.map((email, i) => (
              <Card
                key={i}
                onClick={() => !phishSubmitted && setPhishSelected(i)}
                selected={phishSelected === i}
                className="space-y-1"
              >
                <div className="flex justify-between">
                  <p className="text-xs text-slate-500">From: {email.from}</p>
                  {phishSubmitted && email.isPhish && (
                    <span className="text-xs text-red-400 font-medium">PHISHING</span>
                  )}
                </div>
                <p className="text-sm font-medium">{email.subject}</p>
                <p className="text-xs text-slate-400">{email.body}</p>
              </Card>
            ))}
          </div>

          {phishSelected === 0 && !phishSubmitted && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Tap the red flags in this email:</p>
              {PHISH_EMAILS[0].flags!.map((flag, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const next = new Set(flagsFound);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    setFlagsFound(next);
                  }}
                  className={`w-full text-left p-2 rounded-lg border text-xs transition-colors ${
                    flagsFound.has(i)
                      ? "border-red-500 bg-red-900/20 text-red-300"
                      : "border-slate-700 bg-slate-800 text-slate-400"
                  }`}
                >
                  {flag}
                </button>
              ))}
            </div>
          )}

          {!phishSubmitted && phishSelected !== null && (
            <PrimaryButton onClick={handlePhishSubmit}>Submit</PrimaryButton>
          )}
          {phishSubmitted && (
            <p className="text-xs text-teal-400">
              {phishSelected === 0 ? "Correct! You spotted the phishing email." : "Not quite — the first email was the phishing attempt."}
            </p>
          )}
        </div>
      )}

      {/* Scenario 2: Passwords */}
      {step === 1 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">Rate each password as weak or strong.</p>
          <div className="space-y-3">
            {PASSWORDS.map((p, i) => (
              <Card key={i} className="flex items-center justify-between">
                <code className="text-sm text-slate-300 font-mono">{p.pw}</code>
                <div className="flex gap-2">
                  {["weak", "strong"].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => !pwSubmitted && setPwRatings({ ...pwRatings, [i]: rating })}
                      disabled={pwSubmitted}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        pwRatings[i] === rating
                          ? rating === "weak"
                            ? "border-red-500 bg-red-900/30 text-red-300"
                            : "border-teal-500 bg-teal-900/30 text-teal-300"
                          : "border-slate-600 text-slate-500 hover:border-slate-400"
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          {!pwSubmitted && Object.keys(pwRatings).length === 4 && (
            <PrimaryButton onClick={handlePwSubmit}>Submit</PrimaryButton>
          )}
          {pwSubmitted && (
            <p className="text-xs text-teal-400">
              Strong passwords use length, mixed case, numbers, and symbols.
            </p>
          )}
        </div>
      )}

      {/* Scenario 3: Social Engineering */}
      {step === 2 && (
        <div className="space-y-4 mt-4">
          <Card className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Incoming Call</p>
            <p className="text-sm text-slate-300">
              "Hi, this is Mike from IT Support. We detected suspicious activity on your account. I need your password to reset it right now, or your account could be compromised."
            </p>
          </Card>
          <p className="text-sm text-slate-400">What do you do?</p>
          <div className="grid grid-cols-2 gap-3">
            <Card
              onClick={() => !seChoice && handleSeChoice("comply")}
              selected={seChoice === "comply"}
              className={seChoice === "comply" ? "border-red-500 bg-red-900/20" : ""}
            >
              <p className="text-sm font-medium">Give the password</p>
              <p className="text-xs text-slate-500">They said it's urgent</p>
            </Card>
            <Card
              onClick={() => !seChoice && handleSeChoice("verify")}
              selected={seChoice === "verify"}
              className={seChoice === "verify" ? "border-teal-500 bg-teal-900/20" : ""}
            >
              <p className="text-sm font-medium">Hang up and verify</p>
              <p className="text-xs text-slate-500">Call IT directly</p>
            </Card>
          </div>
          {seChoice && (
            <p className={`text-xs ${seChoice === "verify" ? "text-teal-400" : "text-red-400"}`}>
              {seChoice === "verify"
                ? "Correct. Always verify through official channels. Legitimate IT will never ask for your password."
                : "Careful — legitimate IT staff will never ask for your password over the phone. Always verify independently."}
            </p>
          )}
        </div>
      )}

      {/* Scenario 4: Public Wi-Fi */}
      {step === 3 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">You're on public Wi-Fi. Mark each action as safe or unsafe.</p>
          <div className="space-y-3">
            {WIFI_ACTIONS.map((a, i) => (
              <Card key={i} className="flex items-center justify-between">
                <p className="text-sm text-slate-300">{a.action}</p>
                <div className="flex gap-2">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      onClick={() => !wifiSubmitted && setWifiRatings({ ...wifiRatings, [i]: val })}
                      disabled={wifiSubmitted}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        wifiRatings[i] === val
                          ? val
                            ? "border-teal-500 bg-teal-900/30 text-teal-300"
                            : "border-red-500 bg-red-900/30 text-red-300"
                          : "border-slate-600 text-slate-500 hover:border-slate-400"
                      }`}
                    >
                      {val ? "Safe" : "Unsafe"}
                    </button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          {!wifiSubmitted && Object.keys(wifiRatings).length === 4 && (
            <PrimaryButton onClick={handleWifiSubmit}>Submit</PrimaryButton>
          )}
          {wifiSubmitted && (
            <p className="text-xs text-teal-400">
              On public Wi-Fi: use a VPN, avoid banking and unencrypted logins.
            </p>
          )}
        </div>
      )}

      {/* Scenario 5: Breach Response */}
      {step === 4 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">
            Your email was in a data breach. Order the response steps (tap in order):
          </p>
          <div className="space-y-2">
            {BREACH_STEPS.map((s, i) => {
              const orderIdx = breachOrder.indexOf(i);
              return (
                <button
                  key={i}
                  onClick={() => toggleBreachItem(i)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors flex items-center gap-3 ${
                    orderIdx >= 0
                      ? "border-indigo-500 bg-indigo-900/20 text-white"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                      orderIdx >= 0 ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-500"
                    }`}
                  >
                    {orderIdx >= 0 ? orderIdx + 1 : "-"}
                  </span>
                  {s}
                </button>
              );
            })}
          </div>
          {!breachSubmitted && breachOrder.length === 4 && (
            <PrimaryButton onClick={handleBreachSubmit}>Submit</PrimaryButton>
          )}
          {breachSubmitted && (
            <p className="text-xs text-teal-400">
              The ideal order: change password, enable 2FA, check other accounts, then monitor.
            </p>
          )}
        </div>
      )}

      {canAdvance() && (
        <div className="flex justify-end mt-6">
          <PrimaryButton onClick={handleNext}>
            {step < totalSteps - 1 ? "Next Scenario" : "Finish"}
          </PrimaryButton>
        </div>
      )}
    </ModuleShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 3 — NetworkBasics (Lesson)
// ═══════════════════════════════════════════════════════════════════════════

const NET_SLIDES = [
  {
    title: "What happens when you load a webpage?",
    body: "1. You type a URL. 2. Your browser asks a DNS server for the IP address. 3. Your device sends a request to that IP. 4. The server processes the request and sends back data. 5. Your browser assembles and renders the page. All of this happens in milliseconds.",
  },
  {
    title: "Packets & Protocols",
    body: "Data doesn't travel as one big file — it's broken into small packets, like letters in the mail. Each packet has a destination address, a return address, and a piece of the message. Protocols (TCP/IP) are the rules that ensure every packet arrives and gets reassembled correctly.",
  },
  {
    title: "IP, DNS, HTTP",
    body: "IP addresses are like street addresses — every device has one. DNS is the phone book that translates domain names (google.com) into IP addresses. HTTP is the language browsers and servers use to talk — HTTPS adds encryption so no one can eavesdrop.",
  },
  {
    title: "Firewalls & Security",
    body: "A firewall is the bouncer at the door. It inspects incoming and outgoing traffic and blocks anything that doesn't match the rules. Firewalls can be hardware, software, or cloud-based — and they're one of the first lines of defense in any network.",
  },
];

const TRACE_NODES = [
  { label: "Your Device", id: 0 },
  { label: "DNS Server", id: 1 },
  { label: "Web Server", id: 2 },
  { label: "Firewall", id: 3 },
  { label: "Your Device (Response)", id: 4 },
];

const NET_QUIZ = [
  {
    q: "What does DNS do?",
    opts: ["Encrypts data", "Translates domain names to IP addresses", "Blocks malware", "Compresses files"],
    ans: 1,
  },
  {
    q: "What is a packet?",
    opts: ["A type of virus", "A small piece of data sent over a network", "A firewall rule", "An email attachment"],
    ans: 1,
  },
  {
    q: "What does a firewall do?",
    opts: [
      "Speeds up your internet",
      "Stores passwords",
      "Inspects and filters network traffic",
      "Translates domain names",
    ],
    ans: 2,
  },
];

export function NetworkBasics({ onComplete, onBack }: ModuleProps) {
  const [step, setStep] = useState(0);
  const [traceClicked, setTraceClicked] = useState<number[]>([]);
  const [traceSubmitted, setTraceSubmitted] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const slideCount = NET_SLIDES.length;
  const traceStep = slideCount;
  const quizStart = traceStep + 1;
  const totalSteps = quizStart + NET_QUIZ.length;
  const currentStep = step + 1;

  const inSlides = step < slideCount;
  const inTrace = step === traceStep;
  const inQuiz = step >= quizStart;

  const handleTraceClick = (id: number) => {
    if (traceSubmitted) return;
    if (traceClicked.includes(id)) {
      setTraceClicked(traceClicked.filter((x) => x !== id));
    } else {
      setTraceClicked([...traceClicked, id]);
    }
  };

  const handleTraceSubmit = () => {
    setTraceSubmitted(true);
    // Correct order: 0,1,2,3,4
    let pts = 0;
    traceClicked.forEach((id, idx) => {
      if (id === idx) pts++;
    });
    if (pts === 5) setQuizScore((s) => s + 1); // bonus point
  };

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === NET_QUIZ[quizIdx].ans) setQuizScore((s) => s + 1);
  };

  const handleNext = () => {
    if (inSlides || (inTrace && traceSubmitted)) {
      setStep((s) => s + 1);
      if (step + 1 === quizStart) {
        setSelected(null);
        setAnswered(false);
      }
    } else if (inQuiz && answered) {
      if (quizIdx < NET_QUIZ.length - 1) {
        setQuizIdx((q) => q + 1);
        setSelected(null);
        setAnswered(false);
        setStep((s) => s + 1);
      } else {
        // total possible: 1 (trace) + 3 (quiz) = 4
        const score = Math.round((quizScore / 4) * 100);
        onComplete(score);
      }
    }
  };

  const canNext =
    (inSlides) ||
    (inTrace && traceSubmitted) ||
    (inQuiz && answered);

  return (
    <ModuleShell title="Network Basics" step={currentStep} totalSteps={totalSteps} onBack={onBack}>
      {inSlides && (
        <Card className="mt-4 space-y-3">
          <h2 className="text-lg font-semibold text-indigo-300">{NET_SLIDES[step].title}</h2>
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{NET_SLIDES[step].body}</p>
        </Card>
      )}

      {inTrace && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-400">
            Trace the packet: click the network nodes in the correct order.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {/* Shuffle display order */}
            {[3, 0, 4, 1, 2].map((id) => {
              const node = TRACE_NODES[id];
              const orderIdx = traceClicked.indexOf(id);
              let borderColor = "border-slate-700";
              if (traceSubmitted) {
                const correctPos = traceClicked.indexOf(id);
                borderColor = correctPos === id ? "border-teal-500" : "border-red-500";
                if (orderIdx < 0) borderColor = "border-red-500";
              }
              return (
                <button
                  key={id}
                  onClick={() => handleTraceClick(id)}
                  className={`px-4 py-3 rounded-lg border ${borderColor} bg-slate-800 text-sm transition-colors hover:border-indigo-400 flex items-center gap-2`}
                >
                  {orderIdx >= 0 && (
                    <span className="w-5 h-5 rounded bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                      {orderIdx + 1}
                    </span>
                  )}
                  {node.label}
                </button>
              );
            })}
          </div>
          {!traceSubmitted && traceClicked.length === 5 && (
            <PrimaryButton onClick={handleTraceSubmit}>Check Order</PrimaryButton>
          )}
          {traceSubmitted && (
            <p className="text-xs text-teal-400">
              Correct path: Your Device &rarr; DNS Server &rarr; Web Server &rarr; Firewall &rarr; Your Device (Response)
            </p>
          )}
        </div>
      )}

      {inQuiz && (
        <div className="mt-4 space-y-4">
          <Card className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Knowledge Check</p>
            <p className="text-sm font-medium text-white">{NET_QUIZ[quizIdx].q}</p>
          </Card>
          <div className="space-y-2">
            {NET_QUIZ[quizIdx].opts.map((opt, i) => {
              let border = "border-slate-700";
              if (answered && i === NET_QUIZ[quizIdx].ans) border = "border-teal-500";
              else if (answered && i === selected) border = "border-red-500";
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered}
                  className={`w-full text-left p-3 rounded-lg border ${border} bg-slate-800 text-sm text-slate-300 hover:border-indigo-400 disabled:hover:border-slate-700 transition-colors`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {answered && (
            <p className="text-xs text-slate-400">
              {selected === NET_QUIZ[quizIdx].ans ? "Correct." : `Incorrect. Answer: ${NET_QUIZ[quizIdx].opts[NET_QUIZ[quizIdx].ans]}`}
            </p>
          )}
        </div>
      )}

      {canNext && (
        <div className="flex justify-end mt-6">
          <PrimaryButton onClick={handleNext}>
            {inSlides && step < slideCount - 1
              ? "Next"
              : inSlides
                ? "Start Activity"
                : inTrace
                  ? "Continue"
                  : quizIdx < NET_QUIZ.length - 1
                    ? "Next Question"
                    : "Finish"}
          </PrimaryButton>
        </div>
      )}
    </ModuleShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 4 — ThreatDetective (Activity)
// ═══════════════════════════════════════════════════════════════════════════

interface LogEntry {
  time: string;
  ip: string;
  action: string;
  suspicious: boolean;
}

const LOG_ENTRIES: LogEntry[] = [
  { time: "02:14:33", ip: "192.168.1.10", action: "User login — admin portal", suspicious: false },
  { time: "02:14:35", ip: "10.0.0.45", action: "Failed login attempt (1 of 500)", suspicious: true },
  { time: "02:14:36", ip: "10.0.0.45", action: "Failed login attempt (2 of 500)", suspicious: true },
  { time: "02:15:01", ip: "192.168.1.22", action: "File download — Q4_report.pdf", suspicious: false },
  { time: "02:15:12", ip: "10.0.0.45", action: "Successful login after 500 attempts", suspicious: true },
  { time: "02:16:00", ip: "192.168.1.10", action: "User logout — admin portal", suspicious: false },
];

const LOG_QUESTIONS = [
  {
    q: "What time did the attack begin?",
    opts: ["02:14:33", "02:14:35", "02:15:01", "02:16:00"],
    ans: 1,
  },
  {
    q: "Which IP address is the attacker?",
    opts: ["192.168.1.10", "192.168.1.22", "10.0.0.45", "127.0.0.1"],
    ans: 2,
  },
  {
    q: "What type of attack is this?",
    opts: ["Phishing", "DDoS", "Brute force", "Insider threat"],
    ans: 2,
  },
];

const SEVERITY_OPTS = ["Low", "Medium", "High", "Critical"];
const TYPE_OPTS = ["Phishing", "Brute Force", "DDoS", "Insider Threat", "Malware"];
const ACTION_OPTS = ["Monitor only", "Block IP and reset passwords", "Shut down server", "Notify law enforcement"];

export function ThreatDetective({ onComplete, onBack }: ModuleProps) {
  const [phase, setPhase] = useState(0); // 0=logs, 1=questions, 2=report
  const [selectedLogs, setSelectedLogs] = useState<Set<number>>(new Set());
  const [logsSubmitted, setLogsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const [qIdx, setQIdx] = useState(0);
  const [qSelected, setQSelected] = useState<number | null>(null);
  const [qAnswered, setQAnswered] = useState(false);

  const [severity, setSeverity] = useState("");
  const [attackType, setAttackType] = useState("");
  const [recAction, setRecAction] = useState("");
  const [summary, setSummary] = useState("");

  const totalSteps = 3;

  const toggleLog = (idx: number) => {
    if (logsSubmitted) return;
    const next = new Set(selectedLogs);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedLogs(next);
  };

  const submitLogs = () => {
    setLogsSubmitted(true);
    let pts = 0;
    LOG_ENTRIES.forEach((entry, i) => {
      if (entry.suspicious && selectedLogs.has(i)) pts += 10;
      if (!entry.suspicious && selectedLogs.has(i)) pts -= 5;
    });
    setScore((s) => s + Math.max(0, pts));
  };

  const handleAnswer = (idx: number) => {
    if (qAnswered) return;
    setQSelected(idx);
    setQAnswered(true);
    if (idx === LOG_QUESTIONS[qIdx].ans) setScore((s) => s + 10);
  };

  const submitReport = () => {
    let pts = 0;
    if (severity === "High" || severity === "Critical") pts += 5;
    if (attackType === "Brute Force") pts += 10;
    if (recAction === "Block IP and reset passwords") pts += 10;
    if (summary.trim().length >= 20) pts += 5;
    setScore((s) => s + pts);
    onComplete(Math.min(score + pts, 100));
  };

  const nextQuestion = () => {
    if (qIdx < LOG_QUESTIONS.length - 1) {
      setQIdx((q) => q + 1);
      setQSelected(null);
      setQAnswered(false);
    } else {
      setPhase(2);
    }
  };

  return (
    <ModuleShell title="Threat Detective" step={phase + 1} totalSteps={totalSteps} onBack={onBack}>
      {/* Phase 1: Log Analysis */}
      {phase === 0 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">Review the server logs. Select the suspicious entries.</p>
          <div className="space-y-2">
            {LOG_ENTRIES.map((entry, i) => (
              <button
                key={i}
                onClick={() => toggleLog(i)}
                className={`w-full text-left p-3 rounded-lg border text-xs font-mono transition-colors ${
                  selectedLogs.has(i)
                    ? "border-red-500 bg-red-900/20 text-red-300"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                }`}
              >
                <span className="text-slate-500">[{entry.time}]</span>{" "}
                <span className="text-slate-500">{entry.ip}</span>{" "}
                {entry.action}
                {logsSubmitted && entry.suspicious && (
                  <span className="ml-2 text-red-400">SUSPICIOUS</span>
                )}
              </button>
            ))}
          </div>
          {!logsSubmitted && (
            <PrimaryButton onClick={submitLogs}>Submit Selections</PrimaryButton>
          )}
          {logsSubmitted && (
            <div className="flex justify-end">
              <PrimaryButton onClick={() => setPhase(1)}>Analyze</PrimaryButton>
            </div>
          )}
        </div>
      )}

      {/* Phase 2: Questions */}
      {phase === 1 && (
        <div className="space-y-4 mt-4">
          <Card className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Question {qIdx + 1} of {LOG_QUESTIONS.length}
            </p>
            <p className="text-sm font-medium text-white">{LOG_QUESTIONS[qIdx].q}</p>
          </Card>
          <div className="space-y-2">
            {LOG_QUESTIONS[qIdx].opts.map((opt, i) => {
              let border = "border-slate-700";
              if (qAnswered && i === LOG_QUESTIONS[qIdx].ans) border = "border-teal-500";
              else if (qAnswered && i === qSelected) border = "border-red-500";
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={qAnswered}
                  className={`w-full text-left p-3 rounded-lg border ${border} bg-slate-800 text-sm text-slate-300 hover:border-indigo-400 disabled:hover:border-slate-700 transition-colors`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {qAnswered && (
            <div className="flex justify-end">
              <PrimaryButton onClick={nextQuestion}>
                {qIdx < LOG_QUESTIONS.length - 1 ? "Next Question" : "Write Report"}
              </PrimaryButton>
            </div>
          )}
        </div>
      )}

      {/* Phase 3: Incident Report */}
      {phase === 2 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">Complete the incident report.</p>
          <Card className="space-y-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white"
              >
                <option value="">Select...</option>
                {SEVERITY_OPTS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Attack Type</label>
              <select
                value={attackType}
                onChange={(e) => setAttackType(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white"
              >
                <option value="">Select...</option>
                {TYPE_OPTS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Recommended Action</label>
              <select
                value={recAction}
                onChange={(e) => setRecAction(e.target.value)}
                className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white"
              >
                <option value="">Select...</option>
                {ACTION_OPTS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 block mb-1">Brief Summary</label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Describe the incident in 1-2 sentences..."
                className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white resize-none h-20"
              />
            </div>
          </Card>
          <div className="flex justify-end">
            <PrimaryButton
              onClick={submitReport}
              disabled={!severity || !attackType || !recAction || summary.trim().length < 10}
            >
              Submit Report
            </PrimaryButton>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 5 — CyberCareerMap (Activity)
// ═══════════════════════════════════════════════════════════════════════════

interface CareerCard {
  role: string;
  what: string;
  salary: string;
  education: string;
  tags: string[];
}

const CAREERS: CareerCard[] = [
  {
    role: "Security Analyst",
    what: "Monitors networks for threats and responds to security alerts. Acts as the frontline defense for an organization.",
    salary: "$75K–$110K",
    education: "Bachelor's in CS/Cybersecurity, or Security+ cert + experience",
    tags: ["Detail-oriented", "Analytical", "Calm under pressure"],
  },
  {
    role: "Penetration Tester",
    what: "Legally hacks into systems to find vulnerabilities before real attackers do. Writes reports explaining what they found and how to fix it.",
    salary: "$85K–$130K",
    education: "CEH or OSCP cert, CS degree helpful but not required",
    tags: ["Creative thinker", "Persistent", "Curious"],
  },
  {
    role: "Incident Responder",
    what: "Investigates security breaches and leads the recovery effort. Works under pressure to contain damage and restore systems.",
    salary: "$70K–$105K",
    education: "GCIH cert, experience in SOC or IT operations",
    tags: ["Cool-headed", "Fast learner", "Team player"],
  },
  {
    role: "Security Engineer",
    what: "Designs and builds security systems, tools, and architecture. Automates defenses and hardens infrastructure.",
    salary: "$95K–$145K",
    education: "CS degree + cloud/security certs (AWS, CISSP)",
    tags: ["Builder", "Systems thinker", "Technical depth"],
  },
  {
    role: "GRC Analyst",
    what: "Manages governance, risk, and compliance. Ensures the organization meets legal and regulatory security standards.",
    salary: "$65K–$100K",
    education: "Business or IT degree, CISA or CRISC cert",
    tags: ["Organized", "Policy-minded", "Strong communicator"],
  },
  {
    role: "CISO",
    what: "Chief Information Security Officer. Leads the entire security program, sets strategy, and reports to the board.",
    salary: "$150K–$250K",
    education: "10+ years experience, CISSP, MBA helpful",
    tags: ["Leadership", "Strategic", "Business-savvy"],
  },
];

export function CyberCareerMap({ onComplete, onBack }: ModuleProps) {
  const [starred, setStarred] = useState<Set<number>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  const toggleStar = (idx: number) => {
    const next = new Set(starred);
    if (next.has(idx)) {
      next.delete(idx);
    } else if (next.size < 3) {
      next.add(idx);
    }
    setStarred(next);
  };

  const nextSteps: Record<string, string[]> = {
    "Security Analyst": ["CompTIA Security+ certification", "SOC analyst internship", "Home lab practice"],
    "Penetration Tester": ["TryHackMe / HackTheBox practice", "CEH or OSCP certification", "Bug bounty programs"],
    "Incident Responder": ["SANS GCIH certification", "Volunteer for IT help desk", "Incident response simulations"],
    "Security Engineer": ["AWS/Azure cloud certifications", "Learn Python scripting", "Open source security projects"],
    "GRC Analyst": ["ISACA CISA certification", "Study compliance frameworks (NIST, ISO)", "Business writing courses"],
    "CISO": ["Build broad security experience first", "MBA or security management degree", "Leadership and communication training"],
  };

  if (showSummary) {
    const picks = Array.from(starred).map((i) => CAREERS[i]);
    return (
      <ModuleShell title="Cyber Career Map" step={2} totalSteps={2} onBack={() => setShowSummary(false)}>
        <div className="space-y-6 mt-4">
          <div>
            <h2 className="text-lg font-semibold text-indigo-300 mb-3">Your Top Interests</h2>
            <div className="space-y-3">
              {picks.map((career) => (
                <Card key={career.role} className="space-y-2">
                  <p className="text-sm font-semibold text-white">{career.role}</p>
                  <p className="text-xs text-teal-400">{career.salary}</p>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Next Steps:</p>
                    <ul className="space-y-1">
                      {nextSteps[career.role]?.map((step) => (
                        <li key={step} className="text-xs text-slate-400 flex items-start gap-2">
                          <span className="text-indigo-400 mt-0.5">-</span> {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <PrimaryButton onClick={() => onComplete(100)}>
              Confirm and Complete
            </PrimaryButton>
          </div>
        </div>
      </ModuleShell>
    );
  }

  return (
    <ModuleShell title="Cyber Career Map" step={1} totalSteps={2} onBack={onBack}>
      <div className="space-y-4 mt-4">
        <p className="text-sm text-slate-400">
          Explore the roles below. Star 1-3 that interest you most.
          <span className="text-indigo-400 ml-1">{starred.size}/3 selected</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAREERS.map((career, i) => (
            <Card
              key={career.role}
              onClick={() => toggleStar(i)}
              selected={starred.has(i)}
              className="space-y-2"
            >
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-white">{career.role}</p>
                <span className={`text-lg ${starred.has(i) ? "text-yellow-400" : "text-slate-600"}`}>
                  {starred.has(i) ? "\u2605" : "\u2606"}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{career.what}</p>
              <p className="text-xs text-teal-400 font-medium">{career.salary}</p>
              <p className="text-xs text-slate-500">{career.education}</p>
              <div className="flex flex-wrap gap-1">
                {career.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] rounded bg-slate-700 text-slate-400 border border-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <div className="flex justify-end">
          <PrimaryButton onClick={() => setShowSummary(true)} disabled={starred.size === 0}>
            View Summary
          </PrimaryButton>
        </div>
      </div>
    </ModuleShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 6 — CiscoNetacadLink (External)
// ═══════════════════════════════════════════════════════════════════════════

export function CiscoNetacadLink({ onComplete, onBack }: ModuleProps) {
  const [clicked, setClicked] = useState(false);

  const handleOpen = () => {
    window.open("https://www.netacad.com/", "_blank", "noopener,noreferrer");
    setClicked(true);
    onComplete(100);
  };

  return (
    <ModuleShell title="Cisco NetAcad" step={1} totalSteps={1} onBack={onBack}>
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full text-center space-y-4 p-6">
          {/* Cisco logo placeholder */}
          <div className="w-16 h-16 mx-auto rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-teal-400">C</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Cisco Networking Academy</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Cisco NetAcad offers free, industry-recognized courses in networking, cybersecurity, and IT fundamentals. Build skills that employers actively look for.
          </p>
          <div className="space-y-2">
            <button
              onClick={handleOpen}
              className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Open Cisco NetAcad
            </button>
            {clicked && (
              <p className="text-xs text-teal-400">
                Link opened. Module complete.
              </p>
            )}
          </div>
        </Card>
      </div>
    </ModuleShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE 7 — CyberCapstone (Project)
// ═══════════════════════════════════════════════════════════════════════════

interface Business {
  name: string;
  desc: string;
  icon: string;
}

const BUSINESSES: Business[] = [
  { name: "Barbershop", desc: "Local shop with appointment software, payment terminal, and customer database.", icon: "B" },
  { name: "Food Truck", desc: "Mobile business with POS system, social media, and delivery app integration.", icon: "F" },
  { name: "Community Center", desc: "Non-profit with member database, event registration, and public Wi-Fi.", icon: "C" },
];

const RISKS = [
  "Data theft",
  "Ransomware",
  "Weak passwords",
  "Phishing attacks",
  "Unsecured Wi-Fi",
  "No data backups",
];

const PROTECTIONS = [
  "Encryption",
  "Security awareness training",
  "Firewalls",
  "Multi-factor authentication",
  "VPN",
  "Automated backups",
];

// Correct risk-protection pairings
const RISK_PROTECTION_MAP: Record<string, string> = {
  "Data theft": "Encryption",
  "Ransomware": "Automated backups",
  "Weak passwords": "Multi-factor authentication",
  "Phishing attacks": "Security awareness training",
  "Unsecured Wi-Fi": "VPN",
  "No data backups": "Automated backups",
};

export function CyberCapstone({ onComplete, onBack }: ModuleProps) {
  const [step, setStep] = useState(0);
  const totalSteps = 5;

  // Step 1: Business
  const [selectedBiz, setSelectedBiz] = useState<number | null>(null);

  // Step 2: Risks
  const [selectedRisks, setSelectedRisks] = useState<Set<number>>(new Set());

  // Step 3: Protections
  const [protections, setProtections] = useState<Record<number, string>>({});

  // Step 4: Summary
  const [summaryText, setSummaryText] = useState(
    "The biggest risk is...\nI recommend...\nThis will help because..."
  );

  const toggleRisk = (idx: number) => {
    const next = new Set(selectedRisks);
    if (next.has(idx)) {
      next.delete(idx);
      // Remove protection mapping too
      const np = { ...protections };
      delete np[idx];
      setProtections(np);
    } else if (next.size < 3) {
      next.add(idx);
    }
    setSelectedRisks(next);
  };

  const setProtection = (riskIdx: number, protection: string) => {
    setProtections({ ...protections, [riskIdx]: protection });
  };

  const calculateScore = () => {
    let pts = 0;
    const riskArr = Array.from(selectedRisks);
    riskArr.forEach((riskIdx) => {
      const riskName = RISKS[riskIdx];
      const chosen = protections[riskIdx];
      if (chosen === RISK_PROTECTION_MAP[riskName]) {
        pts += 30;
      } else {
        // Partial credit if protection is reasonable
        pts += 10;
      }
    });
    // Summary completion bonus
    const lines = summaryText.split("\n").filter((l) => l.trim().length > 20);
    if (lines.length >= 3) pts += 10;
    return Math.min(pts, 100);
  };

  const handleFinish = () => {
    onComplete(calculateScore());
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return selectedBiz !== null;
      case 1: return selectedRisks.size === 3;
      case 2: return Array.from(selectedRisks).every((r) => protections[r]);
      case 3: return summaryText.trim().length >= 40;
      case 4: return true;
      default: return false;
    }
  };

  const riskArr = Array.from(selectedRisks);
  const business = selectedBiz !== null ? BUSINESSES[selectedBiz] : null;

  return (
    <ModuleShell title="Cyber Capstone" step={step + 1} totalSteps={totalSteps} onBack={step === 0 ? onBack : () => setStep((s) => s - 1)}>
      {/* Step 1: Pick Business */}
      {step === 0 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">
            You're building a security plan. Pick a business to protect:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {BUSINESSES.map((biz, i) => (
              <Card
                key={biz.name}
                onClick={() => setSelectedBiz(i)}
                selected={selectedBiz === i}
                className="text-center space-y-2"
              >
                <div className="w-10 h-10 mx-auto rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center">
                  <span className="text-lg font-bold text-indigo-400">{biz.icon}</span>
                </div>
                <p className="text-sm font-semibold text-white">{biz.name}</p>
                <p className="text-xs text-slate-400">{biz.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Pick Risks */}
      {step === 1 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">
            Select the 3 biggest risks for {business?.name}:
            <span className="text-indigo-400 ml-1">{selectedRisks.size}/3</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {RISKS.map((risk, i) => (
              <Card
                key={risk}
                onClick={() => toggleRisk(i)}
                selected={selectedRisks.has(i)}
                className="flex items-center gap-3"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedRisks.has(i)
                      ? "border-indigo-500 bg-indigo-600"
                      : "border-slate-600 bg-transparent"
                  }`}
                >
                  {selectedRisks.has(i) && (
                    <span className="text-white text-xs font-bold">{"\u2713"}</span>
                  )}
                </div>
                <span className="text-sm text-slate-300">{risk}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Match Protections */}
      {step === 2 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">Match each risk to the best protection:</p>
          <div className="space-y-3">
            {riskArr.map((riskIdx) => (
              <Card key={riskIdx} className="space-y-2">
                <p className="text-sm font-medium text-red-400">{RISKS[riskIdx]}</p>
                <select
                  value={protections[riskIdx] || ""}
                  onChange={(e) => setProtection(riskIdx, e.target.value)}
                  className="w-full p-2 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white"
                >
                  <option value="">Select protection...</option>
                  {PROTECTIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Executive Summary */}
      {step === 3 && (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-slate-400">
            Write a 3-sentence executive summary for your security plan:
          </p>
          <Card className="space-y-2">
            <textarea
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              rows={6}
              className="w-full p-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white resize-none leading-relaxed"
            />
            <p className="text-xs text-slate-500">
              Use the sentence starters as a guide. Replace them with your analysis.
            </p>
          </Card>
        </div>
      )}

      {/* Step 5: Security Plan One-Pager */}
      {step === 4 && (
        <div className="space-y-4 mt-4">
          <Card className="space-y-5 p-6">
            <div className="border-b border-slate-700 pb-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Security Plan</p>
              <h2 className="text-lg font-bold text-white">{business?.name} Security Assessment</h2>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Business Profile</p>
              <p className="text-sm text-slate-300">{business?.desc}</p>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Identified Risks & Mitigations</p>
              <div className="space-y-2">
                {riskArr.map((riskIdx) => (
                  <div key={riskIdx} className="flex items-center gap-3 text-sm">
                    <span className="text-red-400 w-40 flex-shrink-0">{RISKS[riskIdx]}</span>
                    <span className="text-slate-600">&rarr;</span>
                    <span className="text-teal-400">{protections[riskIdx]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Executive Summary</p>
              <p className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">{summaryText}</p>
            </div>

            <div className="border-t border-slate-700 pt-3">
              <p className="text-xs text-slate-500">
                Prepared by: Student &middot; BrightBoost Cyber Launch Track
              </p>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end mt-6">
        {step < 4 && (
          <PrimaryButton onClick={() => setStep((s) => s + 1)} disabled={!canAdvance()}>
            Next
          </PrimaryButton>
        )}
        {step === 4 && (
          <PrimaryButton onClick={handleFinish}>
            Submit Plan
          </PrimaryButton>
        )}
      </div>
    </ModuleShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT EXPORT — Module router for ModulePlayer
// ═══════════════════════════════════════════════════════════════════════════

const MODULE_MAP: Record<string, React.FC<ModuleProps>> = {
  "cyber-foundations": CyberFoundations,
  "digital-safety-sim": DigitalSafetySim,
  "network-basics": NetworkBasics,
  "threat-detective": ThreatDetective,
  "cyber-career-map": CyberCareerMap,
  "cisco-netacad-link": CiscoNetacadLink,
  "cyber-capstone": CyberCapstone,
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
