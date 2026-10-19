import { Component, useEffect, useRef, type ReactNode } from "react";
import i18n from "i18next";
import en from "@/locales/en/recovery.json";
import es from "@/locales/es/recovery.json";
import vi from "@/locales/vi/recovery.json";
import zh from "@/locales/zh-CN/recovery.json";

// Bootstrap recovery must work even when the i18n module or a locale chunk
// cannot load. These small, bundled dictionaries deliberately have no boot dependencies.
function recoveryCopy() {
  let language: string | undefined = i18n.language;
  if (!language) {
    try {
      language = localStorage.getItem("preferredLanguage") || undefined;
    } catch {
      /* Storage denial must not break the recovery screen itself. */
    }
  }
  language = (language || navigator.language || "en").toLowerCase();
  if (language.startsWith("es")) return { copy: es, language: "es" };
  if (language.startsWith("vi")) return { copy: vi, language: "vi" };
  if (language.startsWith("zh")) return { copy: zh, language: "zh-CN" };
  return { copy: en, language: "en" };
}

export function LoadingScreen() {
  const { copy, language } = recoveryCopy();
  return (
    <p
      lang={language}
      role="status"
      className="flex min-h-screen items-center justify-center p-6 text-lg text-slate-800"
    >
      {copy.loading}
    </p>
  );
}

export default function RecoveryScreen({
  reason = "load",
  onReload = () => window.location.reload(),
}: {
  reason?: "load" | "storage";
  onReload?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { copy, language } = recoveryCopy();
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <main
      lang={language}
      className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12"
    >
      <div
        role="alert"
        className="w-full space-y-5 rounded-2xl border border-slate-300 bg-white p-6 text-slate-900 shadow-sm"
      >
        <h1
          ref={heading}
          tabIndex={-1}
          className="text-2xl font-bold focus:outline-none"
        >
          {reason === "storage" ? copy.storageTitle : copy.title}
        </h1>
        <p className="text-lg leading-relaxed">
          {reason === "storage" ? copy.storageMessage : copy.message}
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            onClick={onReload}
            className="min-h-11 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {copy.reload}
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-semibold text-blue-800 underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {copy.home}
          </a>
        </div>
      </div>
    </main>
  );
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <RecoveryScreen /> : this.props.children;
  }
}
