/** Imagine — level picker + the device-local gallery ("My Buddies"). */
import { BANDS, BIOME_EMOJI, type Band } from "../biomeBuddyModel";
import { BIOME_INFO, renderBuddyName } from "../biomeBuddyContent";
import type { SavedBuddy } from "../biomeBuddyStorage";
import BuddySprite from "../BuddySprite";
import ShareButton from "../ShareButton";
import { useBuddyLocale } from "../useBuddyLocale";

const BAND_EMOJI: Record<Band, string> = { k2: "🐣", g35: "🌱", g68: "🚀" };
const BAND_FALLBACK: Record<Band, string> = {
  k2: "K–2 · Guided",
  g35: "Grades 3–5",
  g68: "Grades 6–8 · Open",
};

export interface TitleScreenProps {
  gallery: SavedBuddy[];
  resumeName: string | null;
  onResume: () => void;
  onStart: (band: Band) => void;
  onOpen: (buddy: SavedBuddy) => void;
  onDelete: (buddy: SavedBuddy) => void;
  reduced: boolean;
}

export default function TitleScreen({
  gallery,
  resumeName,
  onResume,
  onStart,
  onOpen,
  onDelete,
  reduced,
}: TitleScreenProps) {
  const { t, L, lang } = useBuddyLocale();
  return (
    <div className="flex flex-col items-center gap-5 py-6 px-4 w-full max-w-4xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-extrabold text-[#3a2e22] text-center">
        {t("biomeBuddy.title.tagline", {
          defaultValue: "What will you build?",
        })}
      </h2>
      <p className="text-base font-bold text-[#5a4c38] text-center max-w-xl">
        {t("biomeBuddy.title.intro", {
          defaultValue:
            "Pick a home, build a Buddy from real animal parts, and see what it can do there.",
        })}
      </p>

      {resumeName && (
        <button
          type="button"
          onClick={onResume}
          className="bb-primary min-h-14 px-8 rounded-full bg-teal-700 text-white font-extrabold text-lg shadow-[0_5px_0_#0b4f49] active:translate-y-1 active:shadow-none"
        >
          {t("biomeBuddy.title.resume", {
            defaultValue: "Keep building {{name}}",
            name: resumeName,
          })}
        </button>
      )}

      <section
        className="w-full flex flex-col items-center gap-3"
        aria-labelledby="bb-pick-level"
      >
        <h3
          id="bb-pick-level"
          className="text-lg font-extrabold text-[#3a2e22]"
        >
          {t("biomeBuddy.title.pickLevel", {
            defaultValue: "Pick your level to start a new Buddy",
          })}
        </h3>
        <div className="flex flex-wrap justify-center gap-3 w-full">
          {BANDS.map((band) => (
            <button
              key={band}
              type="button"
              onClick={() => onStart(band)}
              className="bb-primary min-h-14 px-6 rounded-2xl bg-white border-[3px] border-[#e1d0a6] shadow-[0_4px_0_#0002] font-extrabold text-[#3a2e22] text-lg active:translate-y-0.5 flex items-center gap-2"
            >
              <span className="text-2xl" aria-hidden>
                {BAND_EMOJI[band]}
              </span>
              {t(`biomeBuddy.title.band.${band}`, {
                defaultValue: BAND_FALLBACK[band],
              })}
            </button>
          ))}
        </div>
      </section>

      <section
        className="w-full flex flex-col items-center gap-3"
        aria-labelledby="bb-my-buddies"
      >
        <h3
          id="bb-my-buddies"
          className="text-lg font-extrabold text-[#3a2e22]"
        >
          {t("biomeBuddy.title.myBuddies", { defaultValue: "My Buddies" })}
        </h3>
        {gallery.length === 0 ? (
          <p className="text-[#6b5a42] font-bold">
            {t("biomeBuddy.title.empty", {
              defaultValue: "No Buddies yet — build one!",
            })}
          </p>
        ) : (
          <ul className="bb-gallery-grid grid gap-3 w-full">
            {gallery.map((buddy) => {
              const name = renderBuddyName(buddy.recipe.name, lang);
              const biome = L(BIOME_INFO[buddy.recipe.biome].label);
              return (
                <li
                  key={buddy.id}
                  className="rounded-2xl bg-white p-3 shadow-[0_4px_0_#0002] flex flex-col items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onOpen(buddy)}
                    className="flex flex-col items-center gap-1 w-full rounded-2xl active:scale-95"
                    aria-label={t("biomeBuddy.title.open", {
                      defaultValue: "Open {{name}}",
                      name,
                    })}
                  >
                    <BuddySprite
                      recipe={buddy.recipe}
                      size="md"
                      animate={!reduced}
                    />
                    <span className="font-extrabold text-[#3a2e22] truncate max-w-full">
                      {name}
                    </span>
                    <span className="text-xs font-bold text-[#6b5a42]">
                      <span aria-hidden>
                        {BIOME_EMOJI[buddy.recipe.biome]}{" "}
                      </span>
                      {biome}
                    </span>
                  </button>
                  <ShareButton
                    recipe={buddy.recipe}
                    name={name}
                    variant="secondary"
                  />
                  <button
                    type="button"
                    onClick={() => onDelete(buddy)}
                    className="min-h-11 px-4 rounded-full text-sm font-bold text-[#6b5a42] hover:bg-[#f3e6c4] active:scale-95"
                    aria-label={t("biomeBuddy.title.deleteAria", {
                      defaultValue: "Let it go: {{name}}",
                      name,
                    })}
                  >
                    {t("biomeBuddy.title.delete", {
                      defaultValue: "Let it go",
                    })}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
