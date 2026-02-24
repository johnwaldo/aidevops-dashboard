import { getAidevopsStatus } from "../parsers/status-parser";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleStatus(_req: Request): Promise<Response> {
  const cacheKey = "status";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const status = await getAidevopsStatus();
    cacheSet(cacheKey, status, CACHE_TTL.status);
    return apiResponse(status, "cli", CACHE_TTL.status);
  } catch (err) {
    return apiError("CLI_ERROR", String(err), "status");
  }
}
