import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ELEMENTS } from "@shared/greatwork-engine";
import type { ElementId } from "@shared/greatwork-engine";
import type {
  GreatWorkBandConfig,
  PartAllowList,
} from "../greatWorkBandConfig";
import type { PartChoice } from "../greatWorkModel";
import { choiceKey, trayCatalog } from "./trayCatalog";
import { PartPill } from "./PartPill";
export interface PartsTrayProps {
  config: GreatWorkBandConfig;
  allowList?: PartAllowList;
  selected: PartChoice | null;
  disabled?: boolean;
  onChoose(choice: PartChoice): void;
}
export function PartsTray({
  config,
  allowList,
  selected,
  disabled = false,
  onChoose,
}: PartsTrayProps) {
  const { t } = useTranslation();
  const k = (s: string) => t(`games.greatWork.${s}`);
  const [element, setElement] = useState<ElementId>("fire");
  const entries = trayCatalog(config, allowList, element);
  return (
    <aside className="gw-tray" aria-labelledby="gw-tray-title">
      <div className="gw-section-heading">
        <span className="gw-step-dot" aria-hidden="true">
          1
        </span>
        <h2 id="gw-tray-title">{k("tray.title")}</h2>
      </div>
      <p>{k("tray.help")}</p>
      {config.parts.includes("dispenser") &&
        (!allowList?.parts || allowList.parts.includes("dispenser")) && (
          <label className="gw-element-select">
            {k("tray.element")}
            <select
              value={element}
              onChange={(e) => {
                const next = e.target.value as ElementId;
                setElement(next);
                if (selected?.kind === "dispenser")
                  onChoose({ kind: "dispenser", element: next });
              }}
              disabled={disabled}
            >
              {(Object.keys(ELEMENTS) as ElementId[]).map((id) => (
                <option key={id} value={id}>
                  {ELEMENTS[id].icon} {k(`elements.${id}`)}
                </option>
              ))}
            </select>
          </label>
        )}
      <div className="gw-part-grid">
        {entries
          .filter((e) => e.group === "parts")
          .map((item) => (
            <PartPill
              key={item.id}
              item={item}
              selected={!!selected && choiceKey(selected) === item.id}
              disabled={disabled}
              onChoose={() => onChoose(item.choice)}
            />
          ))}
      </div>
      <details className="gw-glyph-tray">
        <summary>{k("tray.glyphs")}</summary>
        <div className="gw-part-grid">
          {entries
            .filter((e) => e.group === "glyphs")
            .map((item) => (
              <PartPill
                key={item.id}
                item={item}
                selected={!!selected && choiceKey(selected) === item.id}
                disabled={disabled}
                onChoose={() => onChoose(item.choice)}
              />
            ))}
        </div>
      </details>
      {selected && (
        <p className="gw-part-help">
          {k(
            entries.find((e) => choiceKey(selected) === e.id)?.hintKey ??
              "tray.help",
          )}
        </p>
      )}
    </aside>
  );
}
