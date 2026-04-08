/**
 * Unified Login Page — supports email login AND join/cohort code entry.
 * Routes K-8 users to student/teacher dashboards and Pathways users to /pathways.
 */
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, KeyRound, Loader2, ArrowRight, UserPlus } from "lucide-react";

const API = "/api";

const LoginSelection: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  // Email login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // Code state
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeResult, setCodeResult] = useState<any>(null);

  // Pathways registration state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regBirthYear, setRegBirthYear] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Pathways code login state (returning user without email)
  const [roster, setRoster] = useState<{ id: string; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [rosterPassword, setRosterPassword] = useState("");

  // ── Email Login ──
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setEmailLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      login(data.token, data.user);
    } catch (err: any) {
      setEmailError(err.message || "Login failed");
    } finally {
      setEmailLoading(false);
    }
  };

  // ── Code Lookup ──
  const handleCodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError("");
    setCodeLoading(true);
    setCodeResult(null);
    setRoster([]);
    try {
      const res = await fetch(`${API}/auth/lookup-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");

      if (data.type === "k8_class") {
        // Redirect to existing K-8 class login flow
        navigate(`/class-login?code=${encodeURIComponent(code.trim())}`);
        return;
      }

      if (data.type === "pathways_cohort") {
        setCodeResult(data);
        // Also load roster for returning users
        const rosterRes = await fetch(`${API}/auth/cohort-roster/${code.trim()}`);
        const rosterData = await rosterRes.json();
        if (rosterData.students?.length > 0) {
          setRoster(rosterData.students);
        }
      }
    } catch (err: any) {
      setCodeError(err.message || "Invalid code");
    } finally {
      setCodeLoading(false);
    }
  };

  // ── Pathways Registration ──
  const handlePathwaysRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    try {
      const res = await fetch(`${API}/auth/register-pathways`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortCode: code.trim(),
          displayName: regName,
          email: regEmail || null,
          password: regPassword,
          birthYear: parseInt(regBirthYear),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      login(data.token, data.user, "/pathways");
    } catch (err: any) {
      setRegError(err.message || "Registration failed");
    } finally {
      setRegLoading(false);
    }
  };

  // ── Pathways Code Login (returning user) ──
  const handleRosterLogin = async () => {
    if (!selectedUser || !rosterPassword) return;
    setRegError("");
    setRegLoading(true);
    try {
      const res = await fetch(`${API}/auth/pathways-code-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cohortCode: code.trim(), userId: selectedUser, password: rosterPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      login(data.token, data.user, "/pathways");
    } catch (err: any) {
      setRegError(err.message || "Login failed");
    } finally {
      setRegLoading(false);
    }
  };

  // ── Pathways cohort matched — show registration/login form ──
  if (codeResult?.type === "pathways_cohort") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-400 font-medium">Bright Boost Pathways</p>
            <h1 className="text-2xl font-bold text-white mt-2">{codeResult.name}</h1>
            <p className="text-sm text-slate-400 mt-1 capitalize">{codeResult.band} band</p>
          </div>

          {/* Returning user section */}
          {roster.length > 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-5 space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm">Returning? Select your name:</h3>
              <div className="grid grid-cols-2 gap-2">
                {roster.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedUser(s.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedUser === s.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              {selectedUser && (
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={rosterPassword}
                    onChange={(e) => setRosterPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleRosterLogin}
                    disabled={regLoading || !rosterPassword}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-50"
                  >
                    {regLoading ? "Signing in..." : "Sign In"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-slate-500 text-xs">
            <div className="flex-1 h-px bg-slate-700" />
            <span>{roster.length > 0 ? "or register as new" : "Create your account"}</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* New registration */}
          <form onSubmit={handlePathwaysRegister} className="rounded-xl border border-slate-700 bg-slate-800/80 p-5 space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Your Name</label>
              <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="What should we call you?" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Email (optional)</label>
              <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="So you can log in later with email" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <input type="password" required minLength={6} value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Birth Year</label>
              <input type="number" required min={2005} max={2015} value={regBirthYear} onChange={(e) => setRegBirthYear(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="e.g. 2010" />
            </div>
            {regError && <p className="text-red-400 text-xs">{regError}</p>}
            <button type="submit" disabled={regLoading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {regLoading ? "Creating account..." : "Join & Start Learning"}
            </button>
          </form>

          <button onClick={() => { setCodeResult(null); setRoster([]); }} className="w-full text-center text-sm text-slate-500 hover:text-slate-300">
            Use a different code
          </button>
        </div>
      </div>
    );
  }

  // ── Main login page ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            {t("auth.chooseLoginType", { defaultValue: "Welcome to Bright Boost" })}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {t("auth.selectHowToLogin", { defaultValue: "Sign in or join with a code" })}
          </p>
        </div>

        {/* Email Login */}
        <form onSubmit={handleEmailLogin} className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <Mail className="w-4 h-4" />
            {t("auth.emailLogin", { defaultValue: "Log in with Email" })}
          </div>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Email address"
          />
          <input
            type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Password"
          />
          {emailError && <p className="text-red-600 text-xs">{emailError}</p>}
          <button type="submit" disabled={emailLoading}
            className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {emailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {emailLoading ? "Signing in..." : t("auth.teacherLogin", { defaultValue: "Log In" })}
          </button>
          <div className="text-center">
            <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline">
              {t("auth.forgotPassword", { defaultValue: "Forgot password?" })}
            </Link>
          </div>
        </form>

        <div className="flex items-center gap-3 text-slate-400 text-xs">
          <div className="flex-1 h-px bg-slate-200" />
          <span>or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Join Code */}
        <form onSubmit={handleCodeLookup} className="rounded-xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <KeyRound className="w-4 h-4" />
            {t("auth.joinWithCode", { defaultValue: "Join with a Code" })}
          </div>
          <input
            type="text" required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-mono tracking-wider text-center uppercase focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Enter class or cohort code"
            maxLength={10}
          />
          {codeError && <p className="text-red-600 text-xs">{codeError}</p>}
          <button type="submit" disabled={codeLoading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {codeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {codeLoading ? "Looking up..." : t("auth.joinButton", { defaultValue: "Join" })}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          {t("auth.facilitatorNote", { defaultValue: "Teacher or facilitator? Use the email login above." })}
        </p>

        <div className="text-center">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            {t("auth.backToHome", { defaultValue: "Back to Home" })}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginSelection;
