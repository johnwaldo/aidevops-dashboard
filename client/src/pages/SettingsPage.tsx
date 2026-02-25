import { FrameworkVersion } from "@/components/settings/FrameworkVersion";
import { APIKeyStatus } from "@/components/settings/APIKeyStatus";
import { MCPConfig } from "@/components/settings/MCPConfig";
import { TailscaleStatus } from "@/components/settings/TailscaleStatus";

export function SettingsPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Settings</h1>
        <p className="text-sm text-[#71717a] mt-1">Framework configuration, API keys, and model settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FrameworkVersion />
        <MCPConfig />
        <TailscaleStatus />
      </div>

      <APIKeyStatus />
    </div>
  );
}
