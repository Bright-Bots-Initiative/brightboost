/**
 * /biome-buddy/share#r=<payload> — a shared Buddy, presented (not edited).
 *
 * The fragment is decoded, length-capped, enum-validated and then EVERYTHING
 * shown is recomputed from trusted model data: stats, name, sprite, why-lines.
 * The URL describes the recipe; the page derives the result. A malformed
 * fragment renders a friendly invalid state with a way back — never a crash.
 *
 * Primary actions:
 *   Make my own version → /biome-buddy#r=<same payload> (a COPY; this page
 *   and the link are never mutated)
 *   Build a new Buddy   → /biome-buddy
 */
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { BiomeBuddyShell } from "./BiomeBuddy";
import BiomeScene from "@/components/biomeBuddy/BiomeScene";
import BuddySprite from "@/components/biomeBuddy/BuddySprite";
import StatBars from "@/components/biomeBuddy/StatBars";
import {
  BIOME_EMOJI,
  CATEGORIES,
  CATEGORY_EMOJI,
  PATTERN_EMOJI,
  STATS,
  TRAITS,
  biomeSensitiveContributions,
  computeStats,
  type Contribution,
  type TraitOption,
} from "@/components/biomeBuddy/biomeBuddyModel";
import {
  BIOME_INFO,
  CATEGORY_LABEL,
  renderBuddyName,
  scienceFor,
  whyFor,
} from "@/components/biomeBuddy/biomeBuddyContent";
import {
  buildRemixUrl,
  decodeShare,
  readShareParam,
} from "@/components/biomeBuddy/biomeBuddyShare";
import { useBuddyLocale } from "@/components/biomeBuddy/useBuddyLocale";
import { useReducedGameEffects } from "@/components/games/shared/useReducedGameEffects";

