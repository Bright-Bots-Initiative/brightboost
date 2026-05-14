import { useTranslation } from "react-i18next";
import Section from "./Section";

const WEEKS = [
  { week: 1, focus: "Orientation + Foundations", modules: "Cyber Foundations", notes: "Introductions, program overview, cohort norms, why cyber matters. Establish the 'many ways in' framing early.", minutes: 60 },
  { week: 2, focus: "Hands-On Safety", modules: "Digital Safety Sim + Worksheet 3 (Account Audit)", notes: "Let students discover phishing first, then debrief. Every student leaves with at least one MFA enabled.", minutes: 75 },
  { week: 3, focus: "How the Internet Works", modules: "Network Basics + Worksheet 4 (Network Map)", notes: "Hardest module — pace slowly. Use the packet-tracing group activity. Plan a mid-session stretch break.", minutes: 75 },
  { week: 4, focus: "Be the Analyst", modules: "Threat Detective + Worksheet 5 (IR Tabletop)", notes: "Pair students for log analysis. Walk through one entry together before letting them work alone.", minutes: 75 },
  { week: 5, focus: "Career Exploration + Cisco Bridge", modules: "Cyber Career Map + Cisco NetAcad setup + Worksheet 1 (Career Interest)", notes: "Create NetAcad accounts in session — not as homework. Capture each student's top role on the tracker.", minutes: 90 },
  { week: 6, focus: "Capstone + Showcase", modules: "Capstone + Worksheet 6 (Planning Doc) + Worksheet 7 (Roadmap)", notes: "Plan a showcase — invite partner staff, family, community. Students present their security plans.", minutes: 90 },
];

export default function SessionGuideTab() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Section
        title={t("pathways.resources.sessions.pacingTitle")}
        subtitle={t("pathways.resources.sessions.pacingSub")}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr className="text-left text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">{t("pathways.resources.sessions.tableHead.week")}</th>
                <th className="px-4 py-3">{t("pathways.resources.sessions.tableHead.focus")}</th>
                <th className="px-4 py-3">{t("pathways.resources.sessions.tableHead.modules")}</th>
                <th className="px-4 py-3">{t("pathways.resources.sessions.tableHead.notes")}</th>
                <th className="px-4 py-3">{t("pathways.resources.sessions.tableHead.minutes")}</th>
              </tr>
            </thead>
            <tbody>
              {WEEKS.map((w) => (
                <tr key={w.week} className="border-t border-slate-200 dark:border-slate-700/50 align-top">
                  <td className="px-4 py-3 font-bold text-indigo-700 dark:text-indigo-400">{w.week}</td>
                  <td className="px-4 py-3 text-slate-900 dark:text-slate-200">{w.focus}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300 text-xs">{w.modules}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{w.notes}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs">{w.minutes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={t("pathways.resources.sessions.variationsTitle")}>
        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-400 list-disc list-inside">
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Compressed (intensive):</strong> Two 90-minute sessions per week for 3 weeks. Best for summer programs and dedicated weeks.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Extended (every other week):</strong> One session every two weeks for 12 weeks. Best when the site has other competing programming.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Drop-in (open lab):</strong> Self-paced with facilitator office hours. Best for older Launch-band cohorts who want flexibility.
          </li>
        </ul>
      </Section>

      <Section title={t("pathways.resources.sessions.structureTitle")}>
        <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-400 list-decimal list-inside">
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Check-in (5-10 min):</strong> What did you do with last week's work? Anything come up?
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Frame (5 min):</strong> Today's module, why it matters, what students will leave with.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Module work (25-35 min):</strong> Individual or paired work in the platform.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Worksheet or discussion (15-25 min):</strong> Pair the digital work with a tactile or conversational follow-up.
          </li>
          <li>
            <strong className="text-slate-900 dark:text-slate-300">Close (5-10 min):</strong> One thing you learned, one thing you'll do this week, one question.
          </li>
        </ol>
      </Section>
    </div>
  );
}
