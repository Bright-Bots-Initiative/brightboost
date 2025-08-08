type Props = { percent: number; size?: number; stroke?: number; label?: string };
export default function StudentProgressRing({ percent, size = 120, stroke = 10, label }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * c;

  return (
    <div className="inline-flex flex-col items-center" data-testid="xp-ring" aria-label={label}>
      <svg width={size} height={size} role="img" aria-label={label}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none" strokeOpacity={0.15} stroke="currentColor"/>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" stroke="currentColor"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="font-semibold">{Math.round(clamped)}%</text>
      </svg>
      {label ? <div className="mt-2 text-sm opacity-80">{label}</div> : null}
    </div>
  );
}
