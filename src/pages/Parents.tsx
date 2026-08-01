/**
 * /parents — public page for parents & families.
 *
 * Replaces the AudiencePlaceholder for the Parents audience only (the
 * Students / Teachers / Organizations placeholders are untouched). Set and
 * game names come from the canonical constants in src/constants/stemSets.ts —
 * never duplicated here — so this page can't drift from the product.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import GameBackground from "@/components/GameBackground";
import {
  STEM_SET_1_IDS,
  STEM_SET_1_NAMES,
  STEM_SET_1_STRANDS,
  STEM_SET_2_IDS,
  STEM_SET_2_NAMES,
  STEM_SET_2_STRANDS,
  SET_LABELS,
} from "@/constants/stemSets";

const Parents = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("parents.docTitle", {
      defaultValue: "Bright Boost for Parents & Families",
    });
  }, [t]);

  const stages = [
    {
      key: "foundation",
      label: SET_LABELS[0],
      badge: t("parents.stages.availableNow", {
        defaultValue: "Available now",
      }),
      badgeClass: "bg-green-100 text-green-800",
      desc: t("parents.stages.foundationDesc", {
        defaultValue:
          "Structured, highly supported introductions to STEM ideas. Every activity guides children step by step.",
      }),
      games: STEM_SET_1_IDS.map((id) => ({
        name: STEM_SET_1_NAMES[id],
        strand: STEM_SET_1_STRANDS[id],
      })),
    },
    {
      key: "exploration",
      label: SET_LABELS[1],
      badge: t("parents.stages.afterFoundation", {
        defaultValue: "Opens after Foundation",
      }),
      badgeClass: "bg-blue-100 text-blue-800",
      desc: t("parents.stages.explorationDesc", {
        defaultValue:
          "Children predict, plan, test, measure, and revise — with more room to make their own choices.",
      }),
      games: STEM_SET_2_IDS.map((id) => ({
        name: STEM_SET_2_NAMES[id],
        strand: STEM_SET_2_STRANDS[id],
      })),
    },
    {
      key: "mastery",
      label: SET_LABELS[2],
      badge: t("parents.stages.inDevelopment", {
        defaultValue: "In development",
      }),
      badgeClass: "bg-amber-100 text-amber-800",
      desc: t("parents.stages.masteryDesc", {
        defaultValue:
          "Creation-first experiences built around Imagine → Create → Play → Share → Reflect. Children make things of their own.",
      }),
      games: [] as { name: string; strand: string }[],
    },
  ];

  return (
    <GameBackground>
      <main className="min-h-screen px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero */}
          <section className="rounded-2xl bg-white/90 p-8 shadow-lg border border-white/80">
            <h1 className="text-3xl md:text-4xl font-extrabold text-brightboost-navy">
              {t("parents.title", { defaultValue: "For Parents & Families" })}
            </h1>
            <p className="mt-3 text-lg text-brightboost-navy/85">
              {t("parents.subtitle", {
                defaultValue:
                  "Bright Boost is a multilingual STEM learning platform for kids — built for classrooms, after-school programs, and home.",
              })}
            </p>
          </section>

          {/* Where it fits */}
          <section className="rounded-2xl bg-white/90 p-8 shadow-lg border border-white/80">
            <h2 className="text-2xl font-bold text-brightboost-navy">
              {t("parents.fits.title", {
                defaultValue: "Where Bright Boost fits",
              })}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              {(
                [
                  {
                    key: "classroom",
                    title: t("parents.fits.classroom.title", {
                      defaultValue: "In the classroom",
                    }),
                    desc: t("parents.fits.classroom.desc", {
                      defaultValue:
                        "Teachers run sessions and see each child's progress.",
                    }),
                  },
                  {
                    key: "afterschool",
                    title: t("parents.fits.afterschool.title", {
                      defaultValue: "After school",
                    }),
                    desc: t("parents.fits.afterschool.desc", {
                      defaultValue:
                        "Program leaders use the same activities with small groups.",
                    }),
                  },
                  {
                    key: "home",
                    title: t("parents.fits.home.title", {
                      defaultValue: "At home",
                    }),
                    desc: t("parents.fits.home.desc", {
                      defaultValue:
                        "Families explore together — or kids explore on their own.",
                    }),
                  },
                ] as const
              ).map((item) => (
                <div
                  key={item.key}
                  className="rounded-xl border border-brightboost-blue/20 bg-white p-4"
                >
                  <h3 className="font-bold text-brightboost-navy">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-brightboost-navy/80">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Curriculum progression */}
          <section className="rounded-2xl bg-white/90 p-8 shadow-lg border border-white/80">
            <h2 className="text-2xl font-bold text-brightboost-navy">
              {t("parents.journey.title", {
                defaultValue: "How the learning is organized",
              })}
            </h2>
            <p className="mt-2 text-brightboost-navy/80">
              {t("parents.journey.intro", {
                defaultValue:
                  "Children move through three sets of activities. Each one builds on the last.",
              })}
            </p>
            <div className="mt-4 space-y-4">
              {stages.map((stage) => (
                <div
                  key={stage.key}
                  className="rounded-xl border border-brightboost-blue/20 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-brightboost-navy">
                      {stage.label}
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stage.badgeClass}`}
                    >
                      {stage.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-brightboost-navy/80">
                    {stage.desc}
                  </p>
                  {stage.games.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {stage.games.map((game) => (
                        <li
                          key={game.name}
                          className="text-xs rounded-full bg-brightboost-blue/10 text-brightboost-navy px-3 py-1"
                        >
                          <span className="font-semibold">{game.name}</span>
                          <span className="text-brightboost-navy/60">
                            {" "}
                            · {game.strand}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Adult role */}
          <section className="rounded-2xl bg-white/90 p-8 shadow-lg border border-white/80">
            <h2 className="text-2xl font-bold text-brightboost-navy">
              {t("parents.role.title", {
                defaultValue: "Your role: a guide, not a proctor",
              })}
            </h2>
            <p className="mt-2 text-brightboost-navy/80">
              {t("parents.role.p1", {
                defaultValue:
                  "Kids do best when a nearby adult is curious with them — not checking their answers.",
              })}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-brightboost-navy/80 list-disc pl-5">
              <li>
                {t("parents.role.b1", {
                  defaultValue:
                    "Ask what they notice and what they want to try.",
                })}
              </li>
              <li>
                {t("parents.role.b2", {
                  defaultValue: "Help with reading only when they ask.",
                })}
              </li>
              <li>
                {t("parents.role.b3", {
                  defaultValue:
                    "Let them experiment — unexpected results are part of the learning.",
                })}
              </li>
              <li>
                {t("parents.role.b4", {
                  defaultValue:
                    "Children can also explore entirely on their own.",
                })}
              </li>
            </ul>
            <div className="mt-4 rounded-xl border border-brightboost-blue/20 bg-brightboost-blue/5 p-4">
              <h3 className="font-bold text-brightboost-navy">
                {t("parents.guideCard.title", {
                  defaultValue: "K–2 Facilitator Quick Start",
                })}
              </h3>
              <p className="mt-1 text-sm text-brightboost-navy/80">
                {t("parents.guideCard.desc", {
                  defaultValue:
                    "A one-page printable guide for any adult sitting alongside a young learner.",
                })}
              </p>
              <Link
                to="/parents/guide"
                className="inline-block mt-2 text-brightboost-blue font-bold underline"
              >
                {t("parents.guideCard.open", {
                  defaultValue: "Open the guide",
                })}
              </Link>
            </div>
          </section>

          {/* CTAs */}
          <section className="rounded-2xl bg-white/90 p-8 shadow-lg border border-white/80">
            <h2 className="text-2xl font-bold text-brightboost-navy">
              {t("parents.cta.title", { defaultValue: "Get started" })}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link
                to="/try"
                className="rounded-xl bg-brightboost-blue text-white font-bold text-center px-4 py-3 hover:opacity-90"
              >
                {t("parents.cta.demo", {
                  defaultValue: "Try a game — no signup",
                })}
              </Link>
              <Link
                to="/student-login"
                className="rounded-xl border-2 border-brightboost-blue text-brightboost-blue font-bold text-center px-4 py-3 hover:bg-brightboost-blue/5"
              >
                {t("parents.cta.join", {
                  defaultValue: "Join with a class code",
                })}
              </Link>
              <Link
                to="/teacher/signup?intent=home"
                className="rounded-xl border-2 border-brightboost-blue text-brightboost-blue font-bold text-center px-4 py-3 hover:bg-brightboost-blue/5"
              >
                {t("parents.cta.home", { defaultValue: "Create a home group" })}
              </Link>
            </div>
            <Link
              to="/"
              className="inline-block mt-5 text-brightboost-blue font-bold underline"
            >
              {t("parents.backHome", { defaultValue: "Return to homepage" })}
            </Link>
          </section>
        </div>
      </main>
    </GameBackground>
  );
};

export default Parents;
