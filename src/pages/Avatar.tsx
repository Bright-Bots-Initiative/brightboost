// src/pages/Avatar.tsx — Kid-friendly "My Star" page with superpowers
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../services/api";
import { api } from "../services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "@/lib/utils";
import { getStudentArchetype } from "@/lib/moduleAccess";

type Stats = {
  heartPower: number;
  brainJuice: number;
  lightningFast: number;
  superFocus: number;
  starPower: number;
  powerLevel: number;
  stage: string;
  specialtyProgress: {
    set1: { current: number; target: number; complete: boolean };
    set2: { current: number; target: number; complete: boolean };
    set3: { current: number; target: number; complete: boolean };
  };
};

const SUPERPOWERS = [
  { key: "heartPower" as const, emoji: "💖", colorBar: "bg-pink-400", colorBg: "bg-pink-50", colorText: "text-pink-700", colorBorder: "border-pink-200" },
  { key: "brainJuice" as const, emoji: "🧠", colorBar: "bg-yellow-400", colorBg: "bg-yellow-50", colorText: "text-yellow-700", colorBorder: "border-yellow-200" },
  { key: "lightningFast" as const, emoji: "⚡", colorBar: "bg-blue-400", colorBg: "bg-blue-50", colorText: "text-blue-700", colorBorder: "border-blue-200" },
  { key: "superFocus" as const, emoji: "🎯", colorBar: "bg-green-400", colorBg: "bg-green-50", colorText: "text-green-700", colorBorder: "border-green-200" },
  { key: "starPower" as const, emoji: "⭐", colorBar: "bg-purple-400", colorBg: "bg-purple-50", colorText: "text-purple-700", colorBorder: "border-purple-200" },
];

const ARENA_BOOSTS = [
  { key: "heartPower" as const, emoji: "💖" },
  { key: "brainJuice" as const, emoji: "🧠" },
  { key: "lightningFast" as const, emoji: "⚡" },
  { key: "superFocus" as const, emoji: "🎯" },
  { key: "starPower" as const, emoji: "⭐" },
];

const SET_CONFIG = [
  { key: "set1" as const, target: 15 },
  { key: "set2" as const, target: 30 },
  { key: "set3" as const, target: 50 },
];

const SPECIALIZATIONS = [
  { key: "AI", label: "AI Explorer", labelEs: "Explorador de IA", icon: "🤖", color: "from-blue-500 to-indigo-500", borderColor: "border-blue-400", desc: "Build smart robots and teach machines to think!", descEs: "¡Construye robots inteligentes y enseña a las máquinas a pensar!" },
  { key: "QUANTUM", label: "Quantum Voyager", labelEs: "Viajero Cuántico", icon: "🔮", color: "from-purple-500 to-violet-500", borderColor: "border-purple-400", desc: "Explore space math and unlock cosmic puzzles!", descEs: "¡Explora las matemáticas espaciales y resuelve rompecabezas cósmicos!" },
  { key: "BIOTECH", label: "Bio Builder", labelEs: "Constructor Bio", icon: "🌿", color: "from-green-500 to-emerald-500", borderColor: "border-green-400", desc: "Discover living things and grow amazing gardens!", descEs: "¡Descubre seres vivos y cultiva jardines asombrosos!" },
];

