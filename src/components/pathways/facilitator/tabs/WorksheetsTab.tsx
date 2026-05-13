import { FileText, Printer } from "lucide-react";
import { WORKSHEETS, openWorksheetPrint } from "../data/worksheets";
import Section from "./Section";

export default function WorksheetsTab() {
  return (
    <div className="space-y-6">
      <Section title="Printable Worksheets" subtitle="Each opens in a new tab as a print-ready document. Facilitator notes are visible on screen but hidden in print.">
        <p className="text-sm text-slate-400">
          Worksheets are designed to pair with specific modules. The Session Guide tab shows which
          worksheet matches each week. Print ahead of session — students who fill them out by hand
          retain more than those who type.
        </p>
      </Section>

      <div className="grid gap-3 md:grid-cols-2">
        {WORKSHEETS.map((w) => (
          <WorksheetCard key={w.id} {...w} />
        ))}
      </div>

      <Section title="Print Tips">
        <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
          <li>Worksheets open in a new tab and auto-trigger the browser print dialog.</li>
          <li>If the print dialog doesn't open, press Ctrl/Cmd+P in the new tab.</li>
          <li>Facilitator notes (in dashed cyan boxes) are hidden when printing.</li>
          <li>For double-sided printing, choose "Long edge" binding in your printer settings.</li>
          <li>If you want a clean PDF, choose "Save as PDF" instead of a physical printer.</li>
        </ul>
      </Section>
    </div>
  );
}

function WorksheetCard({
  number,
  title,
  description,
  duration,
  buildHtml,
}: {
  number: number;
  title: string;
  description: string;
  duration: string;
  buildHtml: () => string;
}) {
  const handlePrint = () => {
    openWorksheetPrint(buildHtml());
  };

  return (
    <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/50 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">Worksheet {number}</p>
        <p className="font-medium text-slate-200 text-sm">{title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{description}</p>
        <p className="text-xs text-slate-500 mt-1">{duration}</p>
      </div>
      <button
        onClick={handlePrint}
        aria-label={`Print worksheet ${title}`}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors shrink-0"
      >
        <Printer className="w-3.5 h-3.5" />
        Print
      </button>
    </div>
  );
}
