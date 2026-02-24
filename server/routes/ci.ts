import { collectCIStatus } from "../collectors/actions-collector";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleCI(_req: Request): Promise<Response> {
  const cacheKey = "ci";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const status = await collectCIStatus();
    cacheSet(cacheKey, status, CACHE_TTL.ci);
    return apiResponse(status, "github-actions", CACHE_TTL.ci);
  } catch (err) {
    return apiError("CI_ERROR", String(err), "ci");
  }
}
