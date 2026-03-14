import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../services/api";
import { CheckCircle2, ChevronRight, Loader2, AlertTriangle } from "lucide-react";

interface Question {
  id: string;
  prompt: string;
  choices: string[];
  skillTag: string;
}

interface BenchmarkData {
  assignmentId: string;
  kind: string;
  templateTitle: string;
  questions: Question[];
}

const StudentBenchmark: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();

  const [data, setData] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; totalQuestions: number } | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!assignmentId) return;
    api
      .get(`/student/benchmarks/${assignmentId}`)
      .then((d: BenchmarkData) => setData(d))
      .catch((err: any) => {
        if (err?.status === 409) {
          setError(t("benchmark.student.alreadyCompleted"));
        } else if (err?.status === 403) {
          setError(err.message || t("benchmark.student.notAllowed"));
        } else {
          setError(t("benchmark.student.loadError"));
        }
      })
      .finally(() => setLoading(false));
  }, [assignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      const answers = data.questions.map((q) => ({
        questionId: q.id,
        selectedIndex: selected[q.id] ?? -1,
      }));
      const timeSpentS = Math.round((Date.now() - startTime) / 1000);
      const res = await api.post(`/student/benchmarks/${assignmentId}/submit`, {
        answers,
        timeSpentS,
      });
      setResult({ score: res.score, totalQuestions: res.totalQuestions });
    } catch {
      setError(t("benchmark.student.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-brightboost-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
        <p className="text-lg text-slate-700 mb-4">{error}</p>
        <button
          onClick={() => navigate("/student/dashboard")}
          className="px-4 py-2 bg-brightboost-blue text-white rounded-lg hover:bg-brightboost-navy"
        >
          {t("benchmark.student.backToDashboard")}
        </button>
      </div>
    );
  }

  if (result) {
    const pct = Math.round((result.score / result.totalQuestions) * 100);
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("benchmark.student.allDone")}</h2>
        <p className="text-4xl font-bold text-brightboost-navy mb-1">
          {result.score} / {result.totalQuestions}
        </p>
        <p className="text-lg text-slate-500 mb-6">{pct}%</p>
        <button
          onClick={() => navigate("/student/dashboard")}
          className="px-6 py-3 bg-brightboost-blue text-white rounded-lg hover:bg-brightboost-navy text-lg"
        >
          {t("benchmark.student.backToDashboard")}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const q = data.questions[current];
  const isLast = current === data.questions.length - 1;
  const allAnswered = data.questions.every((qq) => selected[qq.id] !== undefined);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-brightboost-navy">{data.templateTitle}</h1>
        <p className="text-sm text-slate-500">
          {data.kind === "PRE" ? t("benchmark.student.preLabel") : t("benchmark.student.postLabel")}
          {" · "}
          {t("benchmark.student.questionOf", { current: current + 1, total: data.questions.length })}
        </p>
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-brightboost-blue h-2 rounded-full transition-all"
            style={{ width: `${((current + 1) / data.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <p className="text-lg font-medium text-slate-800 mb-6">{q.prompt}</p>
        <div className="space-y-3">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => setSelected((prev) => ({ ...prev, [q.id]: i }))}
              className={`w-full text-left px-5 py-4 rounded-lg border-2 text-base transition-all ${
                selected[q.id] === i
                  ? "border-brightboost-blue bg-blue-50 font-medium"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2 text-sm text-slate-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-30"
        >
          {t("benchmark.student.prev")}
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {t("benchmark.student.submit")}
          </button>
        ) : (
          <button
            onClick={() => setCurrent((c) => Math.min(data.questions.length - 1, c + 1))}
            className="px-4 py-2 bg-brightboost-blue text-white rounded-lg hover:bg-brightboost-navy flex items-center gap-1"
          >
            {t("benchmark.student.next")} <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default StudentBenchmark;
