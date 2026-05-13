/**
 * Shared Section card used across all facilitator resource tabs.
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
    <div id={id} className="rounded-xl border border-slate-700 bg-slate-800/50 p-5 scroll-mt-20">
      <h3 className="font-semibold text-slate-200 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mb-3">{subtitle}</p>}
      <div className="text-sm text-slate-300 space-y-2">{children}</div>
    </div>
  );
}
