import { BookOpen, Star, Zap, Check } from "lucide-react";
import { ACTIVITY_VISUAL_TOKENS, VisualKey } from "@/theme/activityVisualTokens";

type ActivityHeaderProps = {
  title: string;
  modeLabel?: string;
  visualKey: VisualKey;
  missionKey?: VisualKey;
  subtitle?: string;
};

export default function ActivityHeader({
  title,
  modeLabel,
  visualKey,
  missionKey,
  subtitle,
}: ActivityHeaderProps) {
  // Determine which token to use for the main visual (icon bubble)
  const tokenKey = missionKey || visualKey;
  const token = ACTIVITY_VISUAL_TOKENS[tokenKey] || ACTIVITY_VISUAL_TOKENS["default"];

  // Determine which token to use for the mode chip (Story/Quiz/Game)
  const modeToken = ACTIVITY_VISUAL_TOKENS[visualKey] || ACTIVITY_VISUAL_TOKENS["default"];

  const Icon = () => {
    if (token.emoji) return <span className="text-xl leading-none">{token.emoji}</span>;
    switch (token.iconName) {
      case "BookOpen": return <BookOpen className="w-5 h-5" />;
      case "Star": return <Star className="w-5 h-5" />;
      case "Zap": return <Zap className="w-5 h-5" />;
      case "Check": return <Check className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  // If the token label indicates a specific mission (e.g. "Mission: Bake a Cake"),
  // we prefer that over the generic title, or we can treat the generic title as the subtitle.
  // However, for consistency, let's follow the logic:
  // If it's a mission token, title is likely redundant or we want the mission name.
  const displayTitle = token.label.startsWith("Mission:") ? token.label : title;

  // If we swapped the title, and there's no subtitle, maybe we don't show the original title?
  // Or maybe the original title is "Sequencing" and we just replaced it.
  // The prompt implies: Sequencing shows “Mission: Bake a Cake”.

  return (
    <div className="flex items-start justify-between gap-4 mb-6 bg-white/50 p-4 rounded-xl border border-white shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-3">
        {/* Icon Bubble */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm ${token.bubbleClass}`}>
          <Icon />
        </div>

        {/* Title / Subtitle */}
        <div>
          <h1 className="text-xl font-bold text-brightboost-navy leading-tight">
            {displayTitle}
          </h1>
          {subtitle && <p className="text-sm text-slate-500 font-medium">{subtitle}</p>}
        </div>
      </div>

      {/* Chip */}
      <div className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${modeToken.chipClass}`}>
        {modeLabel || modeToken.label}
      </div>
    </div>
  );
}
