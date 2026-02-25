# Phase 4 — Remote Access, Auth & Multi-Device

## Objective

Make the dashboard accessible from any device on your Tailscale mesh — phone, laptop, tablet — with proper authentication, HTTPS, and responsive design. Then harden everything for daily unattended use: memory management, error recovery, logging, and stability. At the end of this phase, the dashboard is a reliable, always-on tool you can check from anywhere.

## Prerequisites

- Phase 3 complete (all data panels working with live data, needs engine and alerts operational)
- Tailscale installed and configured on the Mac Mini and at least one other device
- Dashboard has been running locally for 24+ hours to surface any obvious instability

## References

- [Tailscale Serve](https://tailscale.com/kb/1312/serve) — Expose local services to your tailnet over HTTPS
- [Tailscale Funnel](https://tailscale.com/kb/1223/funnel) — Optionally expose to public internet (not recommended for Phase 4)
- [Tailscale identity headers](https://tailscale.com/kb/1312/serve#identity-headers) — `Tailscale-User-Login` and `Tailscale-User-Name` headers

---

## Architecture Additions

```
server/
├── middleware/
│   ├── auth.ts                  # Authentication layer
│   ├── rate-limit.ts            # Request rate limiting
│   └── cors.ts                  # CORS policy for Tailscale access
├── health/
│   ├── diagnostics.ts           # System health endpoint
│   ├── stability.ts             # Memory + uptime monitoring
│   └── logger.ts                # Structured logging with rotation
├── cache/
│   └── store.ts                 # UPGRADED — bounded cache with eviction
client/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginGate.tsx        # Auth wrapper for non-localhost
│   │   └── layout/
│   │       ├── MobileNav.tsx        # Bottom nav for mobile viewports
│   │       └── ResponsiveGrid.tsx   # Adaptive grid layouts
│   └── hooks/
│       ├── useAuth.ts               # Auth state management
│       └── useReconnect.ts          # WebSocket reconnection logic
```

---

## Session A — Tailscale Access + Authentication

**Goal:** Dashboard accessible via `https://mac-mini-m4pro.tailnet-name.ts.net:3000` from any device on your Tailscale mesh, with identity verification.

**Estimated time:** 1.5-2 hours

### Step 1: Tailscale Serve configuration

Tailscale Serve exposes a local port to your tailnet with automatic HTTPS certificates:

```bash
# Serve the dashboard to your tailnet over HTTPS
tailscale serve --bg 3000

# Verify it's accessible
# From another device on your tailnet:
curl https://mac-mini-m4pro.tailnet-name.ts.net/api/health
```

This gives you HTTPS for free — no cert management, no nginx reverse proxy. Only devices on your Tailscale mesh can reach it.

**Backend changes needed:**
```typescript
// server/index.ts — listen on all interfaces, not just localhost
Bun.serve({
  port: config.port,
  hostname: "0.0.0.0",  // Accept connections from Tailscale, not just localhost
  fetch: router,
});
```

### Step 2: Authentication middleware

Three tiers: localhost bypass → Tailscale identity → bearer token fallback.

```typescript
// middleware/auth.ts

interface AuthResult {
  authenticated: boolean;
  user: string | null;
  method: "localhost" | "tailscale" | "token" | "none";
}

export function authenticate(req: Request): AuthResult {
  // Tier 1: Localhost bypass
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const remoteIp = forwardedFor?.split(",")[0]?.trim() ?? realIp ?? "127.0.0.1";

  if (remoteIp === "127.0.0.1" || remoteIp === "::1") {
    return { authenticated: true, user: "localhost", method: "localhost" };
  }

  // Tier 2: Tailscale identity headers (set by `tailscale serve`)
  const tsLogin = req.headers.get("Tailscale-User-Login");
  const tsName = req.headers.get("Tailscale-User-Name");

  if (tsLogin) {
    // Optionally restrict to specific Tailscale users
    if (config.allowedTailscaleUsers.length === 0 || config.allowedTailscaleUsers.includes(tsLogin)) {
      return { authenticated: true, user: tsName ?? tsLogin, method: "tailscale" };
    }
    // Known Tailscale user but not in allowed list
    return { authenticated: false, user: tsLogin, method: "none" };
  }

  // Tier 3: Bearer token (for API access, scripts, etc.)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (config.dashboardToken && token === config.dashboardToken) {
      return { authenticated: true, user: "api-token", method: "token" };
    }
  }

  return { authenticated: false, user: null, method: "none" };
}

// Apply to all routes
function authMiddleware(req: Request): Response | null {
  const path = new URL(req.url).pathname;

  // Public endpoints — no auth required
  const publicPaths = ["/health", "/api/health"];
  if (publicPaths.includes(path)) return null; // Pass through

  const auth = authenticate(req);
  if (!auth.authenticated) {
    return new Response(JSON.stringify({
      error: { code: "UNAUTHORIZED", message: "Authentication required" }
    }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  // Attach user info to request for downstream use (audit logging, etc.)
  // Store in a WeakMap or header
  return null; // Pass through — authenticated
}
```

**Token generation:**
```bash
# Generate a dashboard access token and store in gopass
openssl rand -hex 32 | aidevops secret set DASHBOARD_TOKEN
```

### Step 3: Rate limiting

Protect against accidental flooding (e.g., a script hammering the API):

```typescript
// middleware/rate-limit.ts

class RateLimiter {
  private windows: Map<string, { count: number; resetAt: number }> = new Map();

  check(key: string, maxRequests: number, windowSeconds: number): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || entry.resetAt < now) {
      this.windows.set(key, { count: 1, resetAt: now + (windowSeconds * 1000) });
      return true;
    }

    if (entry.count >= maxRequests) return false;
    entry.count++;
    return true;
  }
}

const limiter = new RateLimiter();

// Limits:
// Read endpoints:  100 requests/minute per IP
// Write endpoints: 30 requests/minute per IP (Phase 5)
// WebSocket:       1 connection per IP
```

### Step 4: CORS and security headers

```typescript
// middleware/cors.ts

function securityHeaders(response: Response): Response {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Allow Tailscale origins
  const origin = request.headers.get("Origin");
  if (origin && isTailscaleOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }

  return response;
}
```

### Step 5: Frontend auth gate

```typescript
// components/auth/LoginGate.tsx

// On mount: GET /api/auth/status
// If authenticated → render dashboard
// If 401 → show token input form
//   - Single input field for bearer token
//   - Submit → store in memory (NOT localStorage — security)
//   - Retry /api/auth/status with token
//   - On success → render dashboard
//   - On failure → show error, retry

// Auth state persists for the browser session only
// Closing the tab requires re-auth (intentional for security)
```

**Route:**
```typescript
// GET /api/auth/status
// Returns: { authenticated: boolean, user: string, method: string }
```

### Checkpoint A — Verify

```bash
# From Mac Mini (localhost) — should work without auth
curl http://localhost:3000/api/projects  # ✓ 200

# From another device on Tailscale — should work with Tailscale identity
curl https://mac-mini-m4pro.tailnet-name.ts.net/api/projects  # ✓ 200

# From outside Tailscale — should not be reachable at all
# (Tailscale Serve only exposes to your tailnet)

# Token auth test
curl -H "Authorization: Bearer wrong-token" https://mac-mini-m4pro.tailnet-name.ts.net/api/projects  # 401
curl -H "Authorization: Bearer <correct-token>" https://mac-mini-m4pro.tailnet-name.ts.net/api/projects  # 200

# Rate limit test — fire 110 requests rapidly
for i in $(seq 1 110); do curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/health; done
# First 100 should be 200, remaining should be 429

# Open dashboard in phone browser via Tailscale URL — should load and authenticate
```

---

## Session B — Multi-Device Polish + Production Hardening

**Goal:** Dashboard looks and works great on mobile. Server runs stable for 72+ hours unattended. Graceful error recovery everywhere.

**Estimated time:** 2-3 hours

### Step 1: Mobile-responsive layout

The dashboard was designed desktop-first. This pass makes it genuinely usable on phone and tablet.

**Breakpoints:**
```css
/* Tailwind breakpoints */
sm: 640px    /* Phone landscape */
md: 768px    /* Tablet portrait */
lg: 1024px   /* Tablet landscape / small laptop */
xl: 1280px   /* Desktop */
```

**Layout changes by viewport:**

```typescript
// < 768px (phone):
//   - Sidebar collapses to bottom tab bar (5 key pages: Overview, Kanban, Health, Needs, Tokens)
//   - TopBar shrinks: only health dots + needs badge, tap to expand
//   - Cards stack single-column
//   - Charts shrink but remain readable
//   - Kanban: horizontal scroll between columns (one column visible at a time)
//   - Tables: horizontal scroll or card view (stacked key-value pairs)
//   - Command palette: full-screen overlay

// 768px - 1024px (tablet):
//   - Sidebar collapses to icon-only (64px)
//   - Cards in 2-column grid
//   - Kanban: 3 columns visible, scroll for rest

// 1024px+ (desktop):
//   - Full sidebar (240px expanded)
//   - Cards in 3-4 column grid
//   - Kanban: all 5 columns visible
```

**Mobile navigation — bottom tab bar:**
```typescript
// components/layout/MobileNav.tsx

// Fixed bottom bar, 5 tabs:
// 📊 Overview | 📋 Kanban | 💚 Health | 🔴 Needs (with count badge) | 💰 Tokens
// Tap to navigate, active tab highlighted
// Swipe between pages (optional nice-to-have)
// "More" overflow for: Projects, Agents, Documents, Settings
```

**Touch interactions:**
```typescript
// Kanban: swipe cards to move between columns (mobile-friendly drag alternative)
// Charts: tap to show tooltip (no hover on touch)
// Pull-to-refresh on Overview page
// Larger tap targets for action buttons (min 44x44px)
```

### Step 2: WebSocket reconnection

```typescript
// hooks/useReconnect.ts

function useReconnectingWebSocket(url: string, onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const attemptRef = useRef(0);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      setReconnecting(false);
      attemptRef.current = 0;

      // Request full state refresh after reconnect
      ws.send(JSON.stringify({ type: "refresh" }));
    };

    ws.onmessage = (e) => onMessage(JSON.parse(e.data));

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s cap
      const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
      attemptRef.current++;
      setReconnecting(true);

      setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close(); // Trigger onclose → reconnect

    wsRef.current = ws;
  }, [url, onMessage]);

  useEffect(() => { connect(); return () => wsRef.current?.close(); }, [connect]);

  return { connected, reconnecting };
}
```

**TopBar indicator:**
```typescript
// Show connection status:
// 🟢 "Connected" — normal operation
// 🟡 "Reconnecting..." — WebSocket dropped, attempting reconnect
// 🔴 "Disconnected" — failed to reconnect (show stale data warning)
```

### Step 3: Memory management

```typescript
// cache/store.ts — bounded cache with eviction

class BoundedCache {
  private store = new Map<string, { data: any; expiresAt: number; size: number }>();
  private maxSizeBytes: number;
  private currentSize = 0;

  constructor(maxSizeMB: number = 128) {
    this.maxSizeBytes = maxSizeMB * 1024 * 1024;
  }

  set(key: string, data: any, ttlSeconds: number): void {
    const serialized = JSON.stringify(data);
    const size = new Blob([serialized]).size;

    // Evict expired entries first
    this.evictExpired();

    // If still over limit, evict oldest
    while (this.currentSize + size > this.maxSizeBytes && this.store.size > 0) {
      const oldest = this.store.entries().next().value;
      if (oldest) {
        this.currentSize -= oldest[1].size;
        this.store.delete(oldest[0]);
      }
    }

    this.store.set(key, { data, expiresAt: Date.now() + (ttlSeconds * 1000), size });
    this.currentSize += size;
  }

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.currentSize -= entry.size;
      return null;
    }
    return entry.data;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.currentSize -= entry.size;
        this.store.delete(key);
      }
    }
  }

  stats(): { entries: number; sizeBytes: number; maxBytes: number } {
    return { entries: this.store.size, sizeBytes: this.currentSize, maxBytes: this.maxSizeBytes };
  }
}
```

### Step 4: Startup resilience

```typescript
// server/index.ts — graceful startup with isolated collectors

async function start() {
  // Phase 1: Core server (must succeed)
  const server = Bun.serve({ port: config.port, hostname: "0.0.0.0", fetch: router });
  console.log(`Dashboard running on :${config.port}`);

  // Phase 2: Collectors (each starts independently, failures isolated)
  const collectors = [
    { name: "local-metrics", fn: startLocalMetrics },
    { name: "vps-metrics", fn: startVPSMetrics },
    { name: "ollama", fn: startOllamaCollector },
    { name: "git-platforms", fn: startGitCollector },
    { name: "token-scanner", fn: startTokenCollector },
    { name: "uptime", fn: startUptimeCollector },
    { name: "quality", fn: startQualityCollector },
    { name: "ssl", fn: startSSLCollector },
    { name: "status-pages", fn: startStatusCollector },
  ];

  const results = await Promise.allSettled(collectors.map(c =>
    c.fn().catch(err => { throw { collector: c.name, error: err }; })
  ));

  // Report startup health
  const healthy = results.filter(r => r.status === "fulfilled").length;
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map(r => r.reason.collector);

  console.log(`Collectors: ${healthy}/${collectors.length} started`);
  if (failed.length > 0) {
    console.warn(`Failed to start: ${failed.join(", ")}`);
  }

  // Phase 3: File watchers
  startFileWatchers();

  // Phase 4: Maintenance intervals
  cache.startCleanupInterval(60000); // Every minute
}

// Global error handling — don't crash on uncaught errors
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  // Continue running
});

process.on("unhandledRejection", (err) => {
  logger.error("Unhandled rejection", { error: String(err) });
});
```

### Step 5: Structured logging

```typescript
// health/logger.ts

const LOG_DIR = `${process.env.HOME}/.aidevops/dashboard/logs`;
const LOG_FILE = `${LOG_DIR}/dashboard.log`;

interface LogEntry {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  source: string;
  msg: string;
  data?: any;
}

class Logger {
  private stream: Bun.FileSink;
  private level: string;

  constructor() {
    Bun.mkdirSync(LOG_DIR, { recursive: true });
    this.stream = Bun.file(LOG_FILE).writer();
    this.level = config.logLevel;
  }

  info(msg: string, data?: any) { this.write("info", msg, data); }
  warn(msg: string, data?: any) { this.write("warn", msg, data); }
  error(msg: string, data?: any) { this.write("error", msg, data); }
  debug(msg: string, data?: any) { this.write("debug", msg, data); }

  private write(level: string, msg: string, data?: any) {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level: level as any,
      source: new Error().stack?.split("\n")[3]?.trim() ?? "unknown",
      msg,
      ...(data && { data }),
    };
    this.stream.write(JSON.stringify(entry) + "\n");
  }
}

// Log rotation: new file daily, keep 7 days
// Run via setInterval every hour
function rotateLogsIfNeeded() {
  // Check if current log > 50MB or date changed → rotate
  // Delete logs older than 7 days
}
```

### Step 6: Diagnostics endpoint

```typescript
// GET /api/diagnostics
// Public (no auth) — for health checks and debugging

function diagnostics(): DiagnosticsReport {
  return {
    uptime: process.uptime(),
    memory: {
      heapUsed: process.memoryUsage().heapUsed,
      heapTotal: process.memoryUsage().heapTotal,
      rss: process.memoryUsage().rss,
      external: process.memoryUsage().external,
    },
    cache: cache.stats(),
    collectors: {
      localMetrics: { status: "running", lastUpdate: "12s ago" },
      vpsMetrics: { status: "running", lastUpdate: "28s ago" },
      ollama: { status: "running", lastUpdate: "8s ago" },
      gitPlatforms: { status: "running", lastUpdate: "3m ago" },
      tokenScanner: { status: "running", lastUpdate: "4m ago" },
      // ... etc
    },
    websocket: {
      connectedClients: wsClients.size,
      messagesPerMinute: wsMessageRate,
    },
    version: config.version,
    startedAt: startTime.toISOString(),
  };
}
```

### Checkpoint B — Verify

**Remote access:**
1. Open dashboard on phone browser via Tailscale HTTPS URL — loads, authenticates via Tailscale identity
2. All pages render correctly on phone viewport (single column, bottom nav)
3. Kanban columns scroll horizontally on phone
4. Charts readable at small sizes
5. Tap targets large enough for thumb navigation

**Stability:**
6. Kill Ollama → Ollama panel shows "unavailable", everything else works
7. Disconnect VPS network → VPS panel shows stale data, other panels unaffected
8. Close browser tab → reopen → WebSocket reconnects, data refreshes
9. `curl localhost:3000/api/diagnostics` → clean health report, no memory growth
10. Leave running overnight → check in morning: still responsive, memory stable, no error log entries
11. Check structured logs: `tail -20 ~/.aidevops/dashboard/logs/dashboard.log` — clean JSON lines

---

## Configuration

```typescript
// server/config.ts — Phase 4 additions

export const phase4Config = {
  // Auth
  dashboardToken: null,             // From gopass: DASHBOARD_TOKEN
  allowedTailscaleUsers: [],        // Empty = allow all tailnet users. Set to restrict.
  localhostBypass: true,            // Skip auth for 127.0.0.1 (default: true)

  // Rate limiting
  readRateLimit: 100,               // Max read requests per minute per IP
  wsMaxConnections: 5,              // Max WebSocket connections per IP

  // Stability
  cacheMaxSizeMB: 128,
  logDir: `${process.env.HOME}/.aidevops/dashboard/logs`,
  logLevel: process.env.DASHBOARD_LOG_LEVEL ?? "info",
  logRetentionDays: 7,
  logMaxSizeMB: 50,

  // Diagnostics
  enableDiagnostics: true,          // /api/diagnostics endpoint
};
```

---

## Definition of Done

Phase 4 is complete when:

**Remote Access:**
- [ ] Dashboard accessible via Tailscale Serve over HTTPS
- [ ] Tailscale identity authentication works
- [ ] Bearer token authentication works as fallback
- [ ] Localhost bypass works without any auth
- [ ] Rate limiting active on all endpoints
- [ ] Unauthenticated requests return 401

**Multi-Device:**
- [ ] Phone: bottom tab navigation, single-column cards, horizontal kanban scroll
- [ ] Tablet: icon-only sidebar, 2-column cards
- [ ] Desktop: full sidebar, 3-4 column cards, all kanban columns visible
- [ ] Touch-friendly tap targets (44px minimum)
- [ ] All charts readable at mobile sizes

**Stability:**
- [ ] WebSocket reconnects with exponential backoff after disconnect
- [ ] Connection status visible in TopBar (connected / reconnecting / disconnected)
- [ ] Individual collector failures don't cascade
- [ ] Bounded cache prevents memory growth
- [ ] Structured JSON logging with daily rotation
- [ ] Diagnostics endpoint reports full system health
- [ ] Runs 72+ hours without memory leaks, crashes, or stale data
- [ ] Startup tolerates missing services gracefully
