/**
 * GlossaryTerm — inline term with hover/tap-to-reveal definition popover.
 *
 * Usage:
 *   <GlossaryTerm term="mfa">Multi-factor authentication</GlossaryTerm>
 *
 * Behavior:
 *  - Desktop: hover OR keyboard focus opens the popover.
 *  - Mobile/touch: tap the term to open; tap outside or press Escape to close.
 *  - First open per session POSTs to /api/pathways/glossary/view, which
 *    is idempotent per (user, term) on the server.
 *
 * Implementation: no UI library dependency — a tiny built-in popover so this
 * works in the Pathways tree without adding @radix-ui or shadcn primitives.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { findTerm } from "@/data/glossary";

interface GlossaryTermProps {
  term: string;
  children?: ReactNode;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("bb_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const VIEWED_SESSION_KEY = "bb_pathways_glossary_viewed_session";

function readSessionViews(): Set<string> {
  try {
    const raw = sessionStorage.getItem(VIEWED_SESSION_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markSessionView(slug: string) {
  try {
    const s = readSessionViews();
    s.add(slug);
    sessionStorage.setItem(VIEWED_SESSION_KEY, JSON.stringify(Array.from(s)));
  } catch {
    /* ignore */
  }
}

async function trackViewOnce(slug: string) {
  if (readSessionViews().has(slug)) return;
  markSessionView(slug);
  try {
    await fetch("/api/pathways/glossary/view", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader() },
      body: JSON.stringify({ termSlug: slug }),
    });
  } catch {
    /* tracking is best-effort */
  }
}

export default function GlossaryTerm({ term, children }: GlossaryTermProps) {
  const entry = findTerm(term);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();

  const recomputeAnchor = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({
      top: r.bottom + window.scrollY + 6,
      left: r.left + window.scrollX,
      width: r.width,
    });
  }, []);

  const show = useCallback(() => {
    recomputeAnchor();
    setOpen(true);
    if (entry) void trackViewOnce(entry.slug);
  }, [entry, recomputeAnchor]);

  const hide = useCallback(() => setOpen(false), []);

  // Close on outside click, Escape, and window resize/scroll (reposition).
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) {
        return;
      }
      hide();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    const onReflow = () => recomputeAnchor();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, hide, recomputeAnchor]);

  if (!entry) {
    // Soft-fail: render the inner text unstyled so a typo in the term slug
    // doesn't break the surrounding paragraph.
    if (typeof console !== "undefined") {
      console.warn(`GlossaryTerm: unknown slug "${term}"`);
    }
    return <span>{children ?? term}</span>;
  }

  const label = children ?? entry.term;

  return (
    <>
      <span
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.preventDefault();
          if (open) hide();
          else show();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (open) hide();
          else show();
          }
        }}
        className="border-b border-dotted border-indigo-400 dark:border-indigo-500 cursor-help text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded-sm transition-colors"
      >
        {label}
      </span>
      {open && anchor &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="tooltip"
            // Clamp inside the viewport on mobile (max-w-[90vw]).
            style={{
              position: "absolute",
              top: anchor.top,
              left: anchor.left,
              maxWidth: "min(20rem, 90vw)",
              zIndex: 70,
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-3 text-left"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {entry.term}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
              {entry.shortDef}
            </p>
            {entry.longDef && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                {entry.longDef}
              </p>
            )}
            {entry.examples && entry.examples.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1">
                  Examples
                </p>
                <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
                  {entry.examples.map((ex, i) => (
                    <li key={i} className="flex gap-1">
                      <span className="text-slate-400">·</span>
                      <span>{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
