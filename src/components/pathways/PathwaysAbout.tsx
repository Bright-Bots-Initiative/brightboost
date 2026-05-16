/**
 * Pathways About — public landing page for the Pathways program.
 *
 * Theme: standalone page (no PathwaysLayout wrapper). Reads the same
 * `bb_pathways_theme` localStorage key the layout writes, so partners
 * coming from the authenticated app see consistent theming.
 *
 * i18n: every visible string keyed under `pathways.about.*`.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import {
  Shield,
  Rocket,
  DollarSign,
  Cpu,
  Film,
  Users,
  BarChart3,
  Award,
  ArrowRight,
  Briefcase,
  FileText,
  Target,
  Moon,
  Sun,
} from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";

const ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-6 h-6" />,
  Rocket: <Rocket className="w-6 h-6" />,
  DollarSign: <DollarSign className="w-6 h-6" />,
  Cpu: <Cpu className="w-6 h-6" />,
  Film: <Film className="w-6 h-6" />,
};

const THEME_KEY = "bb_pathways_theme";

function readStoredTheme(): "dark" | "light" {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export default function PathwaysAbout() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<"dark" | "light">(() => readStoredTheme());
  const isDark = theme === "dark";

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* localStorage unavailable */
    }
  }, [theme]);

  const fundingItems = t("pathways.about.partners.funding", { returnObjects: true }) as string[];

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top controls — language + theme */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <LanguageToggle variant={isDark ? "dark" : "light"} />
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label={isDark ? t("pathways.common.lightMode") : t("pathways.common.darkMode")}
          className="p-2 rounded-lg border bg-white border-slate-200 hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-cyan-50 dark:from-indigo-900/50 dark:to-cyan-900/30" />
        <div className="relative max-w-5xl mx-auto px-5 sm:px-6 pt-20 sm:pt-20 pb-14 sm:pb-20 text-center">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-indigo-700 dark:text-indigo-300 font-medium mb-4">
            {t("pathways.about.hero.eyebrow")}
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
              {t("pathways.layout.brand")}
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-800 dark:text-slate-300 max-w-2xl mx-auto mb-3">
            {t("pathways.about.hero.tagline")}
          </p>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-400 max-w-xl mx-auto mb-2">
            {t("pathways.about.hero.sub1")}
          </p>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-400 max-w-xl mx-auto mb-6">
            {t("pathways.about.hero.sub2")}
          </p>
          <Link
            to="/student-login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium rounded-lg transition-all"
          >
            {t("pathways.common.logInOrJoin")} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Tracks */}
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">
          {t("pathways.about.tracksSection.title")}
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-400 text-center mb-8 sm:mb-10">
          {t("pathways.about.tracksSection.sub")}
        </p>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHWAY_TRACKS.map((track) => {
            const name = t(`pathways.tracks.items.${track.slug}.name`, track.name);
            const tagline = t(`pathways.tracks.items.${track.slug}.tagline`, track.tagline);
            return (
              <div
                key={track.slug}
                className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 p-5 shadow-sm"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                  style={{ backgroundColor: track.color + "15", color: track.color }}
                >
                  {ICONS[track.icon]}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{name}</h3>
                <p className="text-xs text-slate-700 dark:text-slate-400 mb-2">{tagline}</p>
                <div className="flex gap-1">
                  {track.bands.map((b) => (
                    <span
                      key={b}
                      className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 capitalize"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bands */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16 grid md:grid-cols-2 gap-4 sm:gap-8">
          <div className="p-6 rounded-xl border border-indigo-200 bg-indigo-50 dark:border-indigo-800/30 dark:bg-indigo-900/10">
            <h3 className="font-bold text-lg text-indigo-700 dark:text-indigo-300 mb-2">
              {t("pathways.about.bands.explorerTitle")}
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-400">
              {t("pathways.about.bands.explorerDesc")}
            </p>
          </div>
          <div className="p-6 rounded-xl border border-cyan-200 bg-cyan-50 dark:border-cyan-800/30 dark:bg-cyan-900/10">
            <h3 className="font-bold text-lg text-cyan-700 dark:text-cyan-300 mb-2">
              {t("pathways.about.bands.launchTitle")}
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-400">
              {t("pathways.about.bands.launchDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* What Outcomes Look Like */}
      <div className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
        <h2 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">
          {t("pathways.about.outcomes.title")}
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-400 text-center mb-10">
          {t("pathways.about.outcomes.sub")}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Feature
            icon={<FileText className="w-5 h-5" />}
            title={t("pathways.about.outcomes.portfolioTitle")}
            desc={t("pathways.about.outcomes.portfolioDesc")}
          />
          <Feature
            icon={<Award className="w-5 h-5" />}
            title={t("pathways.about.outcomes.certTitle")}
            desc={t("pathways.about.outcomes.certDesc")}
          />
          <Feature
            icon={<Target className="w-5 h-5" />}
            title={t("pathways.about.outcomes.nextStepTitle")}
            desc={t("pathways.about.outcomes.nextStepDesc")}
          />
        </div>
      </div>

      {/* Delivery Models */}
      <div className="bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-12 sm:py-16">
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">
            {t("pathways.about.delivery.title")}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-400 text-center mb-10">
            {t("pathways.about.delivery.sub")}
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Feature
              icon={<Briefcase className="w-5 h-5" />}
              title={t("pathways.about.delivery.siteLedTitle")}
              desc={t("pathways.about.delivery.siteLedDesc")}
            />
            <Feature
              icon={<Users className="w-5 h-5" />}
              title={t("pathways.about.delivery.hybridTitle")}
              desc={t("pathways.about.delivery.hybridDesc")}
            />
            <Feature
              icon={<Award className="w-5 h-5" />}
              title={t("pathways.about.delivery.fullServiceTitle")}
              desc={t("pathways.about.delivery.fullServiceDesc")}
            />
          </div>
        </div>
      </div>

      {/* For Partners */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-100">
          {t("pathways.about.partners.title")}
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-400 text-center mb-10">
          {t("pathways.about.partners.sub")}
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <Feature
            icon={<Users className="w-5 h-5" />}
            title={t("pathways.about.partners.cohortTitle")}
            desc={t("pathways.about.partners.cohortDesc")}
          />
          <Feature
            icon={<BarChart3 className="w-5 h-5" />}
            title={t("pathways.about.partners.dashTitle")}
            desc={t("pathways.about.partners.dashDesc")}
          />
          <Feature
            icon={<Award className="w-5 h-5" />}
            title={t("pathways.about.partners.credTitle")}
            desc={t("pathways.about.partners.credDesc")}
          />
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-2">
            {t("pathways.about.partners.fundingTitle")}
          </h3>
          <p className="text-sm text-slate-700 dark:text-slate-400 mb-3">
            {t("pathways.about.partners.fundingIntro")}
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-800 dark:text-slate-300">
            {fundingItems?.map((item, i) => <li key={i}>· {item}</li>)}
          </ul>
        </div>

        <div className="text-center mt-12">
          <a
            href="mailto:nwalker@brightbotsint.com?subject=Pathways%20Pilot%20Interest"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-medium rounded-lg transition-all"
          >
            {t("pathways.common.requestPilot")} <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500 dark:text-slate-600">
        {t("pathways.about.footer")}
      </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 shadow-sm">
      <div className="text-indigo-700 dark:text-indigo-400 mb-2">{icon}</div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-700 dark:text-slate-400">{desc}</p>
    </div>
  );
}
