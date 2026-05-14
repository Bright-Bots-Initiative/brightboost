import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MODULE_GUIDES, type ModuleGuide } from "../data/moduleGuides";
import Section from "./Section";

export default function ModuleGuidesTab() {
  const { t } = useTranslation();
  const [openSlug, setOpenSlug] = useState<string | null>(MODULE_GUIDES[0]?.slug ?? null);

  return (
    <div className="space-y-6">
      <Section
        title={t("pathways.resources.moduleGuides.introTitle")}
        subtitle={t("pathways.resources.moduleGuides.introSub")}
      >
        <p className="text-sm text-slate-700 dark:text-slate-400">
          {t("pathways.resources.moduleGuides.introBody")}
        </p>
      </Section>

      <div className="space-y-3">
        {MODULE_GUIDES.map((guide) => (
          <GuideAccordion
            key={guide.slug}
            guide={guide}
            open={openSlug === guide.slug}
            onToggle={() => setOpenSlug(openSlug === guide.slug ? null : guide.slug)}
          />
        ))}
      </div>
    </div>
  );
}

function GuideAccordion({
  guide,
  open,
  onToggle,
}: {
  guide: ModuleGuide;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const translatedName = t(`pathways.tracks.modules.${guide.slug}.name`, guide.name) as string;

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/50 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
        )}
        <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-600/20 dark:text-indigo-300 text-xs flex items-center justify-center font-bold shrink-0">
          {guide.number}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 dark:text-slate-100">{translatedName}</p>
          <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5 truncate">
            {guide.whatItTeaches.split(".")[0]}.
          </p>
        </div>
      </button>

      {open && <GuideBody guide={guide} />}
    </div>
  );
}

function GuideBody({ guide }: { guide: ModuleGuide }) {
  const { t } = useTranslation();

  return (
    <div className="px-5 pb-5 pt-1 space-y-5 border-t border-slate-200 dark:border-slate-700/50">
      <Block title={t("pathways.resources.moduleGuides.blocks.whatItTeaches")}>
        <p className="text-sm text-slate-700 dark:text-slate-300">{guide.whatItTeaches}</p>
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.whyItMatters")}>
        {guide.whyItMatters.map((p, i) => (
          <p key={i} className="text-sm text-slate-700 dark:text-slate-300 mt-2 first:mt-0">
            {p}
          </p>
        ))}
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.timeRequired")}>
        <p className="text-sm text-slate-700 dark:text-slate-300">{guide.timeRequired}</p>
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.whatToExpect")}>
        <ul className="list-disc list-outside pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
          {guide.whatToExpect.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.facilitatorRole")}>
        <RolePhase label={t("pathways.resources.moduleGuides.blocks.facilitatorBefore")} items={guide.facilitatorRole.before} />
        <RolePhase label={t("pathways.resources.moduleGuides.blocks.facilitatorDuring")} items={guide.facilitatorRole.during} />
        <RolePhase label={t("pathways.resources.moduleGuides.blocks.facilitatorAfter")} items={guide.facilitatorRole.after} />
      </Block>

      <div className="grid md:grid-cols-2 gap-4">
        <Block title={t("pathways.resources.moduleGuides.blocks.discussionBefore")}>
          <ol className="list-decimal list-outside pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {guide.discussionBefore.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Block>
        <Block title={t("pathways.resources.moduleGuides.blocks.discussionAfter")}>
          <ol className="list-decimal list-outside pl-5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {guide.discussionAfter.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </Block>
      </div>

      <Block title={t("pathways.resources.moduleGuides.blocks.stickingPoints")}>
        <div className="space-y-3">
          {guide.stickingPoints.map((sp, i) => (
            <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-slate-900/50 dark:border-slate-700/50">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{sp.point}</p>
              <p className="text-sm text-slate-700 dark:text-slate-400 mt-1">{sp.guidance}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.extensions")}>
        <ul className="list-disc list-outside pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
          {guide.extensions.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.realWorld")}>
        <p className="text-sm text-slate-700 dark:text-slate-300 italic">{guide.realWorld}</p>
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.vocabulary")}>
        <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {guide.vocabulary.map((v, i) => (
            <div key={i}>
              <dt className="font-semibold text-cyan-700 dark:text-cyan-300">{v.term}</dt>
              <dd className="text-slate-600 dark:text-slate-400 text-xs">{v.definition}</dd>
            </div>
          ))}
        </dl>
      </Block>

      <Block title={t("pathways.resources.moduleGuides.blocks.redFlags")}>
        <ul className="list-disc list-outside pl-5 space-y-1 text-sm text-rose-700 dark:text-rose-300/90">
          {guide.redFlags.map((rf, i) => (
            <li key={i}>{rf}</li>
          ))}
        </ul>
      </Block>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-500 mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function RolePhase({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">{label}</p>
      <ul className="list-disc list-outside pl-5 space-y-1 text-sm text-slate-700 dark:text-slate-300">
        {items.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
