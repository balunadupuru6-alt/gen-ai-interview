interface CircularGaugeProps {
  value: number;
  max: number;
  label: string;
  sublabel: string;
  strokeColor?: string;
}

export default function CircularGauge({
  value,
  max,
  label,
  sublabel,
  strokeColor = '#e11d48',
}: CircularGaugeProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const dashOffset = circumference * (1 - ratio);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="6"
          />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-bold tabular-nums text-white">
            {value.toFixed(1)}
          </span>
          <span className="font-mono text-[10px] text-zinc-400">/ {max}</span>
        </div>
      </div>
      <div className="mt-2.5 text-sm font-medium text-white">{label}</div>
      <div className="text-xs text-zinc-400">{sublabel}</div>
    </div>
  );
}
