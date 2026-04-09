/**
 * Shared login card wrapper — provides consistent styling for all login pages.
 */
import React from "react";
import { Link } from "react-router-dom";

export default function LoginCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-100 via-sky-50 to-white p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          {icon && <div className="text-4xl mb-2">{icon}</div>}
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>

        {children}

        <div className="text-center">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LoginInput({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow ${props.className ?? ""}`}
    />
  );
}

export function LoginButton({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      className={`w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${props.className ?? ""}`}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export function LoginDivider({ text = "or" }: { text?: string }) {
  return (
    <div className="flex items-center gap-3 text-slate-400 text-xs">
      <div className="flex-1 h-px bg-slate-200" />
      <span>{text}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );
}

export function LoginSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
      {children}
    </div>
  );
}
