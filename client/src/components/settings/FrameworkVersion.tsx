import { settingsMock } from "@/lib/mock-data";
import { Check } from "lucide-react";

export function FrameworkVersion() {
  const { framework } = settingsMock;

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-3">Framework</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#71717a]">Version</span>
          <span className="text-xs font-mono text-[#e4e4e7] flex items-center gap-1.5">
            {framework.version}
            {!framework.updateAvailable && <Check className="h-3.5 w-3.5 text-emerald-400" />}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#71717a]">Repository</span>
          <span className="text-xs font-mono text-[#71717a]">~/Git/aidevops</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#71717a]">Agents</span>
          <span className="text-xs font-mono text-[#71717a]">~/.aidevops/agents</span>
        </div>
      </div>
    </div>
  );
}
