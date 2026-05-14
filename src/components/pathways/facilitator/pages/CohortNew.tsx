/**
 * Create Cohort page — facilitator builds a new cohort.
 *
 * On submit: POST /api/pathways/cohorts → redirect to detail page.
 * Created cohorts are "draft" status by default; facilitator promotes
 * to "active" from the detail page.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import { ArrowLeft } from "lucide-react";
import Card, { CardBody } from "../shared/Card";

const ALL_TRACKS = PATHWAY_TRACKS.filter((t) => t.status === "active");

export default function CohortNew() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [sitePartner, setSitePartner] = useState("");
  const [band, setBand] = useState<"explorer" | "launch" | "mixed">("launch");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [trackIds, setTrackIds] = useState<string[]>(["cyber-launch"]);
  const [maxEnrollment, setMaxEnrollment] = useState(25);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toggleTrack = (slug: string) => {
    setTrackIds((prev) => (prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError(t("pathways.facilitator.create.errorNameRequired"));
      return;
    }
    if (trackIds.length === 0) {
      setError(t("pathways.facilitator.create.errorTrackRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        band,
        trackIds,
        maxEnrollment,
      };
      if (sitePartner.trim()) body.sitePartner = sitePartner.trim();
      if (description.trim()) body.description = description.trim();
      if (startDate) body.startDate = new Date(startDate).toISOString();
      if (endDate) body.endDate = new Date(endDate).toISOString();

      const res = await fetch("/api/pathways/cohorts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("bb_access_token")}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create cohort");
      }
      const created = await res.json();
      navigate(`/pathways/facilitator/cohorts/${created.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create cohort");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate("/pathways/facilitator/cohorts")}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="w-4 h-4" /> {t("pathways.facilitator.create.backToCohorts")}
      </button>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("pathways.facilitator.create.title")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t("pathways.facilitator.create.subtitle")}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardBody className="space-y-5">
            <Field label={t("pathways.facilitator.create.fieldName")} required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("pathways.facilitator.create.namePlaceholder") as string}
                required
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>

            <Field label={t("pathways.facilitator.create.fieldSite")}>
              <input
                type="text"
                value={sitePartner}
                onChange={(e) => setSitePartner(e.target.value)}
                placeholder={t("pathways.facilitator.create.sitePlaceholder") as string}
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>

            <Field label={t("pathways.facilitator.create.fieldBand")} required>
              <div className="flex flex-wrap gap-2">
                {(["explorer", "launch", "mixed"] as const).map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => setBand(b)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                      band === b
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t(`pathways.facilitator.band.${b}`)}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t("pathways.facilitator.create.fieldStartDate")}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </Field>
              <Field label={t("pathways.facilitator.create.fieldEndDate")}>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </Field>
            </div>

            <Field label={t("pathways.facilitator.create.fieldTracks")} required>
              <div className="space-y-2">
                {ALL_TRACKS.map((track) => (
                  <label
                    key={track.slug}
                    className="flex items-center gap-3 p-2.5 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={trackIds.includes(track.slug)}
                      onChange={() => toggleTrack(track.slug)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {t(`pathways.tracks.items.${track.slug}.name`, track.name)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {t(`pathways.tracks.items.${track.slug}.tagline`, track.tagline)}
                      </p>
                    </div>
                  </label>
                ))}
                {PATHWAY_TRACKS.filter((t) => t.status === "coming_soon").map((track) => (
                  <div
                    key={track.slug}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/30 opacity-60"
                  >
                    <input type="checkbox" disabled className="w-4 h-4" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-400">
                        {t(`pathways.tracks.items.${track.slug}.name`, track.name)}
                      </p>
                      <p className="text-xs text-slate-500">{t("pathways.common.comingSoon")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Field>

            <Field label={t("pathways.facilitator.create.fieldMaxEnrollment")}>
              <input
                type="number"
                value={maxEnrollment}
                onChange={(e) => setMaxEnrollment(parseInt(e.target.value, 10) || 25)}
                min={1}
                max={500}
                className="w-32 px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </Field>

            <Field label={t("pathways.facilitator.create.fieldDescription")}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={t("pathways.facilitator.create.descriptionPlaceholder") as string}
                className="w-full px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-900 placeholder-slate-400 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </Field>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800/30 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/pathways/facilitator/cohorts")}
                className="px-4 py-2 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                {t("pathways.facilitator.create.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white text-sm font-medium transition-colors"
              >
                {submitting ? t("pathways.common.loading") : t("pathways.facilitator.create.createCohort")}
              </button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
        {label}
        {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
