/**
 * Learner detail — full progress, enrollments, and milestones for one learner.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import Card, { CardBody, CardHeader } from "../shared/Card";
import { StatusPill } from "../FacilitatorLayout";

interface LearnerDetailData {
  user: { id: string; name: string | null; email: string | null; ageBand: string | null; birthYear: number | null };
  enrollments: Array<{
    id: string;
    enrolledAt: string;
    status: string;
    cohort: { id: string; name: string; status: string };
  }>;
  milestones: Array<{ moduleSlug: string; trackSlug: string; status: string; score: number | null; completedAt: string | null; createdAt: string }>;
}

export default function LearnerDetail() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState<LearnerDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/pathways/facilitator/learners/${userId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-center py-20 text-slate-600 dark:text-slate-400">{t("pathways.common.loading")}</div>;
  if (!data) return (
    <div className="text-center py-20">
      <p className="text-slate-600 dark:text-slate-400">{t("pathways.facilitator.learnerDetail.notFound")}</p>
      <button
        onClick={() => navigate("/pathways/facilitator/learners")}
        className="mt-3 text-sm text-indigo-700 dark:text-indigo-400 hover:underline"
      >
        {t("pathways.facilitator.learnerDetail.backToLearners")}
      </button>
    </div>
  );

  const completed = data.milestones.filter((m) => m.status === "completed");
  const avgScore = completed.length > 0
    ? Math.round(completed.reduce((s, m) => s + (m.score ?? 0), 0) / completed.length)
    : 0;

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/pathways/facilitator/learners")}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" /> {t("pathways.facilitator.learnerDetail.backToLearners")}
      </button>

      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-2xl font-bold">
              {(data.user.name ?? "?")[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{data.user.name ?? t("pathways.profile.learner")}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">{data.user.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 capitalize">
                {t("pathways.facilitator.learnerDetail.band")}: {data.user.ageBand ?? "—"}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <SimpleStat
          label={t("pathways.facilitator.learnerDetail.modulesCompleted")}
          value={completed.length}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />}
        />
        <SimpleStat
          label={t("pathways.facilitator.learnerDetail.inProgress")}
          value={data.milestones.filter((m) => m.status === "in_progress").length}
          icon={<Clock className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />}
        />
        <SimpleStat
          label={t("pathways.facilitator.learnerDetail.avgScore")}
          value={`${avgScore}%`}
          icon={<CheckCircle2 className="w-4 h-4 text-amber-700 dark:text-amber-400" />}
        />
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.learnerDetail.cohorts")}
          </h3>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2">
            {data.enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700/50">
                <Link
                  to={`/pathways/facilitator/cohorts/${e.cohort.id}`}
                  className="text-sm font-medium text-slate-900 dark:text-slate-100 hover:text-indigo-700 dark:hover:text-indigo-300"
                >
                  {e.cohort.name}
                </Link>
                <div className="flex items-center gap-2">
                  <StatusPill status={e.cohort.status} />
                  <span className="text-xs text-slate-600 dark:text-slate-500">
                    {t("pathways.facilitator.learnerDetail.enrolledOn", { date: new Date(e.enrolledAt).toLocaleDateString() })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-slate-200">
            {t("pathways.facilitator.learnerDetail.milestones")}
          </h3>
        </CardHeader>
        <CardBody>
          {data.milestones.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("pathways.facilitator.learnerDetail.noMilestones")}
            </p>
          ) : (
            <ul className="space-y-1">
              {data.milestones.map((m, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 p-2 rounded text-sm"
                >
                  {m.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  ) : m.status === "in_progress" ? (
                    <Clock className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />
                  )}
                  <span className="flex-1 text-slate-800 dark:text-slate-300">
                    {t(`pathways.tracks.modules.${m.moduleSlug}.name`, m.moduleSlug)}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-500">
                    {m.score !== null ? `${m.score}%` : ""}
                  </span>
                  <span className="text-xs text-slate-500 w-24 text-right">
                    {m.completedAt ? new Date(m.completedAt).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function SimpleStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 font-medium">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
