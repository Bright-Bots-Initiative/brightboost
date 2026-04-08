/**
 * Pathways About — public landing page for the Pathways program.
 */
import { Link } from "react-router-dom";
import { PATHWAY_TRACKS } from "@/constants/pathwayTracks";
import { Shield, Rocket, DollarSign, Cpu, Film, Users, BarChart3, Award, ArrowRight } from "lucide-react";

const ICONS: Record<string, React.ReactNode> = {
  Shield: <Shield className="w-6 h-6" />,
  Rocket: <Rocket className="w-6 h-6" />,
  DollarSign: <DollarSign className="w-6 h-6" />,
  Cpu: <Cpu className="w-6 h-6" />,
  Film: <Film className="w-6 h-6" />,
};

export default function PathwaysAbout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-cyan-900/30" />
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-300 font-medium mb-4">Bright Boost</p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Pathways</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-2">Real pathways for real futures.</p>
          <p className="text-slate-400 max-w-xl mx-auto mb-6">
            Career-connected learning for 14-17 year olds. Cybersecurity, entrepreneurship, financial literacy, tech, and creative media — delivered through cohort-based programs with facilitator support.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Log In or Join <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Tracks */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Five Tracks. Your Choice.</h2>
        <p className="text-sm text-slate-400 text-center mb-10">Each track builds real skills and connects to real careers.</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PATHWAY_TRACKS.map((track) => (
            <div key={track.slug} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: track.color + "15", color: track.color }}>
                {ICONS[track.icon]}
              </div>
              <h3 className="font-semibold text-slate-100 mb-1">{track.name}</h3>
              <p className="text-xs text-slate-400 mb-2">{track.tagline}</p>
              <div className="flex gap-1">
                {track.bands.map((b) => (
                  <span key={b} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 capitalize">{b}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bands */}
      <div className="bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-8">
          <div className="p-6 rounded-xl border border-indigo-800/30 bg-indigo-900/10">
            <h3 className="font-bold text-lg text-indigo-300 mb-2">Explorer Band (Ages 14-15)</h3>
            <p className="text-sm text-slate-400">Foundation skills, exposure, and discovery. Build confidence with hands-on activities and find what excites you.</p>
          </div>
          <div className="p-6 rounded-xl border border-cyan-800/30 bg-cyan-900/10">
            <h3 className="font-bold text-lg text-cyan-300 mb-2">Launch Band (Ages 16-17)</h3>
            <p className="text-sm text-slate-400">Credential prep, portfolio building, and career planning. Get ready for what comes next — college, certification, or career.</p>
          </div>
        </div>
      </div>

      {/* For Partners */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">For Program Partners</h2>
        <p className="text-sm text-slate-400 text-center mb-10">Deliver Pathways in your community, school, or workforce program.</p>

        <div className="grid md:grid-cols-3 gap-6">
          <Feature icon={<Users className="w-5 h-5" />} title="Cohort Delivery" desc="Create cohorts, assign tracks, and manage enrollment with join codes." />
          <Feature icon={<BarChart3 className="w-5 h-5" />} title="Facilitator Dashboard" desc="Track learner progress, completion rates, and engagement in real time." />
          <Feature icon={<Award className="w-5 h-5" />} title="Credential Prep" desc="Cisco NetAcad integration, ISC2 CC pathway, and portfolio artifacts." />
        </div>

        <div className="text-center mt-12">
          <a
            href="mailto:partnerships@brightboost.org?subject=Pathways%20Pilot%20Interest"
            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Request a Pilot <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-800 py-8 text-center text-xs text-slate-600">
        Bright Boost Pathways — A program of Bright Bots Initiative
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="text-indigo-400 mb-2">{icon}</div>
      <h3 className="font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-xs text-slate-400">{desc}</p>
    </div>
  );
}
