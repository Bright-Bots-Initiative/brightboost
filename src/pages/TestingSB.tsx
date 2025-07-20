// src/pages/TestingSB.tsx
import React from "react";
import { useApi } from "../services/api";
import { Button } from "@/components/ui/button"; // or wherever your Button is defined

const TestingSB = () => {
  const api = useApi();

  const handleIncrement = () => {
    api.get("api/increment-streak");
  };

  const handleBreak = () => {
    api.get("api/break-streak");
  };

  const handleGetInfo = async () => {
    const progress = await api.get("api/get-progress");
    console.log(progress);
  };

  const handleAddBadge = () => {
    const badge = "ABC";
    api.post("api/add-badge", { badge });
  };

  return (
    <div className="flex flex-col space-y-4">
      <Button onClick={handleIncrement}>Increment Streak</Button>
      <Button onClick={handleBreak}>Break Streak</Button>
      <Button onClick={handleGetInfo}>Get Info Streak</Button>
      <Button onClick={handleAddBadge}>Add Badge</Button>
    </div>
  );
};

export default TestingSB;
