import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Phase 0 — status chip for a kid's Creation.
//
// Three states (mirrors the `CreationStatus` enum):
//   IN_PROGRESS — private draft (only the author sees this chip)
//   SHARED      — kid chose to share an unfinished work to the group gallery
//   COMPLETE    — finished, visible in the group gallery
//
// Copy is K-2-friendly and always positive ("Still working" — never "unfinished"
// or "incomplete"). All strings go through i18n.

export type CreationStatus = "IN_PROGRESS" | "SHARED" | "COMPLETE";

const STATUS_STYLES: Record<CreationStatus, string> = {
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  SHARED: "bg-sky-100 text-sky-800 border-sky-200",
  COMPLETE: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_EMOJI: Record<CreationStatus, string> = {
  IN_PROGRESS: "✏️",
  SHARED: "🌱",
  COMPLETE: "✅",
};

const STATUS_I18N: Record<CreationStatus, string> = {
  IN_PROGRESS: "creations.status.inProgress",
  SHARED: "creations.status.shared",
  COMPLETE: "creations.status.complete",
};

export default function CreationStatusChip({
  status,
  className,
}: {
  status: CreationStatus;
  className?: string;
}) {
  const { t } = useTranslation();

  return (
    <Badge
      variant="outline"
      className={cn("gap-1", STATUS_STYLES[status], className)}
      aria-label={t(STATUS_I18N[status])}
    >
      <span aria-hidden="true">{STATUS_EMOJI[status]}</span>
      {t(STATUS_I18N[status])}
    </Badge>
  );
}
