export class RateLimiter {
  private windows = new Map<string, { count: number; resetAt: number }>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean stale entries every 60s
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  check(key: string, maxRequests: number, windowSeconds: number): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || entry.resetAt < now) {
      this.windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return true;
    }

    if (entry.count >= maxRequests) return false;
    entry.count++;
    return true;
  }

  remaining(key: string, maxRequests: number): number {
    const entry = this.windows.get(key);
    if (!entry || entry.resetAt < Date.now()) return maxRequests;
    return Math.max(0, maxRequests - entry.count);
  }

  resetTime(key: string): number {
    const entry = this.windows.get(key);
    if (!entry) return 0;
    return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.windows) {
      if (entry.resetAt < now) {
        this.windows.delete(key);
      }
    }
  }

  stats(): { activeWindows: number } {
    return { activeWindows: this.windows.size };
  }

  destroy(): void {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
  }
}

const limiter = new RateLimiter();

export function rateLimitMiddleware(req: Request, remoteIp: string): Response | null {
  const path = new URL(req.url).pathname;

  // Different limits for read vs write
  const isWrite = req.method === "POST" || req.method === "PUT" || req.method === "DELETE";
  const maxRequests = isWrite ? 30 : 100;
  const windowSeconds = 60;
  const key = `${isWrite ? "write" : "read"}:${remoteIp}`;

  if (!limiter.check(key, maxRequests, windowSeconds)) {
    const retryAfter = limiter.resetTime(key);
    return Response.json(
      { error: { code: "RATE_LIMITED", message: `Too many requests. Retry after ${retryAfter}s`, retryAfter } },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  return null; // Pass through
}

export function getRateLimiter(): RateLimiter {
  return limiter;
}
