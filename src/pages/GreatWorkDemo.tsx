import { useState } from "react";
import { useTranslation } from "react-i18next";
import GreatWorkStudio from "@/components/games/greatWork/GreatWorkStudio";
import { createStudioShelf } from "@/components/games/greatWork/studioShelf";
import DemoErrorBoundary from "@/components/home/DemoErrorBoundary";
import {
  usePublicPageMeta,
  useRenderedLanguage,
} from "@/components/home/publicEntry";

export default function GreatWorkDemo() {
  const { t } = useTranslation();
  const lang = useRenderedLanguage();
  const [shelf] = useState(() => createStudioShelf({ mode: "guest" }));
  usePublicPageMeta(
    `${t("games.greatWork.title", { lng: lang })} · Bright Boost`,
    t("games.greatWork.intro", { lng: lang }),
    lang,
  );

  return (
    <DemoErrorBoundary
      fallback={<p role="alert">{t("home.demo.errorTitle", { lng: lang })}</p>}
    >
      <GreatWorkStudio shelf={shelf} guest />
    </DemoErrorBoundary>
  );
}
