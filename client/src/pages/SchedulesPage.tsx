import { useState } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/components/actions/Toaster";
import { ConfirmDialog } from "@/components/actions/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Timer,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

interface HealthTest {
  name: string;
  status: "pass" | "fail";
  duration_ms: number;
}

interface HealthReport {
  project: string;
  status: "healthy" | "degraded" | "failing";
  timestamp: string;
  duration_ms: number;
  passed: number;
  failed: number;
  total: number;
  tests: HealthTest[];
}

interface ScheduleEntry {
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

interface LogEntry {
  timestamp: string;
  line: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return "just now";
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}min ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

const healthStatusConfig = {
  healthy: { color: "text-emerald-400", border: "border-emerald-400/30", bg: "bg-emerald-400/10", icon: ShieldCheck, dot: "bg-emerald-400" },
  degraded: { color: "text-amber-400", border: "border-amber-400/30", bg: "bg-amber-400/10", icon: AlertTriangle, dot: "bg-amber-400" },
  failing: { color: "text-rose-400", border: "border-rose-400/30", bg: "bg-rose-400/10", icon: ShieldAlert, dot: "bg-rose-400" },
};

function HealthOverlay({ health }: { health: HealthReport }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = healthStatusConfig[health.status];
  const Icon = cfg.icon;

  return (
    <div className={`mt-3 rounded-md ${cfg.bg} border ${cfg.border} p-3`}>
      <button
        className="flex items-center justify-between w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
          <span className={`text-xs font-medium ${cfg.color}`}>
            {health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          </span>
          <Badge variant="outline" className={`text-[10px] ${cfg.border} ${cfg.color} px-1.5 py-0 gap-1`}>
            <Activity className="h-2.5 w-2.5" />
            {health.passed}/{health.total} passed
          </Badge>
          <span className="text-[10px] text-[#71717a]">
            {formatDuration(health.duration_ms)} &middot; {formatTimestamp(health.timestamp)}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-[#71717a]" />
        ) : (
          <ChevronRight className="h-3 w-3 text-[#71717a]" />
        )}
      </button>

      {expanded && health.tests.length > 0 && (
        <div className="mt-2 space-y-1">
          {health.tests.map((test, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
              {test.status === "pass" ? (
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 text-rose-400 shrink-0" />
              )}
              <span className={test.status === "pass" ? "text-[#a1a1aa]" : "text-rose-400"}>
                {test.name}
              </span>
              <span className="text-[#3f3f46] ml-auto">{formatDuration(test.duration_ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleCard({ schedule, onRefresh }: { schedule: ScheduleEntry; onRefresh: () => void }) {
  const [showLog, setShowLog] = useState(false);
  const { showToast } = useToast();
  const { data: logEntries, refresh: refreshLog } = useApiData<LogEntry[]>(
    `schedules/log?path=${encodeURIComponent(schedule.logPath ?? "")}&lines=30`,
    showLog ? 10 : 0,
  );

  const toggleAction = useAction({
    endpoint: "/api/actions/schedules/toggle",
    onSuccess: () => {
      showToast("success", `${schedule.label} ${schedule.enabled ? "stopped" : "started"}`);
      onRefresh();
    },
    onError: (err) => showToast("error", `Toggle failed: ${err}`),
  });

  const runAction = useAction({
    endpoint: "/api/actions/schedules/run",
    onSuccess: () => {
      showToast("success", `${schedule.label} triggered`);
      onRefresh();
    },
    onError: (err) => showToast("error", `Run failed: ${err}`),
  });

  // Determine status dot color — use health status if available
  const dotColor = schedule.health
    ? healthStatusConfig[schedule.health.status].dot
    : schedule.running
      ? "bg-emerald-400"
      : schedule.enabled
        ? "bg-cyan-400"
        : "bg-[#3f3f46]";

  const dotAnimate = schedule.running ? "animate-pulse" : "";

  return (
    <Card className="bg-[#111118] border-[#1e1e2e]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 shrink-0">
              <div className={`h-2.5 w-2.5 rounded-full ${dotColor} ${dotAnimate}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#e4e4e7] truncate">{schedule.description}</p>
              <p className="text-[10px] font-mono text-[#71717a] mt-0.5 truncate">{schedule.label}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0 gap-1">
                  <Timer className="h-2.5 w-2.5" />
                  {schedule.interval}
                </Badge>
                <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0">
                  {schedule.type}
                </Badge>
                {schedule.keepAlive && (
                  <Badge variant="outline" className="text-[10px] border-emerald-400/30 text-emerald-400 px-1.5 py-0">
                    KeepAlive
                  </Badge>
                )}
                {schedule.pid && (
                  <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a] px-1.5 py-0">
                    PID {schedule.pid}
                  </Badge>
                )}
                {schedule.lastExitStatus !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 gap-1 ${
                      schedule.lastExitStatus === 0
                        ? "border-emerald-400/30 text-emerald-400"
                        : "border-rose-400/30 text-rose-400"
                    }`}
                  >
                    {schedule.lastExitStatus === 0 ? (
                      <CheckCircle2 className="h-2.5 w-2.5" />
                    ) : (
                      <XCircle className="h-2.5 w-2.5" />
                    )}
                    Exit {schedule.lastExitStatus}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {schedule.logPath && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e] gap-1"
                onClick={() => {
                  setShowLog(!showLog);
                  if (!showLog) refreshLog();
                }}
              >
                <Terminal className="h-3 w-3" />
                {showLog ? "Hide" : "Logs"}
              </Button>
            )}
            {schedule.type === "launchd" && !schedule.keepAlive && (
              <ConfirmDialog
                title={`Run ${schedule.description}`}
                description="Trigger an immediate execution of this scheduled task."
                confirmLabel="Run Now"
                onConfirm={async () => { await runAction.execute({ label: schedule.label }); }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] border-cyan-400/30 text-cyan-400 hover:text-[#e4e4e7] hover:bg-cyan-400/10 gap-1"
                  disabled={runAction.loading}
                >
                  {runAction.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                  Run
                </Button>
              </ConfirmDialog>
            )}
            {schedule.type === "launchd" && schedule.plistPath && (
              <ConfirmDialog
                title={`${schedule.enabled ? "Stop" : "Start"} ${schedule.description}`}
                description={`${schedule.enabled ? "Unload" : "Load"} the launchd service. ${
                  schedule.enabled ? "It will stop running until re-enabled." : "It will resume its schedule."
                }`}
                confirmLabel={schedule.enabled ? "Stop" : "Start"}
                onConfirm={async () => {
                  await toggleAction.execute({
                    label: schedule.label,
                    enabled: !schedule.enabled,
                    plistPath: schedule.plistPath!,
                  });
                }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-7 text-[10px] gap-1 ${
                    schedule.enabled
                      ? "border-amber-400/30 text-amber-400 hover:text-[#e4e4e7] hover:bg-amber-400/10"
                      : "border-emerald-400/30 text-emerald-400 hover:text-[#e4e4e7] hover:bg-emerald-400/10"
                  }`}
                >
                  {schedule.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {schedule.enabled ? "Stop" : "Start"}
                </Button>
              </ConfirmDialog>
            )}
          </div>
        </div>

        {/* Health report overlay */}
        {schedule.health && <HealthOverlay health={schedule.health} />}

        {/* Log viewer */}
        {showLog && schedule.logPath && (
          <div className="mt-3 rounded-md bg-[#0a0a0f] border border-[#1e1e2e] p-3 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono text-[#3f3f46]">{schedule.logPath}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] text-[#71717a] hover:text-[#e4e4e7] p-1"
                onClick={refreshLog}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            {logEntries && logEntries.length > 0 ? (
              <pre className="text-[10px] font-mono text-[#71717a] whitespace-pre-wrap break-all leading-relaxed">
                {logEntries.map((e, i) => (
                  <div key={i} className="hover:text-[#e4e4e7] transition-colors">
                    {e.line}
                  </div>
                ))}
              </pre>
            ) : (
              <p className="text-[10px] text-[#3f3f46]">No log entries</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SchedulesPage() {
  const { data: schedules, refresh, loading } = useApiData<ScheduleEntry[]>("schedules", 30);
  const runningCount = schedules?.filter((s) => s.running).length ?? 0;
  const enabledCount = schedules?.filter((s) => s.enabled).length ?? 0;
  const totalCount = schedules?.length ?? 0;
  const healthyCount = schedules?.filter((s) => s.health?.status === "healthy").length ?? 0;
  const failingCount = schedules?.filter((s) => s.health && s.health.status !== "healthy").length ?? 0;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Schedules</h1>
          <p className="text-sm text-[#71717a] mt-1">
            Scheduled tasks, background services, and automation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#71717a]">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            {runningCount} running
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#71717a]">
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
            {enabledCount}/{totalCount} enabled
          </div>
          {(healthyCount > 0 || failingCount > 0) && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#71717a]">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              {healthyCount} healthy
              {failingCount > 0 && (
                <span className="text-rose-400 ml-1">{failingCount} degraded/failing</span>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7]"
            onClick={refresh}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !schedules ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
        </div>
      ) : schedules && schedules.length > 0 ? (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <ScheduleCard key={schedule.id} schedule={schedule} onRefresh={refresh} />
          ))}
        </div>
      ) : (
        <Card className="bg-[#111118] border-[#1e1e2e]">
          <CardContent className="p-8 text-center">
            <Clock className="h-8 w-8 text-[#3f3f46] mx-auto mb-3" />
            <p className="text-sm text-[#71717a]">No scheduled tasks found.</p>
            <p className="text-[10px] text-[#3f3f46] mt-1">
              aidevops launchd plists (com.aidevops.* / sh.aidevops.*) will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
