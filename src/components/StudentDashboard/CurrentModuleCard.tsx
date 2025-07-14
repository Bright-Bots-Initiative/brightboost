import { useTranslation } from "react-i18next";
interface CurrentModule {
  title: string;
  status: string;
  dueDate: string;
  lessonId: string;
}

interface CurrentModuleCardProps {
  module: CurrentModule | null;
}

const CurrentModuleCard = ({ module }: CurrentModuleCardProps) => {
  const { t } = useTranslation();

  if (!module) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
          {t("dashboard.currentModule")}
        </h2>
        <p className="text-sm text-gray-500">
          {t("dashboard.noCurrentModule")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
        {t("dashboard.currentModule")}
      </h2>
      <p className="text-base font-medium text-gray-800">{module.title}</p>
      <p className="text-sm text-gray-600 mt-1">
        {t("dashboard.modulestatus")}: {module.status}
      </p>
      <p className="text-sm text-gray-600">
        {t("dashboard.due")}: {module.dueDate}
      </p>
    </div>
  );
};

export default CurrentModuleCard;
