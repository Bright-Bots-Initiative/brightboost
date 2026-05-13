import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FAQ_CATEGORIES, type FaqCategory } from "../data/faqs";
import Section from "./Section";

export default function FaqsTab() {
  const [activeKey, setActiveKey] = useState<FaqCategory["key"]>("youth");
  const active = FAQ_CATEGORIES.find((c) => c.key === activeKey)!;

  return (
    <div className="space-y-6">
      <Section title="Frequently Asked Questions" subtitle="Real questions from real audiences. Use the answers as starting points — make them your own.">
        <div className="flex flex-wrap gap-2">
          {FAQ_CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setActiveKey(c.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeKey === c.key
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-700/50"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200"
              }`}
            >
              {c.label}
              <span className="ml-2 text-xs text-slate-500">{c.items.length}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={active.label} subtitle={active.description}>
        <div className="space-y-2">
          {active.items.map((item, i) => (
            <FaqItemRow key={i} q={item.question} a={item.answer} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function FaqItemRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-800/60 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 text-slate-500 shrink-0 mt-0.5 transition-transform ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        />
        <span className="text-sm font-medium text-slate-200">{q}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pl-11 text-sm text-slate-300 leading-relaxed">{a}</div>
      )}
    </div>
  );
}
