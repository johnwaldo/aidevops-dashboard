/**
 * Schedule Collector — reads launchd plists, crontab, and health reports
 * for aidevops scheduled tasks
 */
import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const HOME = process.env.HOME ?? "/tmp";
const LAUNCH_AGENTS_DIR = `${HOME}/Library/LaunchAgents`;
const HEALTH_DIR = `${HOME}/.aidevops/.agent-workspace/health`;

export interface HealthTest {
  name: string;
  status: "pass" | "fail";
  duration_ms: number;
}

export interface HealthReport {
  project: string;
  status: "healthy" | "degraded" | "failing";
  timestamp: string;
  duration_ms: number;
  passed: number;
  failed: number;
  total: number;
  tests: HealthTest[];
}

export interface ScheduleEntry {
  id: string;
  label: string;
  type: "launchd" | "cron";
  description: string;
  interval: string;
  intervalSeconds: number | null;
  enabled: boolean;
  running: boolean;
  pid: number | null;
  lastExitStatus: number | null;
  logPath: string | null;
  errorLogPath: string | null;
  plistPath: string | null;
  keepAlive: boolean;
  runAtLoad: boolean;
  health: HealthReport | null;
}

export interface ScheduleLogEntry {
  timestamp: string;
  line: string;
}

// Human-readable interval description
function describeInterval(plist: Record<string, unknown>): { text: string; seconds: number | null } {
  const interval = plist.StartInterval as number | undefined;
  if (interval) {
    if (interval < 60) return { text: `Every ${interval}s`, seconds: interval };
    if (interval < 3600) return { text: `Every ${Math.round(interval / 60)}min`, seconds: interval };
    if (interval < 86400) return { text: `Every ${Math.round(interval / 3600)}h`, seconds: interval };
    return { text: `Every ${Math.round(interval / 86400)}d`, seconds: interval };
  }

  const cal = plist.StartCalendarInterval as Record<string, number> | undefined;
  if (cal) {
    const parts: string[] = [];
    if (cal.Weekday !== undefined) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      parts.push(days[cal.Weekday] ?? `Day ${cal.Weekday}`);
    }
    if (cal.Hour !== undefined) {
      const h = cal.Hour;
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const m = cal.Minute ?? 0;
      parts.push(`${h12}:${String(m).padStart(2, "0")} ${ampm}`);
    }
    return { text: parts.join(" at ") || "Calendar", seconds: null };
  }

  if (plist.KeepAlive) return { text: "KeepAlive (always running)", seconds: null };
  if (plist.RunAtLoad) return { text: "Run at load", seconds: null };

  return { text: "Manual", seconds: null };
}

// Friendly description from label
function labelToDescription(label: string): string {
  const map: Record<string, string> = {
    "com.aidevops.aidevops-auto-update": "Framework auto-update checker",
    "com.aidevops.aidevops-repo-sync": "Registered repository sync",
    "com.aidevops.aidevops-supervisor-pulse": "Supervisor pulse — task dispatch",
    "com.aidevops.dashboard": "Dashboard server",
    "sh.aidevops.session-miner-pulse": "Session miner — extract learnings",
  };
  return map[label] ?? label.replace(/^(com\.aidevops\.|sh\.aidevops\.)/, "").replace(/[-_]/g, " ");
}

