/**
 * ScratchPad — per-challenge sessionStorage notepad.
 *
 * Real CTF players keep a scratch pad for work-in-progress decoding,
 * partial answers, ideas they want to try. This is the in-app version:
 * a collapsible monospace textarea that auto-saves as the student types
 * and clears when they close the browser tab (sessionStorage, not local).
 *
 * One pad per challenge slug, so switching between challenges doesn't
 * pollute the workspace.
 */
import { useEffect, useState } from "react";
import { Edit3, ChevronDown, ChevronUp } from "lucide-react";

interface ScratchPadProps {
  challengeSlug: string;
  defaultExpanded?: boolean;
  /** If true, omit the collapsible header chrome. Used inside the mobile
   *  drawer where the drawer's tab provides the wrapper. */
  hideHeader?: boolean;
}

export default function ScratchPad({
  challengeSlug,
  defaultExpanded = true,
  hideHeader = false,
}: ScratchPadProps) {
  const storageKey = `ctf-scratch-${challengeSlug}`;
  const [content, setContent] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Hydrate from sessionStorage when the slug changes.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      setContent(saved ?? "");
    } catch {
      setContent("");
    }
  }, [storageKey]);

  const handleChange = (val: string) => {
    setContent(val);
    try {
      sessionStorage.setItem(storageKey, val);
    } catch {
      /* sessionStorage may be unavailable in private modes — value still
         lives in component state for the lifetime of the page. */
    }
  };

  const body = (
    <>
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Work it out here. Notes, attempts, decoded letters, anything…"
        spellCheck={false}
        className="w-full min-h-[150px] p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono text-sm resize-y focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-2">
        Saved locally in your browser — clears when you close the tab.
      </p>
    </>
  );

  if (hideHeader) {
    return <div>{body}</div>;
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between p-3 sm:p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            Scratch Pad
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-500 hidden sm:inline">
            (your work, auto-saved)
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        )}
      </button>

      {expanded && <div className="px-3 sm:px-4 pb-3 sm:pb-4">{body}</div>}
    </div>
  );
}
