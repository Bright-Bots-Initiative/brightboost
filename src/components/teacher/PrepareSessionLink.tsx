import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

interface PrepareSessionLinkProps {
  /** Selected module slug ("" = nothing selected). */
  slug: string;
  /**
   * Slugs that have prep data (from GET /teacher/prep).
   * null = unknown (still loading or the request failed) — render nothing so
   * a module without prep data can never dead-end on the 404 error card.
   */
  prepSlugs: Set<string> | null;
}

const PrepareSessionLink = ({ slug, prepSlugs }: PrepareSessionLinkProps) => {
  const { t } = useTranslation();
  if (!slug || !prepSlugs || !prepSlugs.has(slug)) return null;
  return (
    <Link
      to={`/teacher/prep/${slug}`}
      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
      target="_blank"
    >
      {t("teacher.classDetail.prepareSession")} &rarr;
    </Link>
  );
};

export default PrepareSessionLink;
