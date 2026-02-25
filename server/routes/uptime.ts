import { collectUptimeMonitors } from "../collectors/uptime-collector";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleUptime(_req: Request): Promise<Response> {
  const cacheKey = "uptime";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const monitors = await collectUptimeMonitors();
    cacheSet(cacheKey, monitors, CACHE_TTL.uptime);
    return apiResponse(monitors, "api", CACHE_TTL.uptime);
  } catch (err) {
    return apiError("UPTIME_ERROR", String(err), "uptime");
  }
}
