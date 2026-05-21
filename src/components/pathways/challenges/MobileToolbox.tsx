/**
 * MobileToolbox — bottom-anchored drawer that gives mobile students
 * access to the Toolbox and Scratch Pad without taking screen space
 * from the challenge content.
 *
 * Hidden at lg+ (the desktop sidebar handles those viewports). On
 * smaller screens, the floating "Tools" button sits above the Pathways
 * bottom nav. Tapping opens a 80vh bottom sheet with two tabs.
 */
import { useEffect, useState } from "react";
import { Wrench, Edit3, X } from "lucide-react";
import type { CtfCategory } from "@/constants/ctfChallenges";
import Toolbox from "./Toolbox";
import ScratchPad from "./ScratchPad";

interface MobileToolboxProps {
  category: CtfCategory;
  challengeSlug: string;
}

export default function MobileToolbox({
  category,
  challengeSlug,
}: MobileToolboxProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"tools" | "scratch">("tools");

  // Close on Escape so it behaves like a modal even when the FAB has focus.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Floating button — `bottom-20` keeps it above the Pathways bottom
          nav (~64px). Hidden on lg+ where the sidebar is visible. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open challenge tools"
        className="lg:hidden fixed bottom-20 right-4 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full shadow-lg pl-3 pr-4 py-3 flex items-center gap-2 transition-transform"
      >
        <Wrench className="w-5 h-5" />
        <span className="text-sm font-semibold">Tools</span>
      </button>

      {/* Bottom sheet */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Challenge tools"
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-h-[80vh] rounded-t-2xl overflow-hidden flex flex-col border-t border-slate-200 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-2 shrink-0">
              <div className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setView("tools")}
                className={`flex-1 py-3 inline-flex items-center justify-center gap-1.5 font-semibold text-sm transition-colors ${
                  view === "tools"
                    ? "text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500"
                    : "text-slate-500 dark:text-slate-400 border-b-2 border-transparent"
                }`}
              >
                <Wrench className="w-4 h-4" /> Toolbox
              </button>
              <button
                type="button"
                onClick={() => setView("scratch")}
                className={`flex-1 py-3 inline-flex items-center justify-center gap-1.5 font-semibold text-sm transition-colors ${
                  view === "scratch"
                    ? "text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-500"
                    : "text-slate-500 dark:text-slate-400 border-b-2 border-transparent"
                }`}
              >
                <Edit3 className="w-4 h-4" /> Scratch Pad
              </button>
            </div>

            {/* Content (scrolls internally if tools exceed the sheet) */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {view === "tools" && <Toolbox category={category} hideHeader />}
              {view === "scratch" && (
                <ScratchPad
                  challengeSlug={challengeSlug}
                  hideHeader
                />
              )}
            </div>

            {/* Close affordance — separate from the swipe-down area */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-3 inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium border-t border-slate-200 dark:border-slate-700 shrink-0"
            >
              <X className="w-4 h-4" /> Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
