import { apiResponse, apiError } from "./_helpers";
import { collectSchedules, getScheduleLog } from "../collectors/schedule-collector";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function handleSchedules(_req: Request): Promise<Response> {
  try {
    const schedules = await collectSchedules();
    return apiResponse(schedules, "schedule-collector", 30);
  } catch (err) {
    return apiError("SCHEDULE_ERROR", String(err), "schedules");
  }
}

export async function handleScheduleLog(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const logPath = url.searchParams.get("path");
  const lines = Number(url.searchParams.get("lines") ?? 50);

  if (!logPath) {
    return apiError("MISSING_PARAM", "Log path required", "schedules", 400);
  }

  // Security: only allow reading from aidevops log directory
  const HOME = process.env.HOME ?? "/tmp";
  if (!logPath.startsWith(`${HOME}/.aidevops/logs/`)) {
    return apiError("FORBIDDEN", "Can only read aidevops log files", "schedules", 403);
  }

  try {
    const entries = await getScheduleLog(logPath, Math.min(lines, 200));
    return apiResponse(entries, "schedule-log", 10);
  } catch (err) {
    return apiError("LOG_ERROR", String(err), "schedules");
  }
}

export async function handleScheduleToggle(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { label: string; enabled: boolean; plistPath: string };
    const { label, enabled, plistPath } = body;

    if (!label || !plistPath) {
      return apiError("MISSING_PARAM", "Label and plistPath required", "schedules", 400);
    }

    // Security: only allow aidevops plists
    if (!label.startsWith("com.aidevops.") && !label.startsWith("sh.aidevops.")) {
      return apiError("FORBIDDEN", "Can only control aidevops services", "schedules", 403);
    }

    if (enabled) {
      await execAsync(`launchctl load "${plistPath}"`);
    } else {
      await execAsync(`launchctl unload "${plistPath}"`);
    }

    return apiResponse({ label, enabled, action: enabled ? "loaded" : "unloaded" }, "schedule-toggle", 0);
  } catch (err) {
    return apiError("TOGGLE_ERROR", String(err), "schedules");
  }
}

export async function handleScheduleRun(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as { label: string };
    const { label } = body;

    if (!label) {
      return apiError("MISSING_PARAM", "Label required", "schedules", 400);
    }

    if (!label.startsWith("com.aidevops.") && !label.startsWith("sh.aidevops.")) {
      return apiError("FORBIDDEN", "Can only run aidevops services", "schedules", 403);
    }

    // kickstart forces an immediate run
    const uid = process.getuid?.() ?? 501;
    await execAsync(`launchctl kickstart "gui/${uid}/${label}"`);

    return apiResponse({ label, action: "kicked" }, "schedule-run", 0);
  } catch (err) {
    return apiError("RUN_ERROR", String(err), "schedules");
  }
}
