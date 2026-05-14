/**
 * Shared Section card used across all facilitator resource tabs.
 * Light/dark aware via Tailwind dark: variants.
 */
import type { ReactNode } from "react";

export default function Section({
  title,
  subtitle,
  children,
  id,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div
      id={id}
      className="rounded-xl border bg-white border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 p-5 scroll-mt-20 shadow-sm"
    >
      <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-slate-600 dark:text-slate-500 mb-3">{subtitle}</p>}
      <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">{children}</div>
    </div>
  );
}
