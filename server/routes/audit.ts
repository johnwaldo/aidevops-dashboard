import { readAuditLog, auditStats } from "../writers/audit-log";
import { apiResponse } from "./_helpers";

export async function handleAudit(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);
  const action = url.searchParams.get("action") ?? undefined;
  const since = url.searchParams.get("since") ?? undefined;

  const entries = readAuditLog({ limit, action, since });
  const stats = auditStats();

  return apiResponse(
    { entries, total: stats.entries, sizeBytes: stats.sizeBytes },
    "audit",
    0,
  );
}
