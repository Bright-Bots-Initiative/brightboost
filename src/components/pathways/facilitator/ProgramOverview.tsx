/**
 * Program Overview + Session Guide + Resources for Pathways facilitators.
 */
import { useState } from "react";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import { BookOpen, Calendar, FileText, Printer } from "lucide-react";

export default function ProgramOverview() {
  const [tab, setTab] = useState<"overview" | "sessions" | "resources">("overview");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-100">Facilitator Resources</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { key: "overview", label: "Program Overview", icon: <BookOpen className="w-4 h-4" /> },
          { key: "sessions", label: "Session Guide", icon: <Calendar className="w-4 h-4" /> },
          { key: "resources", label: "Printables", icon: <FileText className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "sessions" && <SessionGuideTab />}
      {tab === "resources" && <ResourcesTab />}
    </div>
  );
}

function OverviewTab() {
  const cyberTrack = PATHWAY_TRACKS.find((t) => t.slug === "cyber-launch");

  return (
    <div className="space-y-6">
      <Section title="What is Bright Boost Pathways?">
        <p>Bright Boost Pathways is a career-connected learning program for youth ages 14-17. It delivers hands-on, project-based modules across five tracks: cybersecurity, entrepreneurship, financial literacy, technology, and creative media.</p>
        <p className="mt-2">The program is designed for delivery in community settings, correctional education, workforce programs, and alternative schools — anywhere young people need real skills and real pathways forward.</p>
      </Section>

      <Section title="Two Bands">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-indigo-800/30 bg-indigo-900/10">
            <h4 className="font-semibold text-indigo-300">Explorer (Ages 14-15)</h4>
            <p className="text-sm text-slate-400 mt-1">Foundation skills, exposure, and discovery. Build confidence with hands-on activities.</p>
          </div>
          <div className="p-4 rounded-xl border border-cyan-800/30 bg-cyan-900/10">
            <h4 className="font-semibold text-cyan-300">Launch (Ages 16-17)</h4>
            <p className="text-sm text-slate-400 mt-1">Credential prep, portfolio building, and career planning. Get ready for what comes next.</p>
          </div>
        </div>
      </Section>

      <Section title="How It Works">
        <div className="flex flex-wrap gap-3 text-sm">
          {["Enroll in cohort", "Pick tracks", "Complete modules", "Earn milestones", "Build capstone", "Next steps"].map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 text-xs flex items-center justify-center font-bold">{i + 1}</span>
              <span className="text-slate-300">{step}</span>
              {i < 5 && <span className="text-slate-600">→</span>}
            </div>
          ))}
        </div>
      </Section>

      {cyberTrack && (
        <Section title="Cyber Launch Track (Active)">
          <p className="text-sm text-slate-400 mb-4">{cyberTrack.description}</p>
          <div className="space-y-2">
            {cyberTrack.modules.map((m, i) => (
              <div key={m.slug} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-slate-200">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.description} • {m.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Facilitation Tips">
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• Start each session with a 5-minute group discussion about what they learned last time</li>
          <li>• Let students work at their own pace — they'll naturally form small groups</li>
          <li>• Use the capstone as a presentation opportunity — invite community members</li>
          <li>• Check the progress dashboard weekly to identify students who are stuck</li>
        </ul>
      </Section>

      <Section title="Key Talking Points">
        <ul className="space-y-2 text-sm text-slate-400">
          <li>• "Nearly 470,000 cybersecurity jobs are open in the U.S. right now"</li>
          <li>• "You don't need a 4-year degree to start — certifications like ISC2 CC are free to earn"</li>
          <li>• "This program builds real skills you can put on a resume"</li>
        </ul>
      </Section>
    </div>
  );
}

function SessionGuideTab() {
  const weeks = [
    { week: 1, focus: "Orientation + Foundations", modules: "Cyber Foundations", notes: "Introductions, program overview, why cyber matters" },
    { week: 2, focus: "Hands-On Safety", modules: "Digital Safety Sim", notes: "Let students discover phishing on their own first, then debrief" },
    { week: 3, focus: "How the Internet Works", modules: "Network Basics", notes: "Use the packet-tracing activity as a group exercise" },
    { week: 4, focus: "Be the Analyst", modules: "Threat Detective", notes: "Pair students up for the log analysis — collaborative learning" },
    { week: 5, focus: "Career Exploration", modules: "Cyber Career Map + Cisco Link", notes: "Have students share their top 2 career interests with the group" },
    { week: 6, focus: "Capstone + Showcase", modules: "Capstone: My Security Plan", notes: "Students present their security plans to the cohort" },
  ];

  return (
    <div className="space-y-6">
      <Section title="6-Week Pacing Guide">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Week</th>
                <th className="px-4 py-3">Focus</th>
                <th className="px-4 py-3">Modules</th>
                <th className="px-4 py-3">Facilitation Notes</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week} className="border-t border-slate-700/50">
                  <td className="px-4 py-3 font-bold text-indigo-400">{w.week}</td>
                  <td className="px-4 py-3 text-slate-200">{w.focus}</td>
                  <td className="px-4 py-3 text-slate-300">{w.modules}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{w.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function ResourcesTab() {
  const printSection = (title: string, content: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${title}</title><style>body{font-family:system-ui;max-width:800px;margin:2rem auto;padding:0 1rem}h1{font-size:1.5rem}h2{font-size:1.2rem;margin-top:1.5rem}ul{padding-left:1.5rem}li{margin:0.3rem 0}@media print{body{margin:0}}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      <Section title="Printable Resources">
        <div className="grid gap-4 md:grid-cols-2">
          <ResourceCard
            title="Program Overview (1-page)"
            desc="Hand out to partners, parents, or administrators"
            onPrint={() => printSection("Bright Boost Pathways", "<h1>Bright Boost Pathways</h1><p>Career-connected learning for youth ages 14-17.</p><h2>Tracks</h2><ul><li>Cyber Launch — Cybersecurity foundations and career prep</li><li>Build Your Own Lane — Entrepreneurship and opportunity</li><li>Money Moves — Financial literacy and economic power</li><li>Future Tech Lab — AI, data, and digital skills</li><li>Creative Media Lab — Digital storytelling and production</li></ul><h2>How It Works</h2><p>Students enroll in a cohort, complete modules at their own pace, build a capstone project, and earn milestones toward career readiness.</p>")}
          />
          <ResourceCard
            title="Discussion Questions"
            desc="5 before/after questions per Cyber Launch module"
            onPrint={() => printSection("Discussion Questions", "<h1>Cyber Launch — Discussion Questions</h1><h2>Cyber Foundations</h2><ul><li>What do you think cybersecurity means?</li><li>Have you ever had an account hacked or heard of a data breach?</li><li>What surprised you about the number of open cyber jobs?</li><li>Which cyber role sounds most interesting to you?</li><li>Why do you think companies struggle to fill these positions?</li></ul><h2>Digital Safety Sim</h2><ul><li>How do you currently protect your passwords?</li><li>Have you ever received a suspicious email or message?</li><li>What would you do if someone called claiming to be IT support?</li><li>Why is public Wi-Fi risky for certain activities?</li><li>What are the first 3 things you should do after a data breach?</li></ul>")}
          />
          <ResourceCard
            title="Student Progress Tracker"
            desc="Printable checklist for tracking module completion"
            onPrint={() => printSection("Progress Tracker", "<h1>Student Progress Tracker</h1><p>Name: _________________________ Cohort: _________________________</p><h2>Cyber Launch Track</h2><table border='1' cellpadding='8' cellspacing='0' width='100%'><tr><th>Module</th><th>Started</th><th>Completed</th><th>Score</th></tr><tr><td>Cyber Foundations</td><td>☐</td><td>☐</td><td></td></tr><tr><td>Digital Safety Sim</td><td>☐</td><td>☐</td><td></td></tr><tr><td>Network Basics</td><td>☐</td><td>☐</td><td></td></tr><tr><td>Threat Detective</td><td>☐</td><td>☐</td><td></td></tr><tr><td>Cyber Career Map</td><td>☐</td><td>☐</td><td></td></tr><tr><td>Cisco Networking Academy</td><td>☐</td><td>☐</td><td></td></tr><tr><td>Capstone: My Security Plan</td><td>☐</td><td>☐</td><td></td></tr></table>")}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <h3 className="font-semibold text-slate-200 mb-3">{title}</h3>
      <div className="text-sm text-slate-400">{children}</div>
    </div>
  );
}

function ResourceCard({ title, desc, onPrint }: { title: string; desc: string; onPrint: () => void }) {
  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 flex items-start gap-3">
      <FileText className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-slate-200 text-sm">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={onPrint} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 transition-colors">
        <Printer className="w-3 h-3" /> Print
      </button>
    </div>
  );
}