// Parse a plist file using plutil (macOS native)
async function parsePlist(path: string): Promise<Record<string, unknown> | null> {
  try {
    const { stdout } = await execAsync(`plutil -convert json -o - "${path}"`);
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

// Get launchctl status for a label
async function getLaunchctlStatus(label: string): Promise<{ running: boolean; pid: number | null; lastExit: number | null }> {
  try {
    const { stdout } = await execAsync(`launchctl list "${label}" 2>/dev/null`);
    // Output format: "PID\tStatus\tLabel" or detailed key-value
    const lines = stdout.trim().split("\n");
    // Try parsing the simple format first
    if (lines.length === 1) {
      const parts = lines[0].split("\t");
      const pid = parts[0] === "-" ? null : Number(parts[0]);
      const status = parts[1] === "-" ? null : Number(parts[1]);
      return { running: pid !== null && pid > 0, pid, lastExit: status };
    }
    // Key-value format
    let pid: number | null = null;
    let lastExit: number | null = null;
    for (const line of lines) {
      if (line.includes('"PID"')) {
        const match = line.match(/=\s*(\d+)/);
        if (match) pid = Number(match[1]);
      }
      if (line.includes('"LastExitStatus"')) {
        const match = line.match(/=\s*(\d+)/);
        if (match) lastExit = Number(match[1]);
      }
    }
    return { running: pid !== null && pid > 0, pid, lastExit };
  } catch {
    return { running: false, pid: null, lastExit: null };
  }
}

// Extract project name from a launchd label for health report matching
// Convention: sh.aidevops.{project}-* or com.aidevops.{project}-*
function extractProjectFromLabel(label: string): string | null {
  // sh.aidevops.{project}-something → project
  const shMatch = label.match(/^sh\.aidevops\.([^-]+)/);
  if (shMatch) return shMatch[1];
  // com.aidevops.{project}-something → project (skip "aidevops" itself)
  const comMatch = label.match(/^com\.aidevops\.([^-]+)/);
  if (comMatch && comMatch[1] !== "aidevops") return comMatch[1];
  return null;
}

// Load all health reports from the health directory
async function loadHealthReports(): Promise<Map<string, HealthReport>> {
  const reports = new Map<string, HealthReport>();
  try {
    const files = await readdir(HEALTH_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    for (const file of jsonFiles) {
      try {
        const content = await readFile(join(HEALTH_DIR, file), "utf-8");
        const report = JSON.parse(content) as HealthReport;
        if (report.project) {
          reports.set(report.project, report);
        }
      } catch {
        // Skip malformed health reports
      }
    }
  } catch {
    // Health directory may not exist
  }
  return reports;
}

// Match a health report to a launchd entry
function matchHealthReport(
  label: string,
  plist: Record<string, unknown>,
  reports: Map<string, HealthReport>,
): HealthReport | null {
  // Method 1: label convention — sh.aidevops.{project}-* matches health/{project}.json
  const project = extractProjectFromLabel(label);
  if (project && reports.has(project)) {
    return reports.get(project)!;
  }

  // Method 2: ProgramArguments script path contains the project name
  const args = plist.ProgramArguments as string[] | undefined;
  if (args) {
    const argsStr = args.join(" ").toLowerCase();
    for (const [proj, report] of reports) {
      if (argsStr.includes(proj.toLowerCase())) {
        return report;
      }
    }
  }

  return null;
}

export async function collectSchedules(): Promise<ScheduleEntry[]> {
  const entries: ScheduleEntry[] = [];

  // Load health reports up front
  const healthReports = await loadHealthReports();

  // 1. Read launchd plists
  try {
    const files = await readdir(LAUNCH_AGENTS_DIR);
    const aidevopsPlists = files.filter(
      (f) => (f.startsWith("com.aidevops.") || f.startsWith("sh.aidevops.")) && f.endsWith(".plist"),
    );

    for (const file of aidevopsPlists) {
      const path = join(LAUNCH_AGENTS_DIR, file);
      const plist = await parsePlist(path);
      if (!plist) continue;

      const label = (plist.Label as string) ?? file.replace(".plist", "");
      const { text: intervalText, seconds: intervalSeconds } = describeInterval(plist);
      const status = await getLaunchctlStatus(label);
      const health = matchHealthReport(label, plist, healthReports);

      entries.push({
        id: label,
        label,
        type: "launchd",
        description: labelToDescription(label),
        interval: intervalText,
        intervalSeconds,
        enabled: status.running || status.lastExit !== null, // loaded = enabled
        running: status.running,
        pid: status.pid,
        lastExitStatus: status.lastExit,
        logPath: (plist.StandardOutPath as string) ?? null,
        errorLogPath: (plist.StandardErrorPath as string) ?? null,
        plistPath: path,
        keepAlive: Boolean(plist.KeepAlive),
        runAtLoad: Boolean(plist.RunAtLoad),
        health,
      });
    }
  } catch {
    // LaunchAgents dir may not exist on non-macOS
  }

  // 2. Read crontab for aidevops entries
  try {
    const { stdout } = await execAsync("crontab -l 2>/dev/null");
    const lines = stdout.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("# aidevops:")) {
        const desc = lines[i].replace(/.*# aidevops:\s*/, "").trim();
        const cronLine = lines[i + 1];
        if (cronLine && !cronLine.startsWith("#")) {
          entries.push({
            id: `cron-${i}`,
            label: `cron: ${desc}`,
            type: "cron",
            description: desc,
            interval: cronLine.split(/\s+/).slice(0, 5).join(" "),
            intervalSeconds: null,
            enabled: true,
            running: false,
            pid: null,
            lastExitStatus: null,
            logPath: null,
            errorLogPath: null,
            plistPath: null,
            keepAlive: false,
            runAtLoad: false,
            health: null,
          });
        }
      }
    }
  } catch {
    // No crontab or not available
  }

  return entries;
}

export async function getScheduleLog(logPath: string, lines = 50): Promise<ScheduleLogEntry[]> {
  try {
    const { stdout } = await execAsync(`tail -n ${lines} "${logPath}" 2>/dev/null`);
    return stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        // Try to extract timestamp from common log formats
        const tsMatch = line.match(/^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
        return {
          timestamp: tsMatch?.[1] ?? "",
          line,
        };
      });
  } catch {
    return [];
  }
}
