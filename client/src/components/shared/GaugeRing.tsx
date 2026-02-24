import { cn } from "@/lib/utils";

interface GaugeRingProps {
  value: number;
  max: number;
  label: string;
  size?: number;
  className?: string;
}

export function GaugeRing({ value, max, label, size = 56, className }: GaugeRingProps) {
  const pct = Math.round((value / max) * 100);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color = pct > 80 ? "text-rose-400" : pct > 60 ? "text-amber-400" : "text-cyan-400";

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e1e2e"
            strokeWidth={4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-1000 ease-out", color)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold">
          {pct}%
        </span>
      </div>
      <span className="text-[10px] text-[#71717a] uppercase tracking-wider">{label}</span>
    </div>
  );
}
