import { authenticate, type AuthResult } from "./auth";

/**
 * Stricter auth for write endpoints.
 * - Authentication required (no anonymous)
 * - Extracts and returns auth result for audit logging
 */
export function writeAuthMiddleware(req: Request, remoteIp?: string): { blocked: Response | null; auth: AuthResult } {
  const auth = authenticate(req, remoteIp);

  if (!auth.authenticated) {
    return {
      blocked: Response.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required for write operations" } },
        { status: 401 }
      ),
      auth,
    };
  }

  return { blocked: null, auth };
}
