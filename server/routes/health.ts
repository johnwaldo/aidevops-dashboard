import { collectLocalMetrics } from "../collectors/system-local";
import { collectVPSMetrics } from "../collectors/system-vps";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleHealthLocal(_req: Request): Promise<Response> {
  const cacheKey = "healthLocal";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const metrics = await collectLocalMetrics();
    cacheSet(cacheKey, metrics, CACHE_TTL.healthLocal);
    return apiResponse(metrics, "system", CACHE_TTL.healthLocal);
  } catch (err) {
    return apiError("COLLECTION_ERROR", String(err), "health/local");
  }
}

export async function handleHealthVPS(_req: Request): Promise<Response> {
  const cacheKey = "healthVPS";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const metrics = await collectVPSMetrics();
    if (metrics === null) {
      return apiResponse(null, "system", CACHE_TTL.healthVPS);
    }
    cacheSet(cacheKey, metrics, CACHE_TTL.healthVPS);
    return apiResponse(metrics, "ssh", CACHE_TTL.healthVPS);
  } catch (err) {
    return apiError("SSH_ERROR", String(err), "health/vps");
  }
}

export async function handleHealth(_req: Request): Promise<Response> {
  const cacheKeyLocal = "healthLocal";
  const cacheKeyVPS = "healthVPS";

  const cachedLocal = cacheGet(cacheKeyLocal);
  const cachedVPS = cacheGet(cacheKeyVPS);

  try {
    const [local, vps] = await Promise.all([
      cachedLocal ? Promise.resolve(cachedLocal.data) : collectLocalMetrics().then((m) => { cacheSet(cacheKeyLocal, m, CACHE_TTL.healthLocal); return m; }),
      cachedVPS ? Promise.resolve(cachedVPS.data) : collectVPSMetrics().then((m) => { if (m) cacheSet(cacheKeyVPS, m, CACHE_TTL.healthVPS); return m; }),
    ]);

    const combined = { local, vps };
    return apiResponse(combined, "system", Math.min(CACHE_TTL.healthLocal, CACHE_TTL.healthVPS));
  } catch (err) {
    return apiError("COLLECTION_ERROR", String(err), "health");
  }
}
