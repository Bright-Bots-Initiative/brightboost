import Stem1QuestCard from "./Stem1QuestCard";

export type QuestProgress = {
  title: string;
  status: "Not Started" | "In Progress" | "Complete";
  dueDate?: string;
}

interface ModuleLadderProps {
  quests: QuestProgress[];
}

const ModuleLadder: React.FC<ModuleLadderProps> = ({ quests }) => {
  return (
    <div className="flex flex-col items-start space-y-4">
      {quests.map((quest, index) => (
        <Stem1QuestCard
          key={index}
          quest={quest}
          showConnector={index < quests.length - 1}
        />
      ))}
    </div>
  );
};

export default ModuleLadder;
