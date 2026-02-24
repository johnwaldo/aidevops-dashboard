export interface PageSpeedResult {
  url: string;
  fetchedAt: string;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    fcp: number; // First Contentful Paint (ms)
    lcp: number; // Largest Contentful Paint (ms)
    cls: number; // Cumulative Layout Shift
    tbt: number; // Total Blocking Time (ms)
    si: number;  // Speed Index (ms)
    tti: number; // Time to Interactive (ms)
  };
  strategy: "mobile" | "desktop";
  error: string | null;
}

interface PSIResponse {
  lighthouseResult?: {
    categories: {
      performance?: { score: number };
      accessibility?: { score: number };
      "best-practices"?: { score: number };
      seo?: { score: number };
    };
    audits: {
      "first-contentful-paint"?: { numericValue: number };
      "largest-contentful-paint"?: { numericValue: number };
      "cumulative-layout-shift"?: { numericValue: number };
      "total-blocking-time"?: { numericValue: number };
      "speed-index"?: { numericValue: number };
      interactive?: { numericValue: number };
    };
    fetchTime: string;
  };
  error?: { message: string };
}

export async function collectPageSpeed(url: string, strategy: "mobile" | "desktop" = "mobile"): Promise<PageSpeedResult> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  try {
    const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    apiUrl.searchParams.set("url", normalizedUrl);
    apiUrl.searchParams.set("strategy", strategy);
    apiUrl.searchParams.set("category", "PERFORMANCE");
    apiUrl.searchParams.set("category", "ACCESSIBILITY");
    apiUrl.searchParams.set("category", "BEST_PRACTICES");
    apiUrl.searchParams.set("category", "SEO");

    // PageSpeed API allows multiple category params — use raw URL construction
    const rawUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(normalizedUrl)}&strategy=${strategy}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;

    const res = await fetch(rawUrl, {
      signal: AbortSignal.timeout(60000), // PageSpeed can be slow
    });

    if (!res.ok) {
      const text = await res.text();
      return errorResult(normalizedUrl, strategy, `API returned ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as PSIResponse;

    if (data.error) {
      return errorResult(normalizedUrl, strategy, data.error.message);
    }

    const lr = data.lighthouseResult;
    if (!lr) {
      return errorResult(normalizedUrl, strategy, "No lighthouse result returned");
    }

    return {
      url: normalizedUrl,
      fetchedAt: lr.fetchTime ?? new Date().toISOString(),
      scores: {
        performance: Math.round((lr.categories.performance?.score ?? 0) * 100),
        accessibility: Math.round((lr.categories.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((lr.categories["best-practices"]?.score ?? 0) * 100),
        seo: Math.round((lr.categories.seo?.score ?? 0) * 100),
      },
      metrics: {
        fcp: Math.round(lr.audits["first-contentful-paint"]?.numericValue ?? 0),
        lcp: Math.round(lr.audits["largest-contentful-paint"]?.numericValue ?? 0),
        cls: Math.round((lr.audits["cumulative-layout-shift"]?.numericValue ?? 0) * 1000) / 1000,
        tbt: Math.round(lr.audits["total-blocking-time"]?.numericValue ?? 0),
        si: Math.round(lr.audits["speed-index"]?.numericValue ?? 0),
        tti: Math.round(lr.audits.interactive?.numericValue ?? 0),
      },
      strategy,
      error: null,
    };
  } catch (err) {
    return errorResult(normalizedUrl, strategy, String(err));
  }
}

function errorResult(url: string, strategy: "mobile" | "desktop", error: string): PageSpeedResult {
  return {
    url,
    fetchedAt: new Date().toISOString(),
    scores: { performance: 0, accessibility: 0, bestPractices: 0, seo: 0 },
    metrics: { fcp: 0, lcp: 0, cls: 0, tbt: 0, si: 0, tti: 0 },
    strategy,
    error,
  };
}
