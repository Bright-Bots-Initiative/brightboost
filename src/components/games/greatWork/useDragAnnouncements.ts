import type { Active, Announcements } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import { useRef } from "react";

/** Keep library-generated drag announcements localized, without exposing internal IDs. */
export function useDragAnnouncements(): Announcements {
  const { t } = useTranslation();
  const pickedLabel = useRef<string | null>(null);
  const label = (active: Active): string => {
    const data = active.data.current;
    if (data?.kind === "part") {
      const choice = data.choice;
      return t(
        choice?.kind === "glyph"
          ? `games.greatWork.glyph.${choice.glyph}`
          : `games.greatWork.parts.${choice?.kind}`,
      );
    }
    if (data?.kind === "instruction")
      return t(`games.greatWork.instructions.${data.instruction}`);
    if (data?.kind === "tape")
      return t("games.greatWork.timeline.slotLabel", {
        arm: data.armId,
        number: data.index + 1,
        instruction: data.instruction
          ? t(`games.greatWork.instructions.${data.instruction}`)
          : t("games.greatWork.timeline.empty"),
      });
    return t("games.greatWork.drag.item");
  };
  return {
    onDragStart: ({ active }) => {
      pickedLabel.current = label(active);
      return t("games.greatWork.drag.picked", { item: pickedLabel.current });
    },
    onDragOver: ({ over }) =>
      t(`games.greatWork.drag.${over ? "over" : "away"}`),
    // Releasing an invalid placement is not the same as successfully placing it.
    onDragEnd: ({ active }) => {
      const item = pickedLabel.current ?? label(active);
      pickedLabel.current = null;
      return t("games.greatWork.drag.released", { item });
    },
    onDragCancel: ({ active }) => {
      const item = pickedLabel.current ?? label(active);
      pickedLabel.current = null;
      return t("games.greatWork.drag.canceled", { item });
    },
  };
}
