/** Choose / Imagine — pick the Buddy's home (design §2 screen 1). */
import { BIOMES, BIOME_EMOJI, type Biome } from "../biomeBuddyModel";
import { BIOME_INFO } from "../biomeBuddyContent";
import BiomeScene from "../BiomeScene";
import ProgressDots from "../ProgressDots";
import { onRadioArrowKeys, radioTabIndex } from "../radioKeys";
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
        onKeyDown={onRadioArrowKeys}
      >
        {BIOMES.map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={b === biome}
            tabIndex={radioTabIndex(b === biome)}
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
      {/* The arrows change the radiogroup from outside it — announce the result. */}
      <p className="sr-only" role="status" aria-live="polite">
        {t("biomeBuddy.choose.currentAria", {
          defaultValue: "Home: {{biome}}",
          biome: L(info.label),
        })}
      </p>

      {/* Preview panel with side navigation (arrows drop below the panel on
          narrow phones so the description keeps a readable measure). */}
      <div className="bb-choose-panel w-full">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={t("biomeBuddy.choose.prev", {
            defaultValue: "Previous home",
          })}
          className="bb-choose-arrow min-w-11 rounded-2xl bg-white text-2xl font-extrabold text-[#3a2e22] shadow active:scale-95 shrink-0"
        >
          ◀
        </button>
        <BiomeScene
          biome={biome}
          className="bb-choose-scene min-w-0"
          minHeight={240}
        >
          <div className="bb-choose-card m-2 sm:m-6 rounded-3xl bg-white/75 backdrop-blur-sm p-3 sm:p-4 text-[#3a2e22] flex flex-col gap-2">
            <h3 className="text-lg sm:text-xl font-extrabold leading-tight">
              <span aria-hidden>{BIOME_EMOJI[biome]} </span>
              {L(info.label)}
              <span className="block sm:inline text-sm font-bold text-[#6f6048]">
                <span className="hidden sm:inline"> · </span>
                {L(info.subtitle)}
              </span>
            </h3>
            <p className="text-sm sm:text-base font-bold leading-snug">
              {L(info.description)}
            </p>
            <p className="text-xs sm:text-sm font-bold text-[#6f6048]">
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
          className="bb-choose-arrow min-w-11 rounded-2xl bg-white text-2xl font-extrabold text-[#3a2e22] shadow active:scale-95 shrink-0"
        >
          ▶
        </button>
      </div>

      <div className="bb-actions-sticky bb-actions-row w-full flex items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-4 sm:px-5 rounded-full bg-white text-[#3a2e22] text-sm sm:text-base font-bold shadow active:scale-95"
        >
          {t("biomeBuddy.common.myBuddies", { defaultValue: "My Buddies" })}
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="bb-primary bb-pop min-h-14 px-6 sm:px-10 rounded-full bg-brightboost-yellow text-[#3a2e22] text-lg sm:text-xl font-extrabold shadow-[0_5px_0_#c46f55] active:translate-y-1 active:shadow-none"
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
