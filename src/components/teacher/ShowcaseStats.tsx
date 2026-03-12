// src/components/teacher/ShowcaseStats.tsx
import { useEffect, useState } from "react";
import { useApi } from "../../services/api";
import { Users, BookOpen, TrendingUp } from "lucide-react";

interface StatsData {
  totalStudents: number;
  activitiesCompleted: number;
  avgPreScore: number | null;
  avgPostScore: number | null;
}

interface ShowcaseStatsProps {
  staticData?: StatsData;
}

export default function ShowcaseStats({ staticData }: ShowcaseStatsProps = {}) {
  const api = useApi();
  const [stats, setStats] = useState<StatsData | null>(staticData ?? null);

  useEffect(() => {
    if (staticData) return; // skip fetch when static data provided
    (async () => {
      try {
        const result = await api.get("/teacher/reports/impact");
        setStats(result);
      } catch {
        // silently fail for showcase
      }
    })();
  }, [api, staticData]);

  if (!stats) return null;

  const improvement =
    stats.avgPreScore && stats.avgPostScore
      ? `+${(stats.avgPostScore - stats.avgPreScore).toFixed(1)}`
      : null;

  return (
    <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
      <div className="text-center">
        <Users className="w-12 h-12 mx-auto mb-3 text-blue-400" />
        <p className="text-6xl font-bold text-white">{stats.totalStudents}</p>
        <p className="text-xl text-blue-200 mt-2">Students</p>
      </div>
      <div className="text-center">
        <BookOpen className="w-12 h-12 mx-auto mb-3 text-green-400" />
        <p className="text-6xl font-bold text-white">
          {stats.activitiesCompleted}
        </p>
        <p className="text-xl text-green-200 mt-2">Activities Completed</p>
      </div>
      <div className="text-center">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 text-purple-400" />
        <p className="text-6xl font-bold text-white">
          {improvement ?? "—"}
        </p>
        <p className="text-xl text-purple-200 mt-2">Confidence Growth</p>
      </div>
    </div>
  );
}
