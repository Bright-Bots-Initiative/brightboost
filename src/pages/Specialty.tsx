import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useSpecialty } from "@/contexts/SpecialtyContext";
import { SpecialtyExperience } from "@/components/specialty/SpecialtyExperience";
export default function Specialty() {
  const { t } = useTranslation();
  const { status, data, choose, refresh } = useSpecialty();
  if (status === "error")
    return (
      <div className="p-6" role="alert">
        <p>{t("specialty.loadError")}</p>
        <Button onClick={refresh}>{t("specialty.retry")}</Button>
      </div>
    );
  if (status === "loading" || !data)
    return (
      <p className="p-6" role="status">
        {t("specialty.loading")}
      </p>
    );
  return <SpecialtyExperience data={data} onChoose={choose} />;
}
