import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import Section from "./Section";

export default function OverviewTab() {
  const cyberTrack = PATHWAY_TRACKS.find((t) => t.slug === "cyber-launch");

  return (
    <div className="space-y-6">
      <Section title="What is Bright Boost Pathways?">
        <p>
          Bright Boost Pathways is a career-connected learning program for youth ages 14-17. It delivers hands-on, project-based modules across five tracks: cybersecurity, entrepreneurship, financial literacy, technology, and creative media.
        </p>
        <p>
          The program is designed for delivery in community settings, correctional education, workforce programs, and alternative schools — anywhere young people need real skills and real pathways forward.
        </p>
      </Section>

      <Section title="Two Bands">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-indigo-800/30 bg-indigo-900/10">
            <h4 className="font-semibold text-indigo-300">Explorer (Ages 14-15)</h4>
            <p className="text-sm text-slate-400 mt-1">
              Foundation skills, exposure, and discovery. Build confidence with hands-on activities.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-cyan-800/30 bg-cyan-900/10">
            <h4 className="font-semibold text-cyan-300">Launch (Ages 16-17)</h4>
            <p className="text-sm text-slate-400 mt-1">
              Credential prep, portfolio building, and career planning. Get ready for what comes next.
            </p>
          </div>
        </div>
      </Section>

      <Section title="How It Works">
        <div className="flex flex-wrap gap-3 text-sm">
          {[
            "Enroll in cohort",
            "Pick tracks",
            "Complete modules",
            "Earn milestones",
            "Build capstone",
            "Next steps",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs flex items-center justify-center font-bold">
                {i + 1}
              </span>
              <span className="text-slate-300">{step}</span>
              {i < 5 && <span className="text-slate-600">→</span>}
            </div>
          ))}
        </div>
      </Section>

      {cyberTrack && (
        <Section title="Cyber Launch Track (Active)" subtitle={cyberTrack.description}>
          <div className="space-y-2">
            {cyberTrack.modules.map((m, i) => (
              <div
                key={m.slug}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
              >
                <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{m.name}</p>
                  <p className="text-xs text-slate-500">
                    {m.description} • {m.duration}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Key Talking Points">
        <ul className="space-y-2 text-sm text-slate-400 list-disc list-inside">
          <li>Nearly 470,000 cybersecurity jobs are open in the U.S. right now (NIST CyberSeek).</li>
          <li>
            You don't need a 4-year degree to start — free industry certifications like ISC2 Certified in Cybersecurity open real doors.
          </li>
          <li>This program builds real skills students can put on a resume — not just enrichment.</li>
          <li>
            Major employers — IBM, Apple, Amazon — have dropped degree requirements for many tech roles.
          </li>
        </ul>
      </Section>

      <Section title="Where to Start as a New Facilitator">
        <ol className="space-y-2 text-sm text-slate-400 list-decimal list-inside">
          <li>Read this Program Overview tab end to end.</li>
          <li>Read the Module Guide for Module 1 (Cyber Foundations) — it sets tone for the whole program.</li>
          <li>Read the Facilitation Tips tab, especially "Setting Tone Day One."</li>
          <li>Print the worksheets you'll need for week 1 and 2 ahead of time.</li>
          <li>Create your own Cisco NetAcad account so you can guide students through it.</li>
          <li>Have the partner organization's support contacts handy for referrals.</li>
        </ol>
      </Section>
    </div>
  );
}
