/**
 * /biome-buddy/review — reviewer entry for the Biome Buddy prototype.
 *
 * A small optional intro, then the REAL child-facing experience (unchanged).
 * Unlisted, not authenticated: there is no client-side secret and nothing
 * here pretends to be one. Nothing on this page or the game talks to a
 * backend; everything a reviewer builds stays in their own browser.
 */
import { Link } from "react-router-dom";
import { BiomeBuddyShell } from "./BiomeBuddy";
import { useBuddyLocale } from "@/components/biomeBuddy/useBuddyLocale";
import {
  buildRemixUrl,
  encodeShare,
  SHARE_PATH,
} from "@/components/biomeBuddy/biomeBuddyShare";
import type { BuddyRecipe } from "@/components/biomeBuddy/biomeBuddyModel";

/** A fixed sample so reviewers can see the share presentation without
 *  building first. Closed-enum ids only. */
export const REVIEW_SAMPLE_RECIPE: BuddyRecipe = {
  version: 1,
  biome: "water",
  traits: {
    eyes: "wide_set_eyes",
    ears: "tympanum",
    nose: "gills",
    movement: "webbed_feet",
    covering: "smooth_scales",
  },
  pattern: "countershading",
  name: { adjective: "swift", noun: "splasher" },
};

export default function BiomeBuddyReview() {
  const { t } = useBuddyLocale();
  const sampleShare = `${SHARE_PATH}#r=${encodeShare(REVIEW_SAMPLE_RECIPE)}`;
  const notices = [
    t("biomeBuddy.review.notice1", {
      defaultValue:
        "Every part is real biology; every bar is fit, not a grade — there is no right build.",
    }),
    t("biomeBuddy.review.notice2", {
      defaultValue:
        "K–2 · Guided opens two parts first and unlocks more each time a child tests a change.",
    }),
    t("biomeBuddy.review.notice3", {
      defaultValue:
        "Test & Learn explains each bar that moved, in kid sentences, with the science underneath.",
    }),
    t("biomeBuddy.review.notice4", {
      defaultValue:
        "Share a Buddy by link; the link carries only the recipe, and opening it gives you a copy to remix.",
    }),
  ];

  return (
    <BiomeBuddyShell
      subtitle={t("biomeBuddy.review.subtitle", {
        defaultValue: "Reviewer preview",
      })}
    >
      <div className="flex flex-col items-center gap-5 py-8 px-4 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-extrabold text-[#1c3d6c]">
          {t("biomeBuddy.review.title", {
            defaultValue: "Biome Buddy Prototype",
          })}
        </h2>
        <p className="text-lg font-bold text-[#3a2e22]">
          {t("biomeBuddy.review.intro", {
            defaultValue:
              "Build an organism for a biome, see how its adaptations change what it can do, and experiment with another design.",
          })}
        </p>
        <Link
          to="/biome-buddy"
          className="bb-btn bb-primary inline-flex items-center justify-center min-h-14 px-10 rounded-full bg-teal-700 text-white text-xl font-extrabold shadow-[0_5px_0_#0b4f49] active:translate-y-1 active:shadow-none"
          data-testid="review-start"
        >
          {t("biomeBuddy.review.start", { defaultValue: "Start Biome Buddy" })}
        </Link>
        <Link
          to={sampleShare}
          className="bb-btn inline-flex items-center justify-center min-h-11 px-5 rounded-full bg-white font-bold text-[#3a2e22] shadow active:scale-95"
          data-testid="review-example"
        >
          {t("biomeBuddy.review.example", {
            defaultValue: "See an example shared Buddy",
          })}
        </Link>
        <section
          className="w-full rounded-2xl bg-white/80 p-4 text-left"
          aria-labelledby="bb-review-notice"
        >
          <h3
            id="bb-review-notice"
            className="text-base font-extrabold text-[#3a2e22] mb-2"
          >
            {t("biomeBuddy.review.noticeHeading", {
              defaultValue: "Things to notice",
            })}
          </h3>
          <ul className="list-disc pl-5 flex flex-col gap-1 text-sm font-bold text-[#3a2e22]">
            {notices.map((notice) => (
              <li key={notice}>{notice}</li>
            ))}
          </ul>
        </section>
        <p className="text-xs font-bold text-[#6f6048] max-w-md">
          {t("biomeBuddy.review.note", {
            defaultValue:
              "This is a prototype: everything you build stays in this browser, and nothing is sent anywhere. The link is unlisted, not private.",
          })}
        </p>
        <p className="sr-only">{buildRemixUrl(REVIEW_SAMPLE_RECIPE)}</p>
      </div>
    </BiomeBuddyShell>
  );
}
