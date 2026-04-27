import { type ControlInstructionsModel } from "./controlInstructions";

type ControlInstructionsProps = {
  id?: string;
  headingId?: string;
  instructions: ControlInstructionsModel;
  className?: string;
};

function InstructionGroup({
  label,
  items,
}: {
  label: string;
  items?: string[];
}) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
        {items.map((item, index) => (
          <li key={`${label}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ControlInstructions({
  id,
  headingId,
  instructions,
  className,
}: ControlInstructionsProps) {
  const resolvedHeadingId = headingId ?? `${id ?? "game"}-instructions-heading`;

  return (
    <section
      id={id}
      aria-labelledby={resolvedHeadingId}
      tabIndex={0}
      className={`rounded-xl border bg-blue-50/60 p-4 ${className ?? ""}`.trim()}
    >
      <h3 id={resolvedHeadingId} className="text-base font-bold text-slate-900">
        How to play
      </h3>
      <div className="mt-3 space-y-3">
        <InstructionGroup label="Keyboard" items={instructions.keyboard} />
        <InstructionGroup label="Touch" items={instructions.touch} />
        <InstructionGroup label="Buttons" items={instructions.buttons} />
        <InstructionGroup label="Screen reader" items={instructions.screenReader} />
      </div>
    </section>
  );
}
