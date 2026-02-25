import { NeedsList } from "@/components/needs/NeedsList";
import { useApiData } from "@/hooks/useApiData";

interface Need {
  id: number;
  type: string;
  title: string;
  description: string;
  source: string;
  priority: string;
  url: string;
  createdAt: string;
}

export function NeedsPage() {
  const { data: needs } = useApiData<Need[]>("needs", 30);
  const count = needs?.length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Needs From Me</h1>
          <p className="text-sm text-[#71717a] mt-1">Items requiring your attention, grouped by priority.</p>
        </div>
        {count > 0 && (
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-rose-500/20 px-2 text-sm font-bold text-rose-400">
            {count}
          </span>
        )}
      </div>
      <NeedsList />
    </div>
  );
}
