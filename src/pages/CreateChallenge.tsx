import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApi } from "../services/api";
import {
  DATA_DASH_CARDS,
  SORT_RULES,
  type SortRuleKey,
} from "../components/games/DataDashSortDiscoverGame";
import {
  SORT_RULE_KEYS,
  INFER_RULE_OPTIONS,
  ATTR_LABELS,
  MIN_CARDS,
  validateDataDashChallenge,
  type DataDashChallenge,
} from "../components/games/dataDashAuthoring";

// Phase 0 — kid authors a Data Dash challenge by structured choices only (no
// free text). They pick plants from the fixed pool, a sort rule, and a hidden
// rule; the chart question is derived at play time. Live validation mirrors the
// server's solvability guard so a kid can't share an unsolvable challenge.

type Group = { courseId: string; courseName: string; kind?: string };

export default function CreateChallenge() {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [courseId, setCourseId] = useState("");
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [sortRule, setSortRule] = useState<SortRuleKey>("sunlightNeed");
  const [inferRule, setInferRule] =
    useState<(typeof INFER_RULE_OPTIONS)[number]>("seedType");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/student/courses")
      .then((res: unknown) => {
        const list = (Array.isArray(res) ? res : []) as Group[];
        setGroups(list);
        if (list[0]) setCourseId(list[0].courseId);
      })
      .catch(() => setGroups([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const challenge: DataDashChallenge = { v: 1, cardIds, sortRule, inferRule };
  const validation = useMemo(
    () => validateDataDashChallenge(challenge),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardIds, sortRule, inferRule],
  );
  const title = `${t("createChallenge.titlePrefix")} ${SORT_RULES[sortRule].label}`;

  const toggleCard = (id: string) =>
    setCardIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const canSave = validation.ok && !!courseId && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await api.post("/creations", {
        courseId,
        type: "data_dash_challenge",
        title,
        content: challenge,
      });
      navigate(`/student/challenge/${created.id}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("createChallenge.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (groups.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold text-brightboost-navy">
          {t("createChallenge.pageTitle")}
        </h1>
        <p className="mt-3 text-gray-600">{t("createChallenge.noGroups")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-brightboost-navy">
          {t("createChallenge.pageTitle")}
        </h1>
        <p className="text-gray-600 mt-1">{t("createChallenge.intro")}</p>
      </header>

      {groups.length > 1 && (
        <div>
          <label htmlFor="grp" className="block text-sm font-semibold mb-1">
            {t("createChallenge.chooseGroup")}
          </label>
          <select
            id="grp"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            {groups.map((g) => (
              <option key={g.courseId} value={g.courseId}>
                {g.courseName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Plants */}
      <section>
        <h2 className="text-sm font-semibold mb-2">
          {t("createChallenge.pickPlants", { min: MIN_CARDS })}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DATA_DASH_CARDS.map((card) => {
            const on = cardIds.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => toggleCard(card.id)}
                aria-pressed={on}
                className={`rounded-lg border p-2 text-left text-sm transition-colors ${
                  on
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="font-semibold">{card.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Sort rule (Phase A) */}
      <section>
        <h2 className="text-sm font-semibold mb-2">
          {t("createChallenge.sortRuleLabel")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {SORT_RULE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSortRule(k)}
              aria-pressed={sortRule === k}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                sortRule === k
                  ? "border-brightboost-blue bg-brightboost-blue text-white"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              {ATTR_LABELS[k]}
            </button>
          ))}
        </div>
      </section>

      {/* Hidden rule (Phase B) */}
      <section>
        <h2 className="text-sm font-semibold mb-2">
          {t("createChallenge.hiddenRuleLabel")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {INFER_RULE_OPTIONS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setInferRule(k)}
              aria-pressed={inferRule === k}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                inferRule === k
                  ? "border-brightboost-blue bg-brightboost-blue text-white"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              {ATTR_LABELS[k]}
            </button>
          ))}
        </div>
      </section>

      {/* Live solvability feedback */}
      <div
        role="status"
        className={`rounded-lg px-3 py-2 text-sm ${
          validation.ok
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-amber-50 text-amber-800 border border-amber-200"
        }`}
      >
        {validation.ok ? t("createChallenge.valid") : validation.error}
      </div>

      {saveError && (
        <div className="rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200">
          {saveError}
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-brightboost-blue text-white font-semibold disabled:opacity-50"
      >
        {saving ? t("createChallenge.saving") : t("createChallenge.save")}
      </button>
    </div>
  );
}
