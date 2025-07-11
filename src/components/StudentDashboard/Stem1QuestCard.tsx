interface Stem1Quest {
  title: string;
  status: "Not Started" | "In Progress" | "Complete";
  dueDate?: string;
}

interface Stem1QuestCardProps {
  quest: Stem1Quest;
  showConnector: boolean;
}

const Stem1QuestCard: React.FC<Stem1QuestCardProps> = ({ quest}) => {
  return (
    <div className="relative flex items-stretch space-x-4">
      {/* Left ladder line + dot */}
      <div className="flex flex-col items-center justify-center">
        <div className="flex-grow w-px bg-gray-300" />

        <div
          className={`w-4 h-4 rounded-full z-10 border-2 my-1 ${
            quest.status === "Complete"
              ? "bg-green-400 border-green-600 animate-pulse"
              : quest.status === "In Progress"
              ? "bg-yellow-300 border-yellow-500 animate-pulse"
              : "bg-white border-gray-400"
          }`}
        />
        <div className = "flex-grow w-px bg-gray-300" />
        </div>
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md p-4 flex-1">
        <h2 className="text-base font-semibold text-brightboost-navy mb-1">
          {quest.title}
        </h2>
        <p className="text-sm text-gray-600">Status: {quest.status}</p>
        {quest.dueDate && (
          <p className="text-sm text-gray-600">Due: {quest.dueDate}</p>
        )}
      </div>
    </div>
  );
};

export default Stem1QuestCard;
