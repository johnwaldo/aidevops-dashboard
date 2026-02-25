import { appendFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const HOME = process.env.HOME ?? "/Users/justin";
const AUDIT_DIR = join(HOME, ".aidevops/dashboard");
const AUDIT_PATH = join(AUDIT_DIR, "audit.jsonl");

export interface AuditEntry {
  ts: string;
  action: string;
  target: string;
  params: Record<string, unknown>;
  user: string;
  result: "success" | "failure";
  error?: string;
  durationMs: number;
}

mkdirSync(AUDIT_DIR, { recursive: true });

export function logAudit(entry: AuditEntry): void {
  try {
    appendFileSync(AUDIT_PATH, JSON.stringify(entry) + "\n");
  } catch {
    // Audit logging should never crash the app
  }
}

export function sanitizeParams(body: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...body };
  for (const key of Object.keys(sanitized)) {
    if (/token|key|secret|password|credential/i.test(key)) {
      sanitized[key] = "[redacted]";
    }
  }
  return sanitized;
}

export function readAuditLog(options?: {
  limit?: number;
  action?: string;
  since?: string;
}): AuditEntry[] {
  try {
    const content = readFileSync(AUDIT_PATH, "utf-8");
    let entries = content
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as AuditEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is AuditEntry => e !== null);

    // Filter by action pattern (supports glob-like: "github.*")
    if (options?.action) {
      const pattern = options.action.replace(/\./g, "\\.").replace(/\*/g, ".*");
      const regex = new RegExp(`^${pattern}$`);
      entries = entries.filter((e) => regex.test(e.action));
    }

    // Filter by date
    if (options?.since) {
      const sinceDate = new Date(options.since).getTime();
      entries = entries.filter((e) => new Date(e.ts).getTime() >= sinceDate);
    }

    // Return most recent first, limited
    entries.reverse();
    if (options?.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  } catch {
    return [];
  }
}

export function auditStats(): { entries: number; sizeBytes: number } {
  try {
    const s = statSync(AUDIT_PATH);
    const content = readFileSync(AUDIT_PATH, "utf-8");
    const lineCount = content.split("\n").filter((l) => l.trim()).length;
    return { entries: lineCount, sizeBytes: s.size };
  } catch {
    return { entries: 0, sizeBytes: 0 };
  }
}
