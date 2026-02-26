import { config } from "../config";
import { getSecret } from "../secrets";

export interface AuthResult {
  authenticated: boolean;
  user: string | null;
  method: "localhost" | "tailscale" | "token" | "none";
}

export async function authenticate(req: Request, remoteIp?: string): Promise<AuthResult> {
  const ip = remoteIp ?? extractIp(req);

  // Tier 1: Localhost bypass
  if (config.localhostBypass && isLocalhost(ip)) {
    return { authenticated: true, user: "localhost", method: "localhost" };
  }

  // Tier 2: Tailscale identity headers (set by `tailscale serve`)
  const tsLogin = req.headers.get("Tailscale-User-Login");
  const tsName = req.headers.get("Tailscale-User-Name");

  if (tsLogin) {
    if (config.allowedTailscaleUsers.length === 0 || config.allowedTailscaleUsers.includes(tsLogin)) {
      return { authenticated: true, user: tsName ?? tsLogin, method: "tailscale" };
    }
    return { authenticated: false, user: tsLogin, method: "none" };
  }

  // Tier 3: Bearer token
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const dashboardToken = await getSecret("DASHBOARD_TOKEN");
    if (dashboardToken && token === dashboardToken) {
      return { authenticated: true, user: "api-token", method: "token" };
    }
  }

  return { authenticated: false, user: null, method: "none" };
}

function extractIp(req: Request): string {
  // Only trust proxy headers when explicitly enabled (behind known proxy)
  if (config.trustProxy) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();

    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp;
  }

  // When trustProxy is false (default), use native connection info only
  // This prevents X-Forwarded-For spoofing attacks
  return "127.0.0.1";
}

function isLocalhost(ip: string): boolean {
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip === "localhost";
}

// Public paths that skip auth entirely
const PUBLIC_PATHS = new Set([
  "/api/health/ping",
  "/api/auth/status",
]);

export async function authMiddleware(req: Request, remoteIp?: string): Promise<Response | null> {
  const path = new URL(req.url).pathname;

  // Public endpoints — no auth required
  if (PUBLIC_PATHS.has(path)) return null;

  // Static assets and SPA fallback — no auth (Tailscale Serve handles network-level access)
  if (!path.startsWith("/api/") && !path.startsWith("/ws")) return null;

  const auth = await authenticate(req, remoteIp);
  if (!auth.authenticated) {
    return Response.json(
      { error: { code: "UNAUTHORIZED", message: "Authentication required", method: auth.method } },
      { status: 401 }
    );
  }

  return null; // Pass through — authenticated
}
