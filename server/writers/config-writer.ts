import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const HOME = process.env.HOME ?? "/tmp";
const CONFIG_DIR = join(HOME, ".aidevops/dashboard");
const CONFIG_PATH = join(CONFIG_DIR, "settings.json");

export interface DashboardSettings {
  tokenBudget: {
    monthlyCap: number;
    dailyWarn: number;
    monthlyWarnPct: number;
    monthlyAlertPct: number;
  };
  collectors: Record<string, boolean>;
  refreshIntervals: Record<string, number>;
  alerts: Record<string, { enabled: boolean; threshold?: number }>;
  updateMode: "auto" | "manual";
}

const defaults: DashboardSettings = {
  tokenBudget: {
    monthlyCap: 400,
    dailyWarn: 25,
    monthlyWarnPct: 75,
    monthlyAlertPct: 90,
  },
  collectors: {
    systemLocal: true,
    systemVps: true,
    ollama: true,
    git: true,
    tokens: true,
    uptime: true,
    ssl: true,
    actions: true,
    pagespeed: true,
  },
  refreshIntervals: {
    systemLocal: 15,
    systemVps: 30,
    ollama: 10,
    git: 300,
    tokens: 300,
    uptime: 120,
    ssl: 3600,
    actions: 120,
    pagespeed: 86400,
  },
  alerts: {
    "budget-75-percent": { enabled: true, threshold: 0.75 },
    "budget-90-percent": { enabled: true, threshold: 0.9 },
    "cpu-high": { enabled: true, threshold: 80 },
    "ram-high": { enabled: true, threshold: 85 },
    "disk-high": { enabled: true, threshold: 90 },
    "ssl-expiry-14d": { enabled: true, threshold: 14 },
    "ssl-expiry-7d": { enabled: true, threshold: 7 },
  },
  updateMode: "auto",
};

mkdirSync(CONFIG_DIR, { recursive: true });

export function loadSettings(): DashboardSettings {
  try {
    if (existsSync(CONFIG_PATH)) {
      const content = readFileSync(CONFIG_PATH, "utf-8");
      const saved = JSON.parse(content) as Partial<DashboardSettings>;
      return { ...defaults, ...saved };
    }
  } catch {
    // Fall back to defaults
  }
  return { ...defaults };
}

export function saveSettings(settings: DashboardSettings): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

export function updateBudget(monthlyCap: number): DashboardSettings {
  const settings = loadSettings();
  settings.tokenBudget.monthlyCap = monthlyCap;
  saveSettings(settings);
  return settings;
}

export function updateAlert(ruleId: string, enabled: boolean, threshold?: number): DashboardSettings {
  const settings = loadSettings();
  if (!settings.alerts[ruleId]) {
    settings.alerts[ruleId] = { enabled, threshold };
  } else {
    settings.alerts[ruleId].enabled = enabled;
    if (threshold !== undefined) settings.alerts[ruleId].threshold = threshold;
  }
  saveSettings(settings);
  return settings;
}

export function updateCollector(name: string, enabled: boolean): DashboardSettings {
  const settings = loadSettings();
  settings.collectors[name] = enabled;
  saveSettings(settings);
  return settings;
}

export function updateRefreshInterval(source: string, intervalSeconds: number): DashboardSettings {
  const settings = loadSettings();
  settings.refreshIntervals[source] = intervalSeconds;
  saveSettings(settings);
  return settings;
}

export function updateUpdateMode(mode: "auto" | "manual"): DashboardSettings {
  const settings = loadSettings();
  settings.updateMode = mode;
  saveSettings(settings);
  return settings;
}
