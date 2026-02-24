import { config } from "../config";

export interface UptimeMonitor {
  name: string;
  url: string;
  status: "up" | "down" | "unknown";
  uptime7d: number | null;
  uptime30d: number | null;
  responseTime: number | null;
  lastCheckAt: string | null;
}

interface UpdownCheck {
  token: string;
  url: string;
  alias: string;
  last_status: number;
  uptime: number;
  period: number;
  apdex_t: number;
  enabled: boolean;
  last_check_at: string;
  metrics?: { apdex: number; timings: { total: number } };
}

export async function collectUptimeMonitors(): Promise<UptimeMonitor[]> {
  if (!config.enableUptime || !config.updownApiKey) {
    return [];
  }

  try {
    const res = await fetch("https://updown.io/api/checks", {
      headers: { "X-API-Key": config.updownApiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[uptime] API returned ${res.status}`);
      return [];
    }

    const checks = (await res.json()) as UpdownCheck[];

    return checks.map((check) => ({
      name: check.alias || new URL(check.url).hostname,
      url: check.url,
      status: check.last_status >= 200 && check.last_status < 400 ? "up" : "down",
      uptime7d: null, // Would need separate metrics endpoint
      uptime30d: check.uptime ? Math.round(check.uptime * 100) / 100 : null,
      responseTime: check.metrics?.timings?.total ? Math.round(check.metrics.timings.total) : null,
      lastCheckAt: check.last_check_at,
    }));
  } catch (err) {
    console.error("[uptime] Collection failed:", err);
    return [];
  }
}
