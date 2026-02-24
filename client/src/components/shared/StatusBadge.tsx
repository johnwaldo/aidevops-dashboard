import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "healthy" | "warning" | "critical" | "connected" | "disconnected" | "stopped" | "running" | "idle" | "up" | "down" | "passing" | "failing" | "none" | "active";
  label?: string;
  className?: string;
}

const statusColors: Record<string, string> = {
  healthy: "bg-emerald-500",
  connected: "bg-emerald-500",
  running: "bg-emerald-500",
  up: "bg-emerald-500",
  passing: "bg-emerald-500",
  active: "bg-emerald-500",
  warning: "bg-amber-500",
  idle: "bg-amber-500",
  critical: "bg-rose-500",
  disconnected: "bg-rose-500",
  failing: "bg-rose-500",
  down: "bg-rose-500",
  stopped: "bg-zinc-500",
  none: "bg-zinc-500",
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 rounded-full", statusColors[status] ?? "bg-zinc-500")} />
      {label && <span className="text-xs text-[#71717a]">{label}</span>}
    </span>
  );
}
