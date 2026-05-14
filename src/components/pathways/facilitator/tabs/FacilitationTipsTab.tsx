import { FACILITATION_TIPS } from "../data/facilitationTips";
import Section from "./Section";

export default function FacilitationTipsTab() {
  return (
    <div className="space-y-6">
      <Section title="Facilitation Tips" subtitle="Practical guidance for the situations that arise in real cohorts.">
        <p className="text-sm text-slate-400">
          These tips were written by program staff with input from partner facilitators. They are
          starting points, not strict rules. Adapt to your cohort, your site, and your own style.
          Sensitive sections (trauma-informed practice, justice-impacted youth) are worth reviewing
          with your partner organization's clinical or program leadership before applying at scale.
        </p>
      </Section>

      {FACILITATION_TIPS.map((section) => (
        <Section key={section.id} title={section.title} subtitle={section.intro} id={section.id}>
          <div className="space-y-4 mt-3">
            {section.bullets.map((b, i) => (
              <div key={i} className="border-l-2 border-indigo-700/50 pl-4">
                <p className="text-sm font-semibold text-slate-200">{b.heading}</p>
                <p className="text-sm text-slate-400 mt-1 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </Section>
      ))}
    </div>
  );
}
