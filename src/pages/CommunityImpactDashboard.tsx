// src/pages/CommunityImpactDashboard.tsx
import { useEffect, useState, useCallback } from "react";
import { useApi } from "../services/api";
import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  BookOpen,
  TrendingUp,
  Download,
  Globe,
  Cpu,
  Heart,
} from "lucide-react";

interface ImpactData {
  totalStudents: number;
  activitiesCompleted: number;
  avgPreScore: number | null;
  avgPostScore: number | null;
  completionByModule: { module: string; completed: number }[];
  activeStudents7d: number;
  totalTimeSpentMinutes: number;
  progressDistribution: {
    notStarted: number;
    inProgress: number;
    completed: number;
  };
}

const PIE_COLORS = ["#94a3b8", "#3b82f6", "#22c55e"];

export default function CommunityImpactDashboard() {
  const api = useApi();
  const { t } = useTranslation();
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await api.get("/teacher/reports/impact");
        setData(result);
      } catch {
        // error toast from useApi
      } finally {
        setLoading(false);
      }
    })();
  }, [api]);

  const handleExportCsv = useCallback(() => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Students", String(data.totalStudents)],
      ["Activities Completed", String(data.activitiesCompleted)],
      ["Avg Pre-Score", String(data.avgPreScore ?? "N/A")],
      ["Avg Post-Score", String(data.avgPostScore ?? "N/A")],
      ["Active Students (7d)", String(data.activeStudents7d)],
      [
        "Total Time (minutes)",
        String(data.totalTimeSpentMinutes),
      ],
      [],
      ["Module", "Completed Activities"],
      ...data.completionByModule.map((m) => [m.module, String(m.completed)]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "brightboost-impact-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  if (loading) {
    return (
      <div className="w-full p-6">
        <div className="h-8 bg-gray-300 animate-pulse w-1/3 mb-4 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.totalStudents === 0) {
    return (
      <div className="w-full p-6 text-center">
        <Globe className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-600">{t("impact.noData")}</h2>
      </div>
    );
  }

  const pieData = [
    { name: "Not Started", value: data.progressDistribution.notStarted },
    { name: "In Progress", value: data.progressDistribution.inProgress },
    { name: "Completed", value: data.progressDistribution.completed },
  ].filter((d) => d.value > 0);

  const totalHours = Math.round(data.totalTimeSpentMinutes / 60);

  return (
    <div className="w-full space-y-6 print:space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start print:block">
        <div>
          <h1 className="text-2xl font-bold text-brightboost-navy">
            {t("impact.title")}
          </h1>
          <p className="text-sm text-gray-500">{t("impact.subtitle")}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("impact.exportPdf")}
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            {t("impact.exportCsv")}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("impact.totalStudents")}</p>
              <p className="text-3xl font-bold text-brightboost-navy">
                {data.totalStudents}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {t("impact.activitiesCompleted")}
              </p>
              <p className="text-3xl font-bold text-brightboost-green">
                {data.activitiesCompleted}
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("impact.avgPreScore")}</p>
              <p className="text-3xl font-bold text-orange-600">
                {data.avgPreScore ?? "—"}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("impact.avgPostScore")}</p>
              <p className="text-3xl font-bold text-purple-600">
                {data.avgPostScore ?? "—"}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bar Chart: Completion by Module */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">
            {t("impact.completionByModule")}
          </h3>
          {data.completionByModule.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.completionByModule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="module"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-12">
              No data yet
            </p>
          )}
        </div>

        {/* Pie Chart: Progress Distribution */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">
            {t("impact.progressDistribution")}
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-12">
              No data yet
            </p>
          )}
        </div>
      </div>

      {/* QLP Alignment Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-brightboost-navy mb-4">
          {t("impact.qlpAlignment")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-800">
                {t("impact.digitalLiteracy")}
              </h4>
            </div>
            <p className="text-3xl font-bold text-blue-700">
              {data.totalStudents > 0
                ? Math.round(
                    (data.progressDistribution.completed /
                      data.totalStudents) *
                      100,
                  )
                : 0}
              %
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {t("impact.digitalLiteracyDesc")}
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-green-800">
                {t("impact.stemReadiness")}
              </h4>
            </div>
            <p className="text-3xl font-bold text-green-700">
              {totalHours} {t("impact.hours")}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {t("impact.stemReadinessDesc")}
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-purple-600" />
              <h4 className="font-semibold text-purple-800">
                {t("impact.communityEngagement")}
              </h4>
            </div>
            <p className="text-3xl font-bold text-purple-700">
              {data.totalStudents} {t("impact.families")}
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {t("impact.communityEngagementDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
