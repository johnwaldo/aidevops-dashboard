import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  critical: "bg-rose-500",
  high: "bg-amber-500",
  medium: "bg-cyan-500",
  low: "bg-zinc-400",
};

export function PriorityDot({ priority, className }: { priority: string; className?: string }) {
  return (
    <span className={cn("inline-block h-2 w-2 rounded-full", priorityColors[priority] ?? "bg-zinc-500", className)} />
  );
}