export default function Avatar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const authApi = useApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [avatar, setAvatar] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [avatarData, statsData] = await Promise.all([
          api.getAvatar(),
          authApi.get("/student/stats"),
        ]);
        if (cancelled) return;
        setAvatar(avatarData);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [authApi]);

  if (loading) {
    return (
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const s = stats ?? {
    heartPower: 0, brainJuice: 0, lightningFast: 0, superFocus: 0, starPower: 0,
    powerLevel: 0, stage: "Rookie",
    specialtyProgress: {
      set1: { current: 0, target: 15, complete: false },
      set2: { current: 0, target: 30, complete: false },
      set3: { current: 0, target: 50, complete: false },
    },
  };

  const stageEmoji = s.stage === "Legend" ? "👑" : s.stage === "Champion" ? "🏆" : s.stage === "Explorer" ? "🚀" : "🌟";
  const loginIcon = (user as any)?.loginIcon;
  const xp = avatar?.avatar?.xp ?? avatar?.xp ?? 0;
  const level = avatar?.avatar?.level ?? avatar?.level ?? 1;
  const currentArchetype = getStudentArchetype(avatar);

  async function handleSelectSpecialization(archetype: string) {
    setSaving(true);
    try {
      await api.selectArchetype(archetype);
      // Reload avatar to reflect selection
      const refreshed = await api.getAvatar();
      setAvatar(refreshed);
    } catch (err) {
      console.error("Failed to select specialization:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Header: name + stage */}
      <div className="text-center space-y-1">
        {loginIcon && (
          <div className="text-6xl mb-2">{loginIcon}</div>
        )}
        <h1 className="text-3xl font-extrabold text-slate-800">
          {t("myStar.title")}
        </h1>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl">{stageEmoji}</span>
          <span className="text-lg font-bold text-slate-600">
            {t(`myStar.stage.${s.stage.toLowerCase()}`)}
          </span>
        </div>
      </div>

      {/* Power Level + Stars/Level */}
      <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50">
        <CardContent className="py-5 text-center">
          <p className="text-sm font-bold text-orange-600 uppercase tracking-wider mb-1">
            {t("myStar.powerLevel")}
          </p>
          <p className="text-5xl font-black text-orange-600">
            {s.powerLevel} <span className="text-3xl">{"🔥"}</span>
          </p>
          <div className="flex justify-center gap-6 mt-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">{t("myStar.stars")}</p>
              <p className="text-lg font-bold text-slate-700">{xp} {"⭐"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">{t("myStar.levelLabel")}</p>
              <p className="text-lg font-bold text-slate-700">{level}</p>
            </div>
          </div>
          {/* Stage progress hint */}
          {s.stage !== "Legend" && (
            <p className="text-xs text-orange-400 mt-2">
              {t("myStar.nextStage", {
                next: s.powerLevel < 11 ? t("myStar.stage.explorer") : s.powerLevel < 26 ? t("myStar.stage.champion") : t("myStar.stage.legend"),
                needed: s.powerLevel < 11 ? 11 - s.powerLevel : s.powerLevel < 26 ? 26 - s.powerLevel : 41 - s.powerLevel,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Superpower Bars */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">
          {t("myStar.superpowers")}
        </h2>
        {SUPERPOWERS.map((sp) => {
          const val = s[sp.key];
          const isMax = val >= 10;
          return (
            <div
              key={sp.key}
              className={cn(
                "rounded-xl border-2 p-3 flex items-center gap-3 transition-all",
                sp.colorBg, sp.colorBorder,
                isMax && "ring-2 ring-yellow-400",
              )}
            >
              <span className="text-3xl flex-shrink-0">{sp.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-sm font-bold", sp.colorText)}>
                    {t(`myStar.stats.${sp.key}`)}
                  </span>
                  <span className={cn("text-sm font-bold", sp.colorText)}>
                    {isMax ? t("myStar.maxPower") : `${val}/10`}
                  </span>
                </div>
                <div className="h-4 bg-white/60 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", sp.colorBar)}
                    style={{ width: `${(val / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arena Boosts */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardContent className="py-5">
          <h2 className="text-lg font-bold text-indigo-700 text-center mb-1">
            {t("myStar.arenaTitle")} {"⚔️"}
          </h2>
          <p className="text-xs text-indigo-500 text-center mb-4">
            {t("myStar.arenaDesc")}
          </p>
          <div className="grid grid-cols-5 gap-2">
            {ARENA_BOOSTS.map((b) => {
              const val = s[b.key];
              return (
                <div key={b.key} className="text-center">
                  <span className="text-xl">{b.emoji}</span>
                  <p className="text-xs font-bold text-indigo-600">+{val}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Specialty Progress */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">
          {t("myStar.specialtyTitle")}
        </h2>
        {SET_CONFIG.map((set, idx) => {
          const sp = s.specialtyProgress[set.key];
          const prev = idx > 0 ? s.specialtyProgress[SET_CONFIG[idx - 1].key] : null;
          const locked = idx > 0 && !prev?.complete;
          const pct = Math.min(100, (sp.current / sp.target) * 100);
          return (
            <div
              key={set.key}
              className={cn(
                "rounded-xl border p-4 transition-all",
                locked ? "opacity-50 bg-slate-50" : sp.complete ? "bg-green-50 border-green-300" : "bg-white border-slate-200",
              )}
            >
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold text-slate-700">
                  {t(`myStar.sets.${set.key}`)}
                </span>
                <span className="text-sm text-slate-500">
                  {locked ? t("myStar.locked") : sp.complete ? t("myStar.complete") : `${sp.current}/${sp.target}`}
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    sp.complete ? "bg-green-500" : "bg-blue-500",
                  )}
                  style={{ width: locked ? "0%" : `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="text-xs text-slate-400 text-center">
          {t("myStar.specialtyHint")}
        </p>
      </div>

      {/* Specialization Picker */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">
          {t("avatar.specialization")}
        </h2>
        {currentArchetype ? (
          <Card className="border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <CardContent className="py-5 text-center">
              <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">
                {t("avatar.activeSpec")}
              </p>
              <p className="text-3xl font-black text-indigo-700">
                {SPECIALIZATIONS.find((sp) => sp.key === currentArchetype)?.icon ?? "⭐"}{" "}
                {t(`avatar.spec.${currentArchetype}`, { defaultValue: SPECIALIZATIONS.find((sp) => sp.key === currentArchetype)?.label })}
              </p>
            </CardContent>
          </Card>
        ) : s.specialtyProgress.set3.complete ? (
          <>
            <p className="text-sm text-slate-600 text-center">
              {t("avatar.pickPath")}
            </p>
            <div className="grid gap-3">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec.key}
                  disabled={saving}
                  onClick={() => handleSelectSpecialization(spec.key)}
                  className={cn(
                    "rounded-xl border-2 p-4 flex items-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]",
                    "bg-white shadow-sm hover:shadow-md",
                    spec.borderColor,
                    saving && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className={cn("w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center text-3xl flex-shrink-0", spec.color)}>
                    {spec.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-lg font-bold text-slate-800">
                      {t(`avatar.spec.${spec.key}`, { defaultValue: spec.label })}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t(`avatar.specDesc.${spec.key}`, { defaultValue: spec.desc })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <Card className="border-2 border-slate-200 bg-slate-50">
            <CardContent className="py-5 text-center space-y-2">
              <p className="text-3xl">{"🔒"}</p>
              <p className="text-sm font-bold text-slate-600">
                {t("avatar.lockedMessage")}
              </p>
              <p className="text-xs text-slate-400">
                {t("avatar.progress")}: {s.specialtyProgress.set3.current}/{s.specialtyProgress.set3.target}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
