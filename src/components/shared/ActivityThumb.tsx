import React from "react";
import { cn } from "@/lib/utils";
import { ImageKey, ILLUSTRATIONS } from "@/theme/activityIllustrations";

type ActivityThumbProps = {
  imageKey: ImageKey;
  variant: "story" | "quiz" | "game" | "module" | "mission";
  className?: string;
};

export const ActivityThumb: React.FC<ActivityThumbProps> = ({
  imageKey,
  variant,
  className,
}) => {
  const Illustration = ILLUSTRATIONS[imageKey];

  if (!Illustration) return null;

  const getVariantClass = (v: typeof variant) => {
    switch (v) {
      case "module":
        return "bg-brightboost-lightblue/25 ring-1 ring-brightboost-blue/20 text-brightboost-navy";
      case "story":
        return "bg-brightboost-lightblue/20 ring-1 ring-brightboost-blue/15 text-brightboost-navy";
      case "quiz":
        return "bg-brightboost-yellow/15 ring-1 ring-brightboost-yellow/20 text-brightboost-navy";
      case "game":
        return "bg-brightboost-green/15 ring-1 ring-brightboost-green/20 text-brightboost-navy";
      case "mission":
        // Fallback or specific mission styling. Using a neutral navy tint.
        return "bg-brightboost-navy/5 ring-1 ring-brightboost-navy/10 text-brightboost-navy";
      default:
        return "bg-slate-100 ring-1 ring-slate-200 text-slate-700";
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg overflow-hidden p-2",
        getVariantClass(variant),
        className,
      )}
    >
      <Illustration className="w-full h-full" />
    </div>
  );
};
