/**
 * Biome Buddy — "Share my Buddy" (Phase 9).
 *
 * Builds the validated share URL for the current origin, hands it to the Web
 * Share API when the browser has one, and otherwise copies it to the
 * clipboard. Success/failure is announced through a live region; on failure
 * the link is shown in a read-only field so it can still be copied by hand.
 * No backend, no automatic posting anywhere.
 */
import { useId, useRef, useState } from "react";
import type { BuddyRecipe } from "./biomeBuddyModel";
import { buildShareUrl } from "./biomeBuddyShare";
import { useBuddyLocale } from "./useBuddyLocale";

type Status = "idle" | "shared" | "copied" | "failed";

export interface ShareButtonProps {
  recipe: BuddyRecipe;
  /** Rendered Buddy name — used only as the share sheet title. */
  name: string;
  className?: string;
  variant?: "primary" | "secondary";
}

export default function ShareButton({
  recipe,
  name,
  className = "",
  variant = "primary",
}: ShareButtonProps) {
  const { t } = useBuddyLocale();
  const [status, setStatus] = useState<Status>("idle");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const statusId = useId();

  const url = () =>
    buildShareUrl(
      typeof window !== "undefined" ? window.location.origin : "",
      recipe,
    );

  const copy = async (link: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
        return true;
      }
    } catch {
      // fall through to the manual field
    }
    return false;
  };

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    const link = url();
    try {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; url?: string }) => Promise<void>;
      };
      if (typeof nav.share === "function") {
        try {
          await nav.share({
            title: t("biomeBuddy.share.title", {
              defaultValue: "{{name}} — Biome Buddy",
              name,
            }),
            url: link,
          });
          setStatus("shared");
          return;
        } catch (error) {
          if ((error as { name?: string })?.name === "AbortError") return; // child changed their mind
        }
      }
      setStatus((await copy(link)) ? "copied" : "failed");
    } finally {
      setBusy(false);
    }
  };

  const message =
    status === "shared"
      ? t("biomeBuddy.share.shared", { defaultValue: "Shared! 🎉" })
      : status === "copied"
        ? t("biomeBuddy.share.copied", {
            defaultValue: "Link copied! Send it to someone you like.",
          })
        : status === "failed"
          ? t("biomeBuddy.share.failed", {
              defaultValue:
                "Couldn't copy by itself — here's the link to copy:",
            })
          : "";

  return (
    <div className={`flex flex-col items-center gap-2 w-full ${className}`}>
      <button
        type="button"
        onClick={onShare}
        disabled={busy}
        aria-describedby={statusId}
        className={
          variant === "primary"
            ? "bb-primary min-h-14 px-8 rounded-full bg-brightboost-navy text-white font-extrabold text-lg shadow-[0_5px_0_#0f2747] active:translate-y-1 active:shadow-none disabled:opacity-60"
            : "min-h-11 px-5 rounded-full bg-white border-2 border-[#e1d0a6] text-[#3a2e22] font-bold active:scale-95 disabled:opacity-60"
        }
      >
        <span aria-hidden>🔗 </span>
        {t("biomeBuddy.share.button", { defaultValue: "Share my Buddy" })}
      </button>
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-sm font-bold text-green-800 min-h-5"
      >
        {message}
      </p>
      {(status === "copied" || status === "failed" || status === "shared") && (
        <input
          ref={inputRef}
          readOnly
          value={url()}
          onFocus={(event) => event.currentTarget.select()}
          aria-label={t("biomeBuddy.share.linkAria", {
            defaultValue: "Share link",
          })}
          className="w-full max-w-md min-h-11 rounded-2xl border-2 border-[#e1cfa6] bg-white px-3 text-xs font-mono text-[#3a2e22]"
        />
      )}
    </div>
  );
}
