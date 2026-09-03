/** Progress dots across the top (design §2): Choose · Create · Test · Name. */
import { useBuddyLocale } from "./useBuddyLocale";

export const STEPS = ["choose", "create", "test", "name"] as const;
export type Step = (typeof STEPS)[number];

const FALLBACK: Record<Step, string> = {
  choose: "Choose",
  create: "Create",
  test: "Test",
  name: "Name",
};

export default function ProgressDots({ current }: { current: Step }) {
  const { t } = useBuddyLocale();
  const index = STEPS.indexOf(current);
  return (
    <ol
      className="bb-dots flex items-center justify-center gap-2 sm:gap-3 w-full"
      aria-label={t("biomeBuddy.steps.aria", {
        defaultValue: "Step {{n}} of {{total}}: {{label}}",
        n: index + 1,
        total: STEPS.length,
        label: t(`biomeBuddy.steps.${current}`, {
          defaultValue: FALLBACK[current],
        }),
      })}
    >
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li
            key={step}
            aria-current={active ? "step" : undefined}
            className={`flex items-center gap-1 text-xs sm:text-sm font-extrabold ${active ? "text-[#1c3d6c]" : done ? "text-green-700" : "text-[#6b5a42]"}`}
          >
            <span
              aria-hidden
              className={`inline-block w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 ${active ? "bg-[#1c3d6c] border-[#1c3d6c]" : done ? "bg-green-500 border-green-600" : "bg-white border-[#c9b89a]"}`}
            />
            <span className={active ? "" : "hidden sm:inline"}>
              {t(`biomeBuddy.steps.${step}`, { defaultValue: FALLBACK[step] })}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
