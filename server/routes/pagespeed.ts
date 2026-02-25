import { collectPageSpeed, type PageSpeedResult } from "../collectors/pagespeed-collector";
import { config } from "../config";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handlePageSpeed(req: Request): Promise<Response> {
  if (!config.enablePagespeed) {
    return apiError("PAGESPEED_DISABLED", "PageSpeed monitoring is disabled", "pagespeed", 404);
  }

  const url = new URL(req.url);
  const targetUrl = url.searchParams.get("url");
  const strategy = (url.searchParams.get("strategy") ?? "mobile") as "mobile" | "desktop";

  if (targetUrl) {
    // On-demand single URL check
    const cacheKey = `pagespeed:${targetUrl}:${strategy}`;
    const cached = cacheGet<PageSpeedResult>(cacheKey);
    if (cached) {
      return apiResponse(cached.data, "cache", cached.ttl, true);
    }

    try {
      const result = await collectPageSpeed(targetUrl, strategy);
      cacheSet(cacheKey, result, CACHE_TTL.pagespeed);
      return apiResponse(result, "pagespeed-api", CACHE_TTL.pagespeed);
    } catch (err) {
      return apiError("PAGESPEED_ERROR", String(err), "pagespeed");
    }
  }

  // No URL param — return results for all configured URLs
  if (config.pagespeedUrls.length === 0) {
    return apiResponse([], "pagespeed-api", CACHE_TTL.pagespeed);
  }

  const cacheKey = `pagespeed:all:${strategy}`;
  const cached = cacheGet<PageSpeedResult[]>(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    // Run sequentially to avoid hammering the API
    const results: PageSpeedResult[] = [];
    for (const pageUrl of config.pagespeedUrls) {
      const result = await collectPageSpeed(pageUrl, strategy);
      results.push(result);
    }

    cacheSet(cacheKey, results, CACHE_TTL.pagespeed);
    return apiResponse(results, "pagespeed-api", CACHE_TTL.pagespeed);
  } catch (err) {
    return apiError("PAGESPEED_ERROR", String(err), "pagespeed");
  }
}
