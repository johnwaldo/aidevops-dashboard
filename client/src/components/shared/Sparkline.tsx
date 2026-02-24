import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  className?: string;
  width?: number;
  height?: number;
}

export function Sparkline({ data, className, width = 60, height = 20 }: SparklineProps) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 2) - 1}`)
    .join(" ");

  return (
    <svg className={cn("shrink-0", className)} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
