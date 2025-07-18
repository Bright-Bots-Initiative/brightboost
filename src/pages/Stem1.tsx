import { useNavigate } from "react-router-dom";
import ModuleLadder from "../components/StudentDashboard/ModuleLadder";
import { QuestProgress } from "../components/StudentDashboard/ModuleLadder";

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

const renderQuestButton = (status: string) => {
  if (status === "Complete") {
    return (
      <button className="mt-3 bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg w-full">
        Review Quest
      </button>
    );
  } else if (status === "In Progress") {
    return (
      <button className="mt-3 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg w-full">
        Continue Quest
      </button>
    );
  } else {
    return (
      <button className="mt-3 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg w-full">
        Start Quest
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

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-white to-brightboost-lightblue">
      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-bold text-brightboost-navy mb-2">
          Welcome to STEM 1!
        </h1>
        <p className="text-lg text-brightboost-blue">
          Ready to be a STEM Explorer?
        </p>
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
      <div className={`bg-white rounded-xl shadow-md p-4 ${
            isPastDue(stem1Quests[0].status, stem1Quests[0].dueDate ?? "") ? "border border-red-400" : "" 
            }`}
        >
            {isPastDue(stem1Quests[0].status, stem1Quests[0].dueDate ?? "") && (
            <p className="text-xs text-red-500 font-semibold mt-1">Past Due</p>
            )}
        <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
          {stem1Quests[0].title}
        </h2>
        <p className="text-sm text-gray-600 mb-1">Status: {stem1Quests[0].status}</p>
        <p className="text-sm text-gray-600">Due: {stem1Quests[0].dueDate}</p>
        {renderQuestButton(stem1Quests[0].status)}
      </div>
    </div>

    {/* Card 2 */}
    <div className="row-start-1 col-start-2">
      <div className={`bg-white rounded-xl shadow-md p-4 ${
            isPastDue(stem1Quests[1].status, stem1Quests[1].dueDate ?? "") ? "border border-red-400" : "" 
            }`}
        >
            {isPastDue(stem1Quests[1].status, stem1Quests[1].dueDate ?? "") && (
            <p className="text-xs text-red-500 font-semibold mt-1">Past Due</p>
            )}
        <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
          {stem1Quests[1].title}
        </h2>
        <p className="text-sm text-gray-600 mb-1">Status: {stem1Quests[1].status}</p>
        <p className="text-sm text-gray-600">Due: {stem1Quests[1].dueDate}</p>
        {renderQuestButton(stem1Quests[1].status)}
      </div>
    </div>

    {/* Card 3 (staggered below) */}
    <div className="col-span-2 flex justify-center row-start-2">
        <div className = "w-1/2">
      <div className={`bg-white rounded-xl shadow-md p-4 ${
            isPastDue(stem1Quests[2].status, stem1Quests[2].dueDate ?? "") ? "border border-red-400" : "" 
            }`}
        >
            {isPastDue(stem1Quests[2].status, stem1Quests[2].dueDate ?? "") && (
            <p className="text-xs text-red-500 font-semibold mt-1">Past Due</p>
            )}
        <h2 className="text-lg font-semibold text-brightboost-navy mb-2">
          {stem1Quests[2].title}
        </h2>
        <p className="text-sm text-gray-600 mb-1">Status: {stem1Quests[2].status}</p>
        <p className="text-sm text-gray-600">Due: {stem1Quests[2].dueDate}</p>
        {renderQuestButton(stem1Quests[2].status)}
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
    ⬅ Back to Dashboard
  </button>
</div>
</div>


  )
};

export default Stem1Page;
