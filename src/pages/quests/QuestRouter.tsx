import React from "react";
import { useParams, Navigate } from "react-router-dom";
import QuestPlaceholder from "./QuestPlaceholder";

const QuestRouter: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const questId = id ? parseInt(id, 10) : NaN;
  if (isNaN(questId) || questId < 0 || questId > 10) {
    return <Navigate to="/quest/0" replace />;
  }

  return <QuestPlaceholder id={questId} />;
};

export default QuestRouter;
