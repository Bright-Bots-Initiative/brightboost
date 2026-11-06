import { useTranslation } from "react-i18next";
import { isMirrorOf } from "@shared/greatwork-engine";
import type { Molecule, RunResult } from "@shared/greatwork-engine";
import { classifyRun } from "../greatWorkView";
import { MirrorCompare } from "./MirrorCompare";
export function RunNote({
  result,
  target,
  invalid,
  showMetrics,
}: {
  result: RunResult | null;
  target: { molecule: Molecule; count: number } | null;
  invalid: boolean;
  showMetrics: boolean;
}) {
  const { t } = useTranslation();
  const moleculeName = (molecule: Molecule | undefined) =>
    molecule?.atoms
      .map((a) => t(`games.greatWork.elements.${a.element}`))
      .join(" + ") ?? "";
  const kind = classifyRun(result, target);
  const reflected =
    target && result?.mirrored
      ? result.produced.find((p) => isMirrorOf(p.molecule, target.molecule))
      : undefined;
  return (
    <section
      className={`gw-run-note gw-note-${kind}`}
      aria-label={t("games.greatWork.feedback.title")}
    >
      <p role="status" aria-live="polite">
        {t(`games.greatWork.run.${invalid ? "checkParts" : kind}`, {
          product: moleculeName(result?.produced[0]?.molecule),
          target: moleculeName(target?.molecule),
        })}
      </p>
      {reflected && target && (
        <MirrorCompare target={target.molecule} product={reflected.molecule} />
      )}
      {!!result?.produced.length && (
        <ul className="gw-products">
          {result.produced.map((product) => (
            <li key={product.canonical}>
              <span>{moleculeName(product.molecule)}</span>
              <b>
                {t("games.greatWork.feedback.madeCount", {
                  count: product.count,
                })}
              </b>
            </li>
          ))}
        </ul>
      )}
      {showMetrics && result && (
        <details>
          <summary>{t("games.greatWork.feedback.details")}</summary>
          <dl className="gw-metrics">
            <div>
              <dt>{t("games.greatWork.feedback.cycles")}</dt>
              <dd>{result.cycles}</dd>
            </div>
            <div>
              <dt>{t("games.greatWork.feedback.cost")}</dt>
              <dd>{result.cost}</dd>
            </div>
            <div>
              <dt>{t("games.greatWork.feedback.area")}</dt>
              <dd>{result.area}</dd>
            </div>
          </dl>
        </details>
      )}
    </section>
  );
}
