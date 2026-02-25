import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  sparkData?: number[];
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ label, value, trend, trendUp, sparkData, icon, className }: MetricCardProps) {
  return (
    <div className={cn("rounded-md border border-[#1e1e2e] bg-[#111118] p-4 transition-colors hover:border-[#2e2e3e]", className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs text-[#71717a] font-medium uppercase tracking-wider">{label}</p>
        {icon && <span className="text-[#71717a]">{icon}</span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold font-[JetBrains_Mono] tracking-tight">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-mono", trendUp === true ? "text-emerald-400" : trendUp === false ? "text-rose-400" : "text-[#71717a]")}>
              {trend}
            </p>
          )}
        </div>
        {sparkData && <Sparkline data={sparkData} className="text-cyan-400 opacity-60" />}
      </div>
    </div>
  );
}
