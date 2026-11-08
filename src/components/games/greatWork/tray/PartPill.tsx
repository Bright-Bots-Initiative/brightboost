import { useDraggable } from "@dnd-kit/core";
import { useTranslation } from "react-i18next";
import type { TrayItem } from "./trayCatalog";
export function PartPill({
  item,
  selected,
  disabled,
  onChoose,
}: {
  item: TrayItem;
  selected: boolean;
  disabled: boolean;
  onChoose(): void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `part:${item.id}`,
    data: { kind: "part", choice: item.choice },
    attributes: { roleDescription: t("games.greatWork.drag.partRole") },
    disabled,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      disabled={disabled}
      className={`gw-part-pill${selected ? " is-selected" : ""}${isDragging ? " is-dragging" : ""}`}
      aria-pressed={selected}
      title={t(`games.greatWork.${item.hintKey}`)}
      onClick={onChoose}
    >
      <span className="gw-part-icon" aria-hidden="true">
        {item.icon}
      </span>
      <span>{t(`games.greatWork.${item.key}`)}</span>
    </button>
  );
}
