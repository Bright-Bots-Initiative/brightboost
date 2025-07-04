import React, { useEffect } from "react";
import useLocalStorage from "../../hooks/useLocalStorage";
import { track } from "../../lib/analytics";
import "./Quest.css";

interface QuestPlaceholderProps {
  id: number;
}

const QuestPlaceholder: React.FC<QuestPlaceholderProps> = ({ id }) => {
  const [questProgress] = useLocalStorage<string | null>(
    `quest${id - 1}`,
    null,
  );

  const previousQuestIncomplete = id > 0 && questProgress !== "done";

  useEffect(() => {
    track({ kind: "quest_start", questId: id.toString() });
  }, [id]);

  return (
    <div className="quest-container">
      <h1>Quest {id}</h1>
      <p>This is a placeholder for Quest {id}</p>

      {previousQuestIncomplete && (
        <div className="quest-locked-overlay">
          <div className="lock-banner">
            🔒 <strong>Locked</strong>
            <p>Complete Quest {id - 1} to unlock this quest</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestPlaceholder;
