// src/pages/StudentClassLogin.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE, join } from "../services/api";
import GameBackground from "../components/GameBackground";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClassInfo {
  courseId: string;
  className: string;
  teacherName: string;
  defaultLanguage: string;
  students: {
    id: string;
    name: string;
    loginIcon: string;
    hasPin: boolean;
  }[];
}

// ---------------------------------------------------------------------------
// API helpers (pre-auth, no token needed)
// ---------------------------------------------------------------------------

async function getClassByCode(code: string): Promise<ClassInfo> {
  const res = await fetch(join(API_BASE, `/classes/by-code/${code}`));
  if (!res.ok) {
    if (res.status === 404) throw new Error("Class not found");
    throw new Error("Something went wrong");
  }
  return res.json();
}

async function classLogin(
  courseId: string,
  studentId: string,
  pin?: string,
): Promise<{ token: string; user: any }> {
  const res = await fetch(join(API_BASE, "/auth/class-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, studentId, pin }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Login failed");
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "code" | "icon" | "pin";

const LAST_CLASS_CODE_KEY = "bb_last_class_code";

export default function StudentClassLogin() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("code");
  const [classCode, setClassCode] = useState(
    () => localStorage.getItem(LAST_CLASS_CODE_KEY) || "",
  );
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ClassInfo["students"][0] | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Clear error when step changes
  useEffect(() => {
    setError("");
  }, [step]);

  // Step 1: Enter class code
  const handleCodeSubmit = async () => {
    const code = classCode.toUpperCase().trim();
    if (code.length < 3) {
      setError("Type your class code!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const info = await getClassByCode(code);
      if (info.students.length === 0) {
        setError("No students set up yet. Ask your teacher!");
        return;
      }
      setClassInfo(info);
      localStorage.setItem(LAST_CLASS_CODE_KEY, code);
      setStep("icon");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Pick icon → auto-advance to PIN or login
  const handleIconSelect = (student: ClassInfo["students"][0]) => {
    setSelectedStudent(student);
    if (student.hasPin) {
      setPin("");
      setStep("pin");
    } else {
      // No PIN needed — login directly
      doLogin(student.id);
    }
  };

  // Step 3: PIN entry
  const handlePinSubmit = () => {
    if (!selectedStudent) return;
    if (pin.length !== 4) {
      setError("Type all 4 numbers!");
      return;
    }
    doLogin(selectedStudent.id, pin);
  };

  // Login
  const doLogin = async (studentId: string, pinCode?: string) => {
    if (!classInfo) return;
    setLoading(true);
    setError("");
    try {
      const result = await classLogin(classInfo.courseId, studentId, pinCode);
      login(result.token, result.user, "/student/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <GameBackground>
      <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
        <div className="game-card p-8 w-full max-w-lg ui-sheen">
          {/* Step 1: Enter Class Code */}
          {step === "code" && (
            <div className="text-center space-y-6">
              <div>
                <span className="text-5xl mb-2 block">🏫</span>
                <h1 className="text-2xl font-bold text-brightboost-navy">
                  What's your class code?
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Ask your teacher!
                </p>
              </div>

              <div className="flex justify-center">
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) =>
                    setClassCode(e.target.value.toUpperCase().slice(0, 6))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                  maxLength={6}
                  placeholder="ABC123"
                  className="text-center text-3xl font-mono font-bold tracking-[0.3em] w-56 px-4 py-3 border-2 border-brightboost-lightblue rounded-xl bg-white text-brightboost-navy focus:ring-2 focus:ring-brightboost-blue focus:border-transparent outline-none uppercase"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              )}

              <button
                onClick={handleCodeSubmit}
                disabled={loading || classCode.length < 3}
                className="mx-auto flex items-center gap-2 px-8 py-3 bg-brightboost-blue text-white font-bold text-lg rounded-xl hover:bg-brightboost-navy disabled:opacity-50 transition-all hover:scale-105"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Next <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t">
                <Link
                  to="/"
                  className="text-sm text-brightboost-blue hover:underline"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}

          {/* Step 2: Pick Your Icon */}
          {step === "icon" && classInfo && (
            <div className="text-center space-y-6">
              <div>
                <button
                  onClick={() => setStep("code")}
                  className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-4xl mb-2 block">👋</span>
                <h1 className="text-2xl font-bold text-brightboost-navy">
                  Find your icon!
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {classInfo.className} — {classInfo.teacherName}
                </p>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              )}

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-brightboost-blue" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {classInfo.students.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleIconSelect(s)}
                      className="flex flex-col items-center p-3 rounded-xl border-2 border-transparent hover:border-brightboost-blue hover:bg-blue-50 transition-all hover:scale-105 active:scale-95"
                    >
                      <span className="text-4xl mb-1">{s.loginIcon}</span>
                      <span className="text-xs font-medium text-slate-700 truncate w-full">
                        {s.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Enter PIN */}
          {step === "pin" && selectedStudent && (
            <div className="text-center space-y-6">
              <div>
                <button
                  onClick={() => {
                    setStep("icon");
                    setPin("");
                  }}
                  className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-5xl mb-2 block">
                  {selectedStudent.loginIcon}
                </span>
                <h1 className="text-2xl font-bold text-brightboost-navy">
                  Hi, {selectedStudent.name.split(" ")[0]}!
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Type your secret number
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={pin}
                  onChange={setPin}
                  onComplete={() => {
                    // Auto-submit when all 4 digits entered
                    setTimeout(() => handlePinSubmit(), 200);
                  }}
                >
                  <InputOTPGroup className="gap-3">
                    <InputOTPSlot
                      index={0}
                      className="w-14 h-14 text-2xl font-bold rounded-xl border-2 border-brightboost-lightblue"
                    />
                    <InputOTPSlot
                      index={1}
                      className="w-14 h-14 text-2xl font-bold rounded-xl border-2 border-brightboost-lightblue"
                    />
                    <InputOTPSlot
                      index={2}
                      className="w-14 h-14 text-2xl font-bold rounded-xl border-2 border-brightboost-lightblue"
                    />
                    <InputOTPSlot
                      index={3}
                      className="w-14 h-14 text-2xl font-bold rounded-xl border-2 border-brightboost-lightblue"
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <p className="text-red-500 text-sm font-medium">{error}</p>
              )}

              <button
                onClick={handlePinSubmit}
                disabled={loading || pin.length !== 4}
                className="mx-auto flex items-center gap-2 px-8 py-3 bg-brightboost-blue text-white font-bold text-lg rounded-xl hover:bg-brightboost-navy disabled:opacity-50 transition-all hover:scale-105"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Go! <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </GameBackground>
  );
}
