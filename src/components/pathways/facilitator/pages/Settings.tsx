/**
 * Settings page — facilitator-wide preferences. Persisted to localStorage
 * for now; will move to a Prisma `FacilitatorPrefs` model once we know
 * which prefs matter to partners in production.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Save, Bell, ClipboardList } from "lucide-react";
import Card, { CardBody, CardHeader } from "../shared/Card";

const PREFS_KEY = "bb_facilitator_prefs";

interface Prefs {
  defaultBand: "explorer" | "launch" | "mixed";
  defaultMaxEnrollment: number;
  notifyOnNewEnrollment: boolean;
  notifyOnInactiveLearner: boolean;
  notifyOnCohortStatusChange: boolean;
}

const DEFAULTS: Prefs = {
  defaultBand: "launch",
  defaultMaxEnrollment: 16,
  notifyOnNewEnrollment: true,
  notifyOnInactiveLearner: true,
  notifyOnCohortStatusChange: false,
};

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export default function Settings() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<Prefs>(() => readPrefs());
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const save = () => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    setSaved(false);
  }, [prefs]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {t("pathways.facilitator.settings.title")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {t("pathways.facilitator.settings.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-200">
              {t("pathways.facilitator.settings.cohortDefaultsTitle")}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
            {t("pathways.facilitator.settings.cohortDefaultsHint")}
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
              {t("pathways.facilitator.settings.defaultBand")}
            </label>
            <div className="flex gap-2">
              {(["explorer", "launch", "mixed"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => update("defaultBand", b)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                    prefs.defaultBand === b
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {t(`pathways.facilitator.band.${b}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1.5">
              {t("pathways.facilitator.settings.defaultMaxEnrollment")}
            </label>
            <input
              type="number"
              value={prefs.defaultMaxEnrollment}
              onChange={(e) => update("defaultMaxEnrollment", parseInt(e.target.value, 10) || 16)}
              min={1}
              max={500}
              className="w-32 px-3 py-2 rounded-lg border bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-200">
              {t("pathways.facilitator.settings.notificationsTitle")}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-1">
            {t("pathways.facilitator.settings.notificationsHint")}
          </p>
        </CardHeader>
        <CardBody className="space-y-3">
          <Toggle
            label={t("pathways.facilitator.settings.notifyNewEnrollment")}
            description={t("pathways.facilitator.settings.notifyNewEnrollmentHint")}
            checked={prefs.notifyOnNewEnrollment}
            onChange={(v) => update("notifyOnNewEnrollment", v)}
          />
          <Toggle
            label={t("pathways.facilitator.settings.notifyInactive")}
            description={t("pathways.facilitator.settings.notifyInactiveHint")}
            checked={prefs.notifyOnInactiveLearner}
            onChange={(v) => update("notifyOnInactiveLearner", v)}
          />
          <Toggle
            label={t("pathways.facilitator.settings.notifyStatusChange")}
            description={t("pathways.facilitator.settings.notifyStatusChangeHint")}
            checked={prefs.notifyOnCohortStatusChange}
            onChange={(v) => update("notifyOnCohortStatusChange", v)}
          />
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
        >
          <Save className="w-4 h-4" /> {t("pathways.facilitator.settings.savePreferences")}
        </button>
        {saved && (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {t("pathways.facilitator.settings.saved")}
          </span>
        )}
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
      />
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{label}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{description}</p>
      </div>
    </label>
  );
}
