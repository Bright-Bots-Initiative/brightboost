import React, { useEffect, useRef, useCallback } from "react";
import { t } from "../lib/i18n";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  badgeName?: string;
};
export default function BadgeModal({
  open,
  onClose,
  title = "Badge Unlocked!",
  badgeName,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      closeBtnRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Tab") return;
      const focusable = containerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      aria-modal="true"
      role="dialog"
      data-testid="badge-modal"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        className="bg-white rounded-2xl p-6 w-[22rem] shadow-xl outline-none"
        tabIndex={-1}
        aria-label={title}
      >
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="mb-4">
          {t("student.youEarned")}{" "}
          <span className="font-semibold">{badgeName ?? "Badge"}</span>
        </p>
        <button
          ref={closeBtnRef}
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white w-full"
        >
          OK
        </button>
      </div>
    </div>
  );
}
