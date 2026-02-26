import { config } from "../config";

// Detect production environment
const isProduction = process.env.NODE_ENV === "production" || process.env.DASHBOARD_ENV === "production";

// Allowed origins in production (configure via environment variable)
const PRODUCTION_ALLOWED_ORIGINS = (process.env.DASHBOARD_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

function isTailscaleOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname.endsWith(".ts.net") || url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string): boolean {
  // Always allow Tailscale and localhost origins
  if (isTailscaleOrigin(origin)) return true;

  // In production, only allow explicitly configured origins
  if (isProduction) {
    return PRODUCTION_ALLOWED_ORIGINS.some(allowed =>
      origin === allowed || origin.endsWith(`.${allowed}`)
    );
  }

  // In development, allow localhost variants
  return origin.includes("localhost") || origin.includes("127.0.0.1");
}

export function securityHeaders(req: Request, response: Response): Response {
  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // CORS
  const origin = req.headers.get("Origin");

  if (!origin) {
    // No origin header — same-origin request or non-browser client
    response.headers.set("Access-Control-Allow-Origin", "*");
  } else if (isAllowedOrigin(origin)) {
    // Known/allowed origin
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    // Unknown origin — reject in production, warn in dev
    if (isProduction) {
      // In production, don't expose the API to unknown origins
      // Omit CORS headers entirely — browser will block cross-origin requests
    } else {
      // In development, allow but log warning
      console.warn(`[SECURITY] Allowing unknown origin in development: ${origin}`);
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
  }

  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
}

export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;

  const response = new Response(null, { status: 204 });
  return securityHeaders(req, response);
}
