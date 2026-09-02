/** Choose / Imagine — pick the Buddy's home (design §2 screen 1). */
import { BIOMES, BIOME_EMOJI, type Biome } from "../biomeBuddyModel";
import { BIOME_INFO } from "../biomeBuddyContent";
import BiomeScene from "../BiomeScene";
import ProgressDots from "../ProgressDots";
import { useBuddyLocale } from "../useBuddyLocale";

export interface ChooseScreenProps {
  biome: Biome;
  onBiome: (biome: Biome) => void;
  onSelect: () => void;
  onBack: () => void;
}

export default function ChooseScreen({
  biome,
  onBiome,
  onSelect,
  onBack,
}: ChooseScreenProps) {
  const { t, L } = useBuddyLocale();
  const index = BIOMES.indexOf(biome);
  const step = (delta: number) =>
    onBiome(BIOMES[(index + delta + BIOMES.length) % BIOMES.length]);
  const info = BIOME_INFO[biome];

  return (
    <div className="flex flex-col items-center gap-4 py-4 px-3 w-full max-w-3xl mx-auto">
      <ProgressDots current="choose" />
      <h2 className="text-2xl font-extrabold text-[#3a2e22] text-center">
        {t("biomeBuddy.choose.heading", {
          defaultValue: "Where will your Buddy live?",
        })}
      </h2>

      {/* Large K–2 biome controls (direct taps) */}
      <div
        className="bb-biome-grid w-full"
        role="radiogroup"
        aria-label={t("biomeBuddy.choose.groupAria", { defaultValue: "Homes" })}
      >
        {BIOMES.map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={b === biome}
            onClick={() => onBiome(b)}
            className="bb-chip bb-primary min-h-14 rounded-2xl bg-white border-[3px] border-[#e1d0a6] font-extrabold text-[#3a2e22] flex flex-col items-center justify-center gap-0.5 px-2 active:scale-95"
          >
            <span className="text-3xl" aria-hidden>
              {BIOME_EMOJI[b]}
            </span>
            <span className="text-sm sm:text-base">
              {L(BIOME_INFO[b].label)}
            </span>
          </button>
        ))}
      </div>

      {/* Preview panel with side navigation */}
      <div className="w-full flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={t("biomeBuddy.choose.prev", {
            defaultValue: "Previous home",
          })}
          className="min-w-11 rounded-2xl bg-white text-2xl font-extrabold text-[#3a2e22] shadow active:scale-95 shrink-0"
        >
          ◀
        </button>
        <BiomeScene biome={biome} className="flex-1 min-w-0" minHeight={260}>
          <div
            className="m-3 sm:m-6 rounded-3xl bg-white/70 backdrop-blur-sm p-4 text-[#3a2e22] flex flex-col gap-2"
            aria-live="polite"
          >
            <h3 className="text-xl font-extrabold">
              <span aria-hidden>{BIOME_EMOJI[biome]} </span>
              {L(info.label)}
              <span className="text-sm font-bold text-[#6f6048]">
                {" "}
                · {L(info.subtitle)}
              </span>
            </h3>
            <p className="text-base font-bold leading-snug">
              {L(info.description)}
            </p>
            <p className="text-sm font-bold text-[#6f6048]">
              {t("biomeBuddy.choose.animalsHere", {
                defaultValue: "Who lives here:",
              })}{" "}
              {L(info.fauna)}
            </p>
          </div>
        </BiomeScene>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={t("biomeBuddy.choose.next", {
            defaultValue: "Next home",
          })}
          className="min-w-11 rounded-2xl bg-white text-2xl font-extrabold text-[#3a2e22] shadow active:scale-95 shrink-0"
        >
          ▶
        </button>
      </div>

      <div className="bb-actions-sticky w-full flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-5 rounded-full bg-white text-[#3a2e22] font-bold shadow active:scale-95"
        >
          {t("biomeBuddy.common.myBuddies", { defaultValue: "My Buddies" })}
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="bb-primary min-h-14 px-10 rounded-full bg-brightboost-yellow text-[#3a2e22] text-xl font-extrabold shadow-[0_5px_0_#c46f55] active:translate-y-1 active:shadow-none animate-pop"
        >
          {t("biomeBuddy.choose.select", {
            defaultValue: "Select {{biome}} ✓",
            biome: L(info.label),
          })}
        </button>
      </div>
    </div>
  );
}
