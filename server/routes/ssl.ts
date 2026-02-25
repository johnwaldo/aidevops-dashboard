import { collectSSLStatus, type SSLCertStatus } from "../collectors/ssl-collector";
import { cacheGet, cacheSet } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleSSL(_req: Request): Promise<Response> {
  const cacheKey = "ssl";
  const cached = cacheGet<SSLCertStatus[]>(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    // Collect domains from uptime monitors cache + pagespeed URLs
    const domains = new Set<string>();

    const uptimeCache = cacheGet<{ url: string }[]>("uptime");
    if (uptimeCache) {
      for (const monitor of uptimeCache.data) {
        try {
          const url = new URL(monitor.url);
          if (url.protocol === "https:") {
            domains.add(url.hostname);
          }
        } catch { /* skip invalid URLs */ }
      }
    }

    // Also check any pagespeed URLs
    const { config } = await import("../config");
    for (const urlStr of config.pagespeedUrls) {
      try {
        const url = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
        domains.add(url.hostname);
      } catch { /* skip */ }
    }

    const results = await collectSSLStatus([...domains]);
    cacheSet(cacheKey, results, 3600); // Cache for 1 hour
    return apiResponse(results, "tls", 3600);
  } catch (err) {
    return apiError("SSL_ERROR", String(err), "ssl");
  }
}
