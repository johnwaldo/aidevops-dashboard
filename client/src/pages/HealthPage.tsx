import { ServerPanel } from "@/components/health/ServerPanel";
import { LocalMachinePanel } from "@/components/health/LocalMachinePanel";
import { OllamaPanel } from "@/components/health/OllamaPanel";
import { UptimeMonitors } from "@/components/health/UptimeMonitors";
import { NetworkPanel } from "@/components/health/NetworkPanel";
import { CICDStatus } from "@/components/health/CICDStatus";
import { SecurityPosture } from "@/components/health/SecurityPosture";
import { SSLPanel } from "@/components/health/SSLPanel";

export function HealthPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Health</h1>
        <p className="text-sm text-[#71717a] mt-1">Infrastructure and service health monitoring.</p>
      </div>

      {/* Top: 2-column grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-4">
          <ServerPanel />
          <UptimeMonitors />
        </div>
        <div className="space-y-4">
          <LocalMachinePanel />
          <OllamaPanel />
        </div>
      </div>

      {/* Middle: SSL + CI */}
      <div className="grid grid-cols-2 gap-4">
        <SSLPanel />
        <CICDStatus />
      </div>

      {/* Bottom: full-width panels */}
      <div className="grid grid-cols-2 gap-4">
        <NetworkPanel />
        <SecurityPosture />
      </div>
    </div>
  );
}
