import { readdir, stat } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { config } from "../config";

export interface TokenEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  timestamp: string;
  messageId: string;
  projectPath: string;
}

export interface BudgetStatus {
  monthlyCap: number;
  currentMonth: number;
  today: number;
  thisWeek: number;
  dailyHistory: number[];
  usedPct: number;
  projectedMonthEnd: number;
  projectedPct: number;
  dailyAvg: number;
  dailyBurnRate: number;
  daysRemaining: number;
  status: "ok" | "warn" | "alert" | "critical" | "exceeded";
}

export interface SessionCost {
  sessionFile: string;
  project: string;
  cost: number;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  firstMessage: string;
  lastMessage: string;
  models: string[];
}

export interface TokenSummary {
  budget: {
    today: number;
    thisWeek: number;
    currentMonth: number;
    dailyHistory: number[];
  };
  budgetStatus: BudgetStatus;
  byModel: {
    model: string;
    tokens: number;
    cost: number;
    pct: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
  }[];
  byProject: { project: string; cost: number; requests: number }[];
  totalRequests: number;
  totalCost: number;
}

// Per million tokens pricing
const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheCreate: number }> = {
  "claude-opus-4-6": { input: 15.0, output: 75.0, cacheRead: 1.5, cacheCreate: 18.75 },
  "claude-opus-4-5-20250620": { input: 15.0, output: 75.0, cacheRead: 1.5, cacheCreate: 18.75 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheRead: 0.3, cacheCreate: 3.75 },
  "claude-sonnet-4-5-20250929": { input: 3.0, output: 15.0, cacheRead: 0.3, cacheCreate: 3.75 },
  "claude-sonnet-4-20250514": { input: 3.0, output: 15.0, cacheRead: 0.3, cacheCreate: 3.75 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0, cacheRead: 0.08, cacheCreate: 1.0 },
  "claude-haiku-3-5-20241022": { input: 0.8, output: 4.0, cacheRead: 0.08, cacheCreate: 1.0 },
};

function calculateCost(entry: TokenEntry): number {
  // Try exact match first, then prefix match
  let rates = PRICING[entry.model];
  if (!rates) {
    const prefix = Object.keys(PRICING).find((k) => entry.model.startsWith(k.split("-").slice(0, 3).join("-")));
    if (prefix) rates = PRICING[prefix];
  }
  if (!rates) return 0;

  return (
    (entry.inputTokens * rates.input) / 1_000_000 +
    (entry.outputTokens * rates.output) / 1_000_000 +
    (entry.cacheReadTokens * rates.cacheRead) / 1_000_000 +
    (entry.cacheCreateTokens * rates.cacheCreate) / 1_000_000
  );
}

function projectFromPath(filePath: string): string {
  // ~/.claude/projects/-Users-{user}-{project}/xxx.jsonl -> {project}
  const dirName = basename(dirname(filePath));
  const parts = dirName.split("-").filter(Boolean);
  return parts[parts.length - 1] ?? dirName;
}

async function findJsonlFiles(baseDir: string, since: Date): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.endsWith(".jsonl")) {
          try {
            const s = await stat(fullPath);
            if (s.mtime >= since) {
              files.push(fullPath);
            }
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Directory not readable
    }
  }

  await walk(baseDir);
  return files;
}

