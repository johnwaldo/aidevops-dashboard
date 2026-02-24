import { NeedsList } from "@/components/needs/NeedsList";
import { needsMock } from "@/lib/mock-data";

export function NeedsPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Needs From Me</h1>
          <p className="text-sm text-[#71717a] mt-1">Items requiring your attention, grouped by priority.</p>
        </div>
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-rose-500/20 px-2 text-sm font-bold text-rose-400">
          {needsMock.length}
        </span>
      </div>
      <NeedsList />
    </div>
  );
}
