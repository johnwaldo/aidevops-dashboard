import { cacheStats } from "../cache/store";
import { getRateLimiter } from "../middleware/rate-limit";
import { clientCount } from "../ws/realtime";
import { apiResponse } from "../routes/_helpers";

const startTime = new Date();

export interface DiagnosticsReport {
  uptime: number;
  startedAt: string;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    externalMB: number;
  };
  cache: ReturnType<typeof cacheStats>;
  rateLimiter: { activeWindows: number };
  websocket: { connectedClients: number };
  process: {
    pid: number;
    platform: string;
    bunVersion: string;
  };
}

export function collectDiagnostics(): DiagnosticsReport {
  const mem = process.memoryUsage();
  const toMB = (bytes: number) => Math.round((bytes / 1024 / 1024) * 100) / 100;

  return {
    uptime: Math.round(process.uptime()),
    startedAt: startTime.toISOString(),
    memory: {
      heapUsedMB: toMB(mem.heapUsed),
      heapTotalMB: toMB(mem.heapTotal),
      rssMB: toMB(mem.rss),
      externalMB: toMB(mem.external),
    },
    cache: cacheStats(),
    rateLimiter: getRateLimiter().stats(),
    websocket: { connectedClients: clientCount() },
    process: {
      pid: process.pid,
      platform: process.platform,
      bunVersion: Bun.version,
    },
  };
}

export async function handleDiagnostics(_req: Request): Promise<Response> {
  const report = collectDiagnostics();
  return apiResponse(report, "diagnostics", 0);
}