export async function scanTokenLogs(since: Date): Promise<TokenEntry[]> {
  const entries: TokenEntry[] = [];
  const seen = new Map<string, TokenEntry>(); // Dedup: keep highest token counts per message

  const files = await findJsonlFiles(config.claudeLogDir, since);

  for (const filePath of files) {
    try {
      const text = await Bun.file(filePath).text();
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.type !== "assistant" || !entry.message?.usage) continue;

          const msgId = entry.message.id ?? "";
          const dedupKey = `${msgId}:${entry.requestId ?? ""}`;

          const parsed: TokenEntry = {
            model: entry.message.model ?? "unknown",
            inputTokens: entry.message.usage.input_tokens ?? 0,
            outputTokens: entry.message.usage.output_tokens ?? 0,
            cacheReadTokens: entry.message.usage.cache_read_input_tokens ?? 0,
            cacheCreateTokens: entry.message.usage.cache_creation_input_tokens ?? 0,
            timestamp: entry.timestamp ?? new Date().toISOString(),
            messageId: msgId,
            projectPath: filePath,
          };

          // Keep the entry with highest total tokens (last streaming chunk)
          const existing = seen.get(dedupKey);
          const totalNew = parsed.inputTokens + parsed.outputTokens;
          const totalExisting = existing ? existing.inputTokens + existing.outputTokens : 0;

          if (!existing || totalNew > totalExisting) {
            seen.set(dedupKey, parsed);
          }
        } catch {
          // Skip malformed lines
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return [...seen.values()];
}

export async function collectTokenSummary(): Promise<TokenSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Scan logs from start of month
  const entries = await scanTokenLogs(startOfMonth);

  // Aggregate by model
  const modelMap = new Map<string, { tokens: number; cost: number; requests: number; inputTokens: number; outputTokens: number }>();
  const projectMap = new Map<string, { cost: number; requests: number }>();
  const dailyMap = new Map<string, number>(); // date string -> cost

  let totalCost = 0;
  let todayCost = 0;
  let weekCost = 0;

  for (const entry of entries) {
    const cost = calculateCost(entry);
    totalCost += cost;

    const entryDate = new Date(entry.timestamp);
    if (entryDate >= startOfToday) todayCost += cost;
    if (entryDate >= startOfWeek) weekCost += cost;

    // Daily history
    const dayKey = entryDate.toISOString().slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + cost);

    // Model aggregation — normalize model name
    const modelName = entry.model.includes("opus") ? "Opus" :
      entry.model.includes("sonnet") ? "Sonnet" :
      entry.model.includes("haiku") ? "Haiku" : entry.model;

    const existing = modelMap.get(modelName) ?? { tokens: 0, cost: 0, requests: 0, inputTokens: 0, outputTokens: 0 };
    existing.tokens += entry.inputTokens + entry.outputTokens;
    existing.cost += cost;
    existing.requests += 1;
    existing.inputTokens += entry.inputTokens;
    existing.outputTokens += entry.outputTokens;
    modelMap.set(modelName, existing);

    // Project aggregation
    const project = projectFromPath(entry.projectPath);
    const projExisting = projectMap.get(project) ?? { cost: 0, requests: 0 };
    projExisting.cost += cost;
    projExisting.requests += 1;
    projectMap.set(project, projExisting);
  }

  // Build daily history (last 14 days)
  const dailyHistory: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyHistory.push(Math.round((dailyMap.get(key) ?? 0) * 100) / 100);
  }

  // Build byModel array with percentages
  const byModel = [...modelMap.entries()]
    .map(([model, data]) => ({
      model,
      tokens: data.tokens,
      cost: Math.round(data.cost * 100) / 100,
      pct: totalCost > 0 ? Math.round((data.cost / totalCost) * 100) : 0,
      requests: data.requests,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
    }))
    .sort((a, b) => b.cost - a.cost);

  const byProject = [...projectMap.entries()]
    .map(([project, data]) => ({
      project,
      cost: Math.round(data.cost * 100) / 100,
      requests: data.requests,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Budget status computation
  const { monthlyCap, dailyWarn, monthlyWarnPct, monthlyAlertPct } = config.thresholds.tokenBudget;
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - dayOfMonth;
  const dailyAvg = dayOfMonth > 0 ? totalCost / dayOfMonth : 0;
  const projectedMonthEnd = totalCost + dailyAvg * daysRemaining;
  const usedPct = monthlyCap > 0 ? (totalCost / monthlyCap) * 100 : 0;
  const projectedPct = monthlyCap > 0 ? (projectedMonthEnd / monthlyCap) * 100 : 0;

  // Burn rate: weighted average — last 3 days weighted 2x vs older days
  const recentDays = dailyHistory.slice(-3);
  const olderDays = dailyHistory.slice(0, -3);
  const recentAvg = recentDays.length > 0 ? recentDays.reduce((a, b) => a + b, 0) / recentDays.length : 0;
  const olderAvg = olderDays.length > 0 ? olderDays.reduce((a, b) => a + b, 0) / olderDays.length : 0;
  const dailyBurnRate = olderDays.length > 0
    ? (recentAvg * 2 + olderAvg) / 3
    : recentAvg;

  let budgetStatusLevel: BudgetStatus["status"] = "ok";
  if (usedPct >= 100) budgetStatusLevel = "exceeded";
  else if (usedPct >= monthlyAlertPct || todayCost >= dailyWarn * 1.5) budgetStatusLevel = "critical";
  else if (usedPct >= monthlyWarnPct || todayCost >= dailyWarn) budgetStatusLevel = "warn";
  else if (projectedPct >= monthlyAlertPct) budgetStatusLevel = "alert";

  const budgetStatus: BudgetStatus = {
    monthlyCap,
    currentMonth: Math.round(totalCost * 100) / 100,
    today: Math.round(todayCost * 100) / 100,
    thisWeek: Math.round(weekCost * 100) / 100,
    dailyHistory,
    usedPct: Math.round(usedPct * 10) / 10,
    projectedMonthEnd: Math.round(projectedMonthEnd * 100) / 100,
    projectedPct: Math.round(projectedPct * 10) / 10,
    dailyAvg: Math.round(dailyAvg * 100) / 100,
    dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
    daysRemaining,
    status: budgetStatusLevel,
  };

  return {
    budget: {
      today: Math.round(todayCost * 100) / 100,
      thisWeek: Math.round(weekCost * 100) / 100,
      currentMonth: Math.round(totalCost * 100) / 100,
      dailyHistory,
    },
    budgetStatus,
    byModel,
    byProject,
    totalRequests: entries.length,
    totalCost: Math.round(totalCost * 100) / 100,
  };
}

export async function collectSessionCosts(): Promise<SessionCost[]> {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const files = await findJsonlFiles(config.claudeLogDir, since);
  const sessions: SessionCost[] = [];

  for (const filePath of files) {
    try {
      const text = await Bun.file(filePath).text();
      const seen = new Map<string, TokenEntry>();
      let firstTs = "";
      let lastTs = "";
      const models = new Set<string>();

      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.type !== "assistant" || !entry.message?.usage) continue;

          const msgId = entry.message.id ?? "";
          const dedupKey = `${msgId}:${entry.requestId ?? ""}`;
          const ts = entry.timestamp ?? "";

          if (!firstTs || ts < firstTs) firstTs = ts;
          if (!lastTs || ts > lastTs) lastTs = ts;

          const model = entry.message.model ?? "unknown";
          models.add(model.includes("opus") ? "Opus" :
            model.includes("sonnet") ? "Sonnet" :
            model.includes("haiku") ? "Haiku" : model);

          const parsed: TokenEntry = {
            model,
            inputTokens: entry.message.usage.input_tokens ?? 0,
            outputTokens: entry.message.usage.output_tokens ?? 0,
            cacheReadTokens: entry.message.usage.cache_read_input_tokens ?? 0,
            cacheCreateTokens: entry.message.usage.cache_creation_input_tokens ?? 0,
            timestamp: ts,
            messageId: msgId,
            projectPath: filePath,
          };

          const existing = seen.get(dedupKey);
          const totalNew = parsed.inputTokens + parsed.outputTokens;
          const totalExisting = existing ? existing.inputTokens + existing.outputTokens : 0;
          if (!existing || totalNew > totalExisting) {
            seen.set(dedupKey, parsed);
          }
        } catch {
          // Skip malformed lines
        }
      }

      if (seen.size === 0) continue;

      const entries = [...seen.values()];
      let totalCost = 0;
      let totalInput = 0;
      let totalOutput = 0;

      for (const e of entries) {
        totalCost += calculateCost(e);
        totalInput += e.inputTokens;
        totalOutput += e.outputTokens;
      }

      sessions.push({
        sessionFile: basename(filePath),
        project: projectFromPath(filePath),
        cost: Math.round(totalCost * 100) / 100,
        requests: entries.length,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        firstMessage: firstTs,
        lastMessage: lastTs,
        models: [...models],
      });
    } catch {
      // Skip unreadable files
    }
  }

  // Sort by cost descending
  return sessions.sort((a, b) => b.cost - a.cost);
}
