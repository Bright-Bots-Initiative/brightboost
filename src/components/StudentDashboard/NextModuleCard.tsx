import { useTranslation } from "react-i18next";

interface NextModule {
  title: string;
  status: string;
  dueDate: string;
  lessonId: string;
}

interface NextModuleCardProps {
  module: NextModule | null;
}

const NextModuleCard = ({ module }: NextModuleCardProps) => {
  const { t } = useTranslation();

  if (!module) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-4">
        <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
          {t("stem1.nextModule")}
        </h2>
        <p className="text-sm text-gray-500">
          {t("stem1.noNextModule")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
        {t("stem1.nextModule")}
      </h2>
      <p className="text-base font-medium text-gray-800">{module.title}</p>
      <p className="text-sm text-gray-600 mt-1">
        {t("stem1.status")}: {module.status}
      </p>
      <p className="text-sm text-gray-600">
        {t("stem1.due")}: {module.dueDate}
      </p>
    </div>
  );
};

export default NextModuleCard;
