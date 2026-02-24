import { settingsMock } from "@/lib/mock-data";

export function MCPConfig() {
  const { models } = settingsMock;

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">AI Models</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#71717a]">Primary</span>
          <span className="text-xs font-mono text-cyan-400">{models.primary}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#71717a]">Fallback</span>
          <span className="text-xs font-mono text-[#e4e4e7]">{models.fallback}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#71717a]">Local</span>
          <span className="text-xs font-mono text-violet-400">{models.local}</span>
        </div>
      </div>
    </div>
  );
}
