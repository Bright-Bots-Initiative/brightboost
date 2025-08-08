import { t } from '../lib/i18n';

type Props = {
  moduleTitle: string;
  percent: number;
  onContinue: () => void;
  subtitle?: string;
};
export default function ContinueModuleCard({ moduleTitle, percent, onContinue, subtitle }: Props) {
  return (
    <div className="rounded-2xl border p-4 flex items-center justify-between">
      <div>
        <div className="text-sm opacity-70">STEM-1</div>
        <div className="text-lg font-semibold">{moduleTitle}</div>
        {subtitle ? <div className="text-sm opacity-70">{subtitle}</div> : null}
        <div className="text-sm opacity-70 mt-1">{percent}{t('student.completeSuffix')}</div>
      </div>
      <button
        className="px-4 py-2 rounded-xl bg-blue-600 text-white"
        onClick={onContinue}
        data-testid="student-continue"
      >
        {percent > 0 ? t('student.continue') : t('student.start')}
      </button>
    </div>
  );
}
