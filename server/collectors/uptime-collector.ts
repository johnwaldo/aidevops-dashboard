import { config } from "../config";
import { getSecret } from "../secrets";

export interface UptimeMonitor {
  name: string;
  url: string;
  status: "up" | "down" | "unknown";
  uptime7d: number | null;
  uptime30d: number | null;
  responseTime: number | null;
  responseTime7dAvg: number | null;
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

interface UpdownMetrics {
  uptime: number;
  apdex: number;
  timings: { total: number; redirect: number; namelookup: number; connection: number; handshake: number; response: number };
  requests: { samples: number; failures: number; satisfied: number; tolerated: number; by_response_time: Record<string, number> };
}

async function fetchMetrics(checkToken: string, from: string, to: string): Promise<UpdownMetrics | null> {
  const apiKey = await getSecret("UPDOWN_API_KEY");
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://updown.io/api/checks/${checkToken}/metrics?from=${from}&to=${to}`, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    return (await res.json()) as UpdownMetrics;
  } catch {
    return null;
  }
}

export async function collectUptimeMonitors(): Promise<UptimeMonitor[]> {
  const apiKey = await getSecret("UPDOWN_API_KEY");
  if (!config.enableUptime || !apiKey) {
    return [];
  }

  try {
    const res = await fetch("https://updown.io/api/checks", {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[uptime] API returned ${res.status}`);
      return [];
    }

    const checks = (await res.json()) as UpdownCheck[];

    // Fetch 7d metrics for each check in parallel (batches of 5)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromStr = sevenDaysAgo.toISOString();
    const toStr = now.toISOString();

    const monitors: UptimeMonitor[] = [];
    const batchSize = 5;

    for (let i = 0; i < checks.length; i += batchSize) {
      const batch = checks.slice(i, i + batchSize);
      const metricsResults = await Promise.all(
        batch.map((check) => fetchMetrics(check.token, fromStr, toStr))
      );

      for (let j = 0; j < batch.length; j++) {
        const check = batch[j];
        const metrics7d = metricsResults[j];

        monitors.push({
          name: check.alias || new URL(check.url).hostname,
          url: check.url,
          status: check.last_status >= 200 && check.last_status < 400 ? "up" : "down",
          uptime7d: metrics7d?.uptime != null ? Math.round(metrics7d.uptime * 10000) / 100 : null,
          uptime30d: check.uptime ? Math.round(check.uptime * 100) / 100 : null,
          responseTime: check.metrics?.timings?.total ? Math.round(check.metrics.timings.total) : null,
          responseTime7dAvg: metrics7d?.timings?.total ? Math.round(metrics7d.timings.total) : null,
          lastCheckAt: check.last_check_at,
        });
      }
    }

    return monitors;
  } catch (err) {
    console.error("[uptime] Collection failed:", err);
    return [];
  }
}
