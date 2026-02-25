import { mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";

const HOME = process.env.HOME ?? "/tmp";
const LOG_DIR = `${HOME}/.aidevops/dashboard/logs`;
const LOG_RETENTION_DAYS = 7;
const LOG_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

interface LogEntry {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  msg: string;
  data?: unknown;
}

class Logger {
  private writer: ReturnType<typeof Bun.file.prototype.writer> | null = null;
  private currentLogFile: string;
  private level: string;
  private rotateInterval: ReturnType<typeof setInterval> | null = null;

  constructor(level = "info") {
    this.level = level;
    mkdirSync(LOG_DIR, { recursive: true });
    this.currentLogFile = this.logFilePath();
    this.openWriter();

    // Check rotation every hour
    this.rotateInterval = setInterval(() => this.rotateIfNeeded(), 3600_000);
  }

  info(msg: string, data?: unknown): void {
    this.write("info", msg, data);
  }

  warn(msg: string, data?: unknown): void {
    this.write("warn", msg, data);
  }

  error(msg: string, data?: unknown): void {
    this.write("error", msg, data);
  }

  debug(msg: string, data?: unknown): void {
    if (this.level === "debug") {
      this.write("debug", msg, data);
    }
  }

  private write(level: LogEntry["level"], msg: string, data?: unknown): void {
    const levels = ["debug", "info", "warn", "error"];
    if (levels.indexOf(level) < levels.indexOf(this.level as LogEntry["level"])) return;

    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...(data !== undefined && { data }),
    };

    try {
      this.writer?.write(JSON.stringify(entry) + "\n");
    } catch {
      // Logging should never crash the app
    }

    // Also log to console for development
    const prefix = `[${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(prefix, msg, data ?? "");
    } else if (level === "warn") {
      console.warn(prefix, msg, data ?? "");
    }
  }

  private logFilePath(): string {
    const date = new Date().toISOString().slice(0, 10);
    return join(LOG_DIR, `dashboard-${date}.log`);
  }

  private openWriter(): void {
    try {
      this.writer = Bun.file(this.currentLogFile).writer();
    } catch {
      this.writer = null;
    }
  }

  private rotateIfNeeded(): void {
    const newPath = this.logFilePath();

    // Date changed — rotate
    if (newPath !== this.currentLogFile) {
      try { this.writer?.flush(); } catch { /* ignore */ }
      this.currentLogFile = newPath;
      this.openWriter();
    }

    // Check size
    try {
      const s = statSync(this.currentLogFile);
      if (s.size > LOG_MAX_SIZE_BYTES) {
        // Rename current and start fresh
        const rotatedPath = `${this.currentLogFile}.${Date.now()}`;
        try {
          Bun.spawnSync(["mv", this.currentLogFile, rotatedPath]);
        } catch { /* ignore */ }
        this.openWriter();
      }
    } catch {
      // File doesn't exist yet
    }

    // Clean old logs
    this.cleanOldLogs();
  }

  private cleanOldLogs(): void {
    try {
      const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      const files = readdirSync(LOG_DIR).filter((f) => f.startsWith("dashboard-"));

      for (const file of files) {
        try {
          const s = statSync(join(LOG_DIR, file));
          if (s.mtime.getTime() < cutoff) {
            unlinkSync(join(LOG_DIR, file));
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Directory not readable
    }
  }

  destroy(): void {
    if (this.rotateInterval) clearInterval(this.rotateInterval);
    try { this.writer?.flush(); } catch { /* ignore */ }
  }
}

// Singleton
export const logger = new Logger(process.env.DASHBOARD_LOG_LEVEL ?? "info");
