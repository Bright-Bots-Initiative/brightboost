/**
 * Shared light/dark-aware card used across the facilitator admin pages.
 */
import type { ReactNode } from "react";

export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 border-b border-slate-200 dark:border-slate-700 ${className}`}>{children}</div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  accentClass,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accentClass?: string;
}) {
  return (
    <div className={`rounded-xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 p-4 ${accentClass ?? ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium">{label}</p>
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-0.5">{hint}</p>}
    </div>
  );
}
