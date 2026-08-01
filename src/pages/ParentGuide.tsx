/**
 * /parents/guide — public, print-friendly K–2 Facilitator Quick Start.
 *
 * One source of truth for the guide: the parents page and Teacher Resources
 * both link HERE rather than carrying their own copies. Print styling uses
 * Tailwind `print:` utilities (same pattern as TeacherModulePrep); the Print
 * button calls window.print() on click — never automatically.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Printer, ChevronLeft } from "lucide-react";

const ParentGuide = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t("parentGuide.docTitle", {
      defaultValue: "K–2 Facilitator Quick Start — Bright Boost",
    });
  }, [t]);

  const sections = [
    {
      key: "before",
      title: t("parentGuide.before.title", {
        defaultValue: "Before you start (2 minutes)",
      }),
      items: [
        t("parentGuide.before.b1", {
          defaultValue:
            "Open the activity once yourself so you know what the child will see.",
        }),
        t("parentGuide.before.b2", {
          defaultValue:
            "Check the device: charged, connected, sound on if you have it.",
        }),
        t("parentGuide.before.b3", {
          defaultValue:
            'Invite curiosity: "We get to try something new today."',
        }),
      ],
    },
    {
      key: "during",
      title: t("parentGuide.during.title", { defaultValue: "While they play" }),
      items: [
        t("parentGuide.during.b1", {
          defaultValue:
            "Help with reading only when the child asks or gets stuck.",
        }),
        t("parentGuide.during.b2", {
          defaultValue: "Ask wondering questions instead of giving answers.",
        }),
        t("parentGuide.during.b3", {
          defaultValue:
            'Encourage experimenting — trying, changing, and even "breaking" things is how the games are meant to be played.',
        }),
        t("parentGuide.during.b4", {
          defaultValue:
            'If they ask you for the answer, try: "What could we try to find out?"',
        }),
      ],
    },
    {
      key: "after",
      title: t("parentGuide.after.title", { defaultValue: "Afterwards" }),
      items: [
        t("parentGuide.after.b1", {
          defaultValue: "Ask what they noticed and what surprised them.",
        }),
        t("parentGuide.after.b2", {
          defaultValue: "Ask what they changed, made, or figured out.",
        }),
        t("parentGuide.after.b3", {
          defaultValue: "Ask what they want to try next time.",
        }),
      ],
    },
  ];

  const prompts = [
    t("parentGuide.prompts.p1", { defaultValue: "What do you notice?" }),
    t("parentGuide.prompts.p2", {
      defaultValue: "What do you think will happen if…?",
    }),
    t("parentGuide.prompts.p3", {
      defaultValue: "How did you figure that out?",
    }),
    t("parentGuide.prompts.p4", {
      defaultValue: "What would you change next time?",
    }),
    t("parentGuide.prompts.p5", {
      defaultValue: "Can you show me what you made?",
    }),
    t("parentGuide.prompts.p6", { defaultValue: "What surprised you?" }),
    t("parentGuide.prompts.p7", {
      defaultValue: "What do you want to try next?",
    }),
  ];

  return (
    <main className="min-h-screen bg-white px-4 py-8 print:p-0">
      <div className="max-w-2xl mx-auto">
        {/* Screen-only chrome */}
        <div className="print:hidden flex items-center justify-between mb-6">
          <Link
            to="/parents"
            className="inline-flex items-center text-sm text-brightboost-blue font-bold hover:underline"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t("parentGuide.back", { defaultValue: "Back" })}
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            {t("parentGuide.print", { defaultValue: "Print this guide" })}
          </button>
        </div>

        {/* Printable content */}
        <header className="print:break-inside-avoid">
          <h1 className="text-2xl font-extrabold text-brightboost-navy">
            {t("parentGuide.title", {
              defaultValue: "K–2 Facilitator Quick Start",
            })}
          </h1>
          <p className="mt-1 text-sm text-brightboost-navy/75">
            {t("parentGuide.subtitle", {
              defaultValue:
                "For any adult alongside a young learner — parents, tutors, program leaders, and teachers.",
            })}
          </p>
        </header>

        <div className="mt-6 space-y-5">
          {sections.map((section) => (
            <section key={section.key} className="print:break-inside-avoid">
              <h2 className="text-lg font-bold text-brightboost-navy border-b border-gray-200 pb-1">
                {section.title}
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-800 list-disc pl-5">
                {section.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <section className="print:break-inside-avoid rounded-xl border border-brightboost-blue/30 bg-brightboost-blue/5 p-4 print:bg-white">
            <h2 className="text-lg font-bold text-brightboost-navy">
              {t("parentGuide.prompts.title", {
                defaultValue: "Prompts you can use as-is",
              })}
            </h2>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 text-sm text-gray-800">
              {prompts.map((prompt, i) => (
                <li key={i} className="italic">
                  &ldquo;{prompt}&rdquo;
                </li>
              ))}
            </ul>
          </section>

          <p className="print:break-inside-avoid text-sm text-gray-700 border-l-4 border-brightboost-blue/40 pl-3">
            {t("parentGuide.independence", {
              defaultValue:
                "You don't have to be there the whole time. The activities are built so a child can explore on their own — your curiosity is a bonus, not a requirement.",
            })}
          </p>

          <p className="hidden print:block text-xs text-gray-400 pt-2">
            {t("parentGuide.footer", { defaultValue: "brightboost.org" })}
          </p>
        </div>
      </div>
    </main>
  );
};

export default ParentGuide;
