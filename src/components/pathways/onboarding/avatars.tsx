/**
 * Avatar palette — eight stylized icons used in the welcome flow and on the
 * profile character sheet. Each maps to a lucide icon + a color so students
 * feel choice is meaningful. Slugs are stable and saved to
 * PathwayOnboarding.avatarSlug.
 */
import {
  Compass,
  Search,
  Shield,
  Target,
  Wrench,
  Crown,
  Eye,
  Cpu,
  type LucideIcon,
} from "lucide-react";

export interface AvatarOption {
  slug: string;
  label: string;
  Icon: LucideIcon;
  /** Tailwind classes for the icon container background + foreground. */
  ringClass: string;
  /** Plain Tailwind text color for the chosen indicator. */
  hoverClass: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    slug: "explorer",
    label: "Explorer",
    Icon: Compass,
    ringClass:
      "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300",
    hoverClass: "hover:border-indigo-400 dark:hover:border-indigo-500",
  },
  {
    slug: "analyst",
    label: "Analyst",
    Icon: Search,
    ringClass:
      "bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/25 dark:text-cyan-300",
    hoverClass: "hover:border-cyan-400 dark:hover:border-cyan-500",
  },
  {
    slug: "guardian",
    label: "Guardian",
    Icon: Shield,
    ringClass:
      "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-300",
    hoverClass: "hover:border-emerald-400 dark:hover:border-emerald-500",
  },
  {
    slug: "hunter",
    label: "Hunter",
    Icon: Target,
    ringClass:
      "bg-rose-500/15 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300",
    hoverClass: "hover:border-rose-400 dark:hover:border-rose-500",
  },
  {
    slug: "builder",
    label: "Builder",
    Icon: Wrench,
    ringClass:
      "bg-amber-500/15 text-amber-700 dark:bg-amber-500/25 dark:text-amber-300",
    hoverClass: "hover:border-amber-400 dark:hover:border-amber-500",
  },
  {
    slug: "strategist",
    label: "Strategist",
    Icon: Crown,
    ringClass:
      "bg-fuchsia-500/15 text-fuchsia-700 dark:bg-fuchsia-500/25 dark:text-fuchsia-300",
    hoverClass: "hover:border-fuchsia-400 dark:hover:border-fuchsia-500",
  },
  {
    slug: "detective",
    label: "Detective",
    Icon: Eye,
    ringClass:
      "bg-slate-500/15 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200",
    hoverClass: "hover:border-slate-400 dark:hover:border-slate-500",
  },
  {
    slug: "engineer",
    label: "Engineer",
    Icon: Cpu,
    ringClass:
      "bg-teal-500/15 text-teal-700 dark:bg-teal-500/25 dark:text-teal-300",
    hoverClass: "hover:border-teal-400 dark:hover:border-teal-500",
  },
];

export function findAvatar(slug: string | null | undefined): AvatarOption | undefined {
  if (!slug) return undefined;
  return AVATAR_OPTIONS.find((a) => a.slug === slug);
}

export function AvatarBadge({
  slug,
  size = "md",
}: {
  slug: string | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const opt = findAvatar(slug);
  const dim =
    size === "sm" ? "w-8 h-8" : size === "md" ? "w-12 h-12" : size === "lg" ? "w-16 h-16" : "w-24 h-24";
  const iconDim =
    size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : size === "lg" ? "w-8 h-8" : "w-12 h-12";
  if (!opt) {
    return (
      <div
        className={`${dim} rounded-full bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold`}
      >
        ?
      </div>
    );
  }
  const Icon = opt.Icon;
  return (
    <div
      className={`${dim} rounded-full ${opt.ringClass} flex items-center justify-center`}
      aria-label={opt.label}
    >
      <Icon className={iconDim} />
    </div>
  );
}