export default function BiomeBuddyShare() {
  const { hash } = useLocation();
  const { t, L, lang } = useBuddyLocale();
  const { reducedEffects } = useReducedGameEffects();
  const result = useMemo(() => decodeShare(readShareParam(hash)), [hash]);

  if (!result.ok) {
    return (
      <BiomeBuddyShell>
        <div
          className="flex flex-col items-center gap-4 py-10 px-4 text-center max-w-md mx-auto"
          data-testid="share-invalid"
        >
          <div className="text-6xl" aria-hidden>
            🧩
          </div>
          <h2 className="text-2xl font-extrabold text-[#3a2e22]">
            {t("biomeBuddy.sharePage.invalidTitle", {
              defaultValue: "Hmm, this link got scrambled",
            })}
          </h2>
          <p className="font-bold text-[#6f6048]">
            {t("biomeBuddy.sharePage.invalidBody", {
              defaultValue:
                "We couldn't read this Buddy. Links only carry the recipe, so nothing is lost — you can build a new one!",
            })}
          </p>
          <Link
            to="/biome-buddy"
            className="bb-btn bb-primary inline-flex items-center justify-center min-h-14 px-8 rounded-full bg-teal-600 text-white font-extrabold text-lg active:scale-95"
          >
            {t("biomeBuddy.sharePage.invalidCta", {
              defaultValue: "Go to Biome Buddy",
            })}
          </Link>
        </div>
      </BiomeBuddyShell>
    );
  }

  const { recipe } = result;
  const stats = computeStats(recipe);
  const name = renderBuddyName(recipe.name, lang);
  const biomeLabel = L(BIOME_INFO[recipe.biome].label);

  // "Why this Buddy fits this biome this way": the strongest biome-sensitive
  // part per stat, deduped by part, biggest effects first.
  const seen = new Set<string>();
  const whyRows: Contribution[] = [];
  for (const stat of STATS) {
    const rows = biomeSensitiveContributions(
      recipe.biome,
      recipe.traits,
      stat,
    ).sort((a, b) => Math.abs(b.mod) - Math.abs(a.mod));
    for (const row of rows) {
      const key = `${row.category}:${row.option}`;
      if (seen.has(key)) continue;
      seen.add(key);
      whyRows.push(row);
      break;
    }
  }
  const highlights = whyRows.slice(0, 3);

  return (
    <BiomeBuddyShell
      subtitle={t("biomeBuddy.sharePage.subtitle", {
        defaultValue: "A {{biome}} Buddy, shared with you",
        biome: biomeLabel,
      })}
    >
      <article
        className="flex flex-col items-center gap-5 py-4 px-3 w-full max-w-3xl mx-auto"
        data-testid="share-valid"
      >
        <h2 className="text-3xl font-extrabold text-[#1c3d6c] text-center">
          {name}
        </h2>
        <BiomeScene biome={recipe.biome} className="w-full" minHeight={240}>
          <div className="flex items-center justify-center min-h-[240px]">
            <BuddySprite
              recipe={recipe}
              size="lg"
              label={t("biomeBuddy.create.spriteAria", {
                defaultValue: "{{name}}, a {{biome}} Buddy",
                name,
                biome: biomeLabel,
              })}
              animate={!reducedEffects}
            />
          </div>
        </BiomeScene>
        <p className="text-lg font-extrabold text-[#3a2e22]">
          <span aria-hidden>{BIOME_EMOJI[recipe.biome]} </span>
          {biomeLabel}
          <span className="text-sm font-bold text-[#6f6048]">
            {" "}
            · {L(BIOME_INFO[recipe.biome].subtitle)}
          </span>
        </p>

        <section
          className="w-full rounded-2xl bg-white/80 p-4"
          aria-labelledby="bb-share-parts"
        >
          <h3
            id="bb-share-parts"
            className="text-base font-extrabold text-[#3a2e22] mb-2"
          >
            {t("biomeBuddy.sharePage.parts", { defaultValue: "Its parts" })}
          </h3>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((category) => {
              const option = recipe.traits[category];
              const def = (TRAITS[category] as Record<string, TraitOption>)[
                option
              ];
              return (
                <li
                  key={category}
                  className="rounded-2xl bg-white p-2 flex items-center gap-2"
                >
                  <span className="text-2xl" aria-hidden>
                    {def.emoji}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#7d6c52]">
                      <span aria-hidden>{CATEGORY_EMOJI[category]} </span>
                      {L(CATEGORY_LABEL[category])}
                    </p>
                    <p className="text-sm font-extrabold text-[#3a2e22]">
                      {L(scienceFor(category, option).label)}
                    </p>
                  </div>
                </li>
              );
            })}
            <li className="rounded-2xl bg-white p-2 flex items-center gap-2">
              <span className="text-2xl" aria-hidden>
                {PATTERN_EMOJI[recipe.pattern]}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#7d6c52]">
                  <span aria-hidden>🎨 </span>
                  {L(CATEGORY_LABEL.pattern)}
                </p>
                <p className="text-sm font-extrabold text-[#3a2e22]">
                  {L(scienceFor("pattern", recipe.pattern).label)}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section
          className="w-full rounded-2xl bg-white/80 p-4"
          aria-labelledby="bb-share-stats"
        >
          <h3
            id="bb-share-stats"
            className="text-base font-extrabold text-[#3a2e22] mb-2"
          >
            {t("biomeBuddy.sharePage.stats", {
              defaultValue: "How it does in the {{biome}}",
              biome: biomeLabel,
            })}
          </h3>
          <StatBars stats={stats} animate={!reducedEffects} />
        </section>

        <section
          className="w-full rounded-2xl bg-white/80 p-4"
          aria-labelledby="bb-share-why"
        >
          <h3
            id="bb-share-why"
            className="text-base font-extrabold text-[#3a2e22] mb-2"
          >
            {t("biomeBuddy.sharePage.why", {
              defaultValue: "Why this Buddy fits the {{biome}} this way",
              biome: biomeLabel,
            })}
          </h3>
          <ul className="flex flex-col gap-2">
            {whyRows.map((row) => {
              const def = (TRAITS[row.category] as Record<string, TraitOption>)[
                row.option
              ];
              const why = whyFor(row.category, row.option, recipe.biome);
              return (
                <li
                  key={`${row.category}-${row.option}`}
                  className="flex items-start gap-2 rounded-2xl bg-white p-2"
                >
                  <span className="text-2xl" aria-hidden>
                    {def.emoji}
                  </span>
                  <p className="text-sm font-bold text-[#3a2e22]">
                    {why
                      ? L(why)
                      : L(scienceFor(row.category, row.option).what)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          className="w-full rounded-2xl bg-white/80 p-4"
          aria-labelledby="bb-share-science"
        >
          <h3
            id="bb-share-science"
            className="text-base font-extrabold text-[#3a2e22] mb-2"
          >
            {t("biomeBuddy.sharePage.science", {
              defaultValue: "Science highlights",
            })}
          </h3>
          <ul className="flex flex-col gap-2">
            {highlights.map((row) => {
              const card = scienceFor(row.category, row.option);
              return (
                <li
                  key={`${row.category}-${row.option}-sci`}
                  className="rounded-2xl bg-white p-3"
                >
                  <p className="text-sm font-extrabold text-[#3a2e22]">
                    {L(card.label)}
                    {L(card.term).trim().toLowerCase() !==
                      L(card.label).trim().toLowerCase() && (
                      <span className="text-xs font-bold text-[#7d6c52]">
                        {" "}
                        · {L(card.term)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-bold text-[#3a2e22]">
                    {L(card.what)}
                  </p>
                  <p className="text-xs font-medium text-[#6f6048]">
                    {L(card.animals)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="bb-actions-sticky w-full flex flex-col items-center gap-2">
          <Link
            to={buildRemixUrl(recipe)}
            className="bb-btn bb-primary inline-flex items-center justify-center min-h-14 px-10 rounded-full bg-brightboost-yellow text-[#3a2e22] text-xl font-extrabold shadow-[0_5px_0_#c46f55] active:translate-y-1 active:shadow-none"
            data-testid="share-remix"
          >
            {t("biomeBuddy.sharePage.remix", {
              defaultValue: "Make my own version 🔧",
            })}
          </Link>
          <p className="text-xs font-bold text-[#6f6048] text-center max-w-sm">
            {t("biomeBuddy.sharePage.remixNote", {
              defaultValue:
                "You'll get your own copy to change. This shared Buddy stays just as it is.",
            })}
          </p>
          <Link
            to="/biome-buddy"
            className="bb-btn inline-flex items-center justify-center min-h-11 px-5 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95"
            data-testid="share-new"
          >
            {t("biomeBuddy.sharePage.new", {
              defaultValue: "Build a new Buddy",
            })}
          </Link>
        </div>
      </article>
    </BiomeBuddyShell>
  );
}
