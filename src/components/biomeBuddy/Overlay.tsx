/**
 * Biome Buddy — focus-managed modal overlay (science cards, Test & Learn,
 * confirmations). Waterworks `Overlay` precedent, plus:
 *   - focus moves INTO the dialog on open (first focusable, else the panel);
 *   - Tab / Shift+Tab cycle inside the dialog;
 *   - Escape calls onClose;
 *   - focus RETURNS to the element that was active when it opened.
 * On phones the panel docks to the bottom as a sheet (biomeBuddy.css) so the
 * stat bars behind a science card stay visible.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { useBuddyLocale } from "./useBuddyLocale";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface OverlayProps {
  children: ReactNode;
  /** id of the heading element inside — the dialog's accessible name. */
  labelledBy: string;
  onClose?: () => void;
  wide?: boolean;
  /** Bottom-sheet on phones (science cards) vs centered (walkthroughs). */
  sheet?: boolean;
  className?: string;
  /** Element to return focus to on close. Defaults to whatever was focused
   *  when the overlay opened; pass the opener explicitly when the trigger
   *  may not have received focus (tap, virtual cursor). */
  returnFocusTo?: HTMLElement | null;
}

export default function Overlay({
  children,
  labelledBy,
  onClose,
  wide,
  sheet,
  className = "",
  returnFocusTo = null,
}: OverlayProps) {
  const { t } = useBuddyLocale();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const returnRef = useRef(returnFocusTo);
  returnRef.current = returnFocusTo;

  useEffect(() => {
    const opener =
      returnRef.current ?? (document.activeElement as HTMLElement | null);
    const panel = panelRef.current;
    if (panel) {
      const first =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus({ preventScroll: true });
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (
        opener &&
        typeof opener.focus === "function" &&
        document.contains(opener)
      )
        opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div
      className={`bb-overlay fixed inset-0 z-40 bg-slate-900/50 flex ${sheet ? "items-end sm:items-center" : "items-center"} justify-center overflow-y-auto`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`bb-dialog ${sheet ? "bb-dialog--sheet" : ""} bb-pop bg-[#fbf7ee] rounded-3xl p-5 w-full ${
          wide ? "max-w-lg" : "max-w-sm"
        } relative flex flex-col items-center gap-3 text-center shadow-2xl overflow-y-auto outline-none ${className}`}
      >
        {children}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("biomeBuddy.common.close", { defaultValue: "Close" })}
            className="bb-dialog-close min-h-11 min-w-11 rounded-full bg-white/90 text-[#3a2e22] text-lg font-extrabold shadow active:scale-95"
          >
            <span aria-hidden>✕</span>
          </button>
        )}
      </div>
    </div>
  );
}
