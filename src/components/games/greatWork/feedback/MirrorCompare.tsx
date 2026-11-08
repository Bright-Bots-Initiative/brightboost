import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Molecule } from "@shared/greatwork-engine";
import { drawMolecule } from "../board/drawBoard";
function MoleculeView({
  molecule,
  label,
}: {
  molecule: Molecule;
  label: string;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (ctx) drawMolecule(ctx, molecule);
  }, [molecule]);
  return (
    <figure>
      <figcaption>{label}</figcaption>
      <canvas
        ref={ref}
        width={240}
        height={150}
        role="img"
        aria-label={label}
      />
      <p>
        {molecule.atoms
          .map((a) => t(`games.greatWork.elements.${a.element}`))
          .join(" · ")}
      </p>
      <small>
        {t("games.greatWork.feedback.connections", {
          count: molecule.bonds.length,
        })}
      </small>
    </figure>
  );
}
export function MirrorCompare({
  target,
  product,
}: {
  target: Molecule;
  product: Molecule;
}) {
  const { t } = useTranslation();
  return (
    <div className="gw-mirror">
      <MoleculeView
        molecule={target}
        label={t("games.greatWork.feedback.target")}
      />
      <MoleculeView
        molecule={product}
        label={t("games.greatWork.feedback.product")}
      />
    </div>
  );
}
