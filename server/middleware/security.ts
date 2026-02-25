import { config } from "../config";

function isTailscaleOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname.endsWith(".ts.net") || url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
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
  } else if (isTailscaleOrigin(origin) || origin.includes("localhost") || origin.includes("127.0.0.1")) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  } else {
    // Unknown origin — allow in dev, restrict in production
    response.headers.set("Access-Control-Allow-Origin", origin);
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
