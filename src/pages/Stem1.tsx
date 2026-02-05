import { useNavigate } from "react-router-dom";
import ModuleLadder from "../components/StudentDashboard/ModuleLadder";
import { QuestProgress } from "../components/StudentDashboard/ModuleLadder";
import { useTranslation } from "react-i18next";
import LanguageToggle from "../components/LanguageToggle";

const stem1Quests: QuestProgress[] = [
  {
    title: "Quest 1",
    status: "Complete",
    dueDate: "July 15, 2025",
  },
  {
    title: "Quest 2",
    status: "In Progress",
    dueDate: "July 16, 2025",
  },
  {
    title: "Quest 3",
    status: "Not Started",
    dueDate: "July 22, 2025",
  },
] as const as QuestProgress[];

const renderQuestButton = (
  quest: QuestProgress,
  t: (key: string) => string,
) => {
  const { status, title } = quest;

  if (status === "Complete") {
    const text = t("stem1.reviewQuest");
    return (
      <button
        className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg w-full"
        aria-label={`${text}: ${title}`}
      >
        {text}
      </button>
    );
  } else if (status === "In Progress") {
    const text = t("stem1.continueQuest");
    return (
      <button
        className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg w-full"
        aria-label={`${text}: ${title}`}
      >
        {text}
      </button>
    );
  } else {
    const text = t("stem1.startQuest");
    return (
      <button
        className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg w-full"
        aria-label={`${text}: ${title}`}
      >
        {text}
      </button>
    );
  }
};

const isPastDue = (status: string, dueDate: string) => {
  if (status === "Complete" || !dueDate) return false;
  const year = new Date().getFullYear();
  const parsed = new Date(`${dueDate}, ${year} 23:59:59`);
  return parsed < new Date();
};

const Stem1Page = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-white to-brightboost-lightblue">
      {/* Language toggle */}
      <div className="flex justify-end mb-4 max-w-4xl mx-auto">
        <LanguageToggle />
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-bold text-brightboost-navy mb-2">
          {t("stem1.title")}
        </h1>
        <p className="text-lg text-brightboost-blue">{t("stem1.subtitle")}</p>
      </div>

      {/* Module Ladder */}
      <div className="max-w-6xl mx-auto grid grid-cols-4 gap-6 items-start">
        {/* Module Ladder column */}
        <div className="col-span-1 space-y-8">
          <ModuleLadder quests={stem1Quests} />
        </div>

        {/* Quest cards, staggered */}
        <div className="col-span-3 grid grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="row-start-1 col-start-1">
            <div
              className={`bg-white rounded-xl shadow-md p-4 ${
                isPastDue(stem1Quests[0].status, stem1Quests[0].dueDate ?? "")
                  ? "border border-red-400"
                  : ""
              }`}
            >
              {isPastDue(
                stem1Quests[0].status,
                stem1Quests[0].dueDate ?? "",
              ) && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  {t("stem1.pastDue")}
                </p>
              )}
              <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
                {stem1Quests[0].title}
              </h2>
              <p className="text-sm text-gray-600 mb-1">
                {t("stem1.status")}: {stem1Quests[0].status}
              </p>
              <p className="text-sm text-gray-600">
                {t("stem1.due")}: {stem1Quests[0].dueDate}
              </p>
              {renderQuestButton(stem1Quests[0], t)}
            </div>
          </div>

          {/* Card 2 */}
          <div className="row-start-1 col-start-2">
            <div
              className={`bg-white rounded-xl shadow-md p-4 ${
                isPastDue(stem1Quests[1].status, stem1Quests[1].dueDate ?? "")
                  ? "border border-red-400"
                  : ""
              }`}
            >
              {isPastDue(
                stem1Quests[1].status,
                stem1Quests[1].dueDate ?? "",
              ) && (
                <p className="text-xs text-red-500 font-semibold mt-1">
                  {t("stem1.pastDue")}
                </p>
              )}
              <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
                {stem1Quests[1].title}
              </h2>
              <p className="text-sm text-gray-600 mb-1">
                {t("stem1.status")}: {stem1Quests[1].status}
              </p>
              <p className="text-sm text-gray-600">
                {t("stem1.due")}: {stem1Quests[1].dueDate}
              </p>
              {renderQuestButton(stem1Quests[1], t)}
            </div>
          </div>

          {/* Card 3 (staggered below) */}
          <div className="col-span-2 flex justify-center row-start-2">
            <div className="w-1/2">
              <div
                className={`bg-white rounded-xl shadow-md p-4 ${
                  isPastDue(stem1Quests[2].status, stem1Quests[2].dueDate ?? "")
                    ? "border border-red-400"
                    : ""
                }`}
              >
                {isPastDue(
                  stem1Quests[2].status,
                  stem1Quests[2].dueDate ?? "",
                ) && (
                  <p className="text-xs text-red-500 font-semibold mt-1">
                    {t("stem1.pastDue")}
                  </p>
                )}
                <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
                  {stem1Quests[2].title}
                </h2>
                <p className="text-sm text-gray-600 mb-1">
                  {t("stem1.status")}: {stem1Quests[2].status}
                </p>
                <p className="text-sm text-gray-600">
                  {t("stem1.due")}: {stem1Quests[2].dueDate}
                </p>
              {renderQuestButton(stem1Quests[2], t)}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-12 flex justify-center">
        <button
          onClick={() => navigate("/student/dashboard")}
          className="bg-brightboost-blue hover:bg-brightboost-blue/80 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          {t("stem1.back")}
        </button>
      </div>
    </div>
  );
};

export default Stem1Page;
