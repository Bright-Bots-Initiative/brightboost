import { Play } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Stem1Quest {
  title: string;
  status: "Not Started" | "In Progress" | "Complete";
  dueDate?: string;
}

interface Stem1QuestCardProps {
  quest: Stem1Quest;
  showConnector: boolean;
}

const Stem1QuestCard: React.FC<Stem1QuestCardProps> = ({ quest }) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex items-stretch space-x-4">
      {/* Left ladder line + dot */}
      <div className="flex flex-col items-center justify-center">
        <div className="flex-grow w-px bg-gray-300" />

        <div
          className={`w-5 h-5 flex items-center justify-center rounded-full z-10 border-2 text-xs font-bold my-1 ${
            quest.status === "Complete"
              ? "bg-green-400 border-green-600 text-slate animate-pulse"
              : quest.status === "In Progress"
                ? "bg-yellow-300 border-yellow-500 text-yellow-900 animate-pulse"
                : "bg-white border-gray-400 text-gray-400"
          }`}
        >
          {quest.status === "Complete" && "✓"}
          {quest.status === "In Progress" && (
            <Play className="w-3 h-3 fill-current text-slate" />
          )}
        </div>

        <div className="flex-grow w-px bg-gray-300" />
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md p-4 flex-1">
        <h2 className="text-base font-semibold text-brightboost-navy mb-1">
          {quest.title}
        </h2>
        <p className="text-sm text-gray-600">
          {t("stem1.status")}: {quest.status}
        </p>
        {quest.dueDate && (
          <p className="text-sm text-gray-600">
            {t("stem1.due")}: {quest.dueDate}
          </p>
        )}
      </div>
    </div>
  );
};

export default Stem1QuestCard;
