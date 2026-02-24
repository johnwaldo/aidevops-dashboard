# Phase 2 — Backend API & Data Layer

## Objective

Build the Bun.serve backend that reads real data from the aidevops filesystem, CLI, and external APIs. Wire the Phase 1 frontend to consume live data instead of mock data. At the end of this phase, every panel on the dashboard shows real information from your actual environment.

## Prerequisites

- Phase 1 complete (frontend with mock data renders correctly)
- aidevops installed and configured (`~/.aidevops/` exists, `aidevops status` runs)
- Ollama running locally with models loaded
- GitHub personal access token configured (via `aidevops secret` / gopass)
- SSH access to VPS configured
- `TODO.md` exists in at least one registered project

## References

- **Token tracking:** [CodexBar](https://github.com/steipete/CodexBar) — JSONL log scanning approach for Claude Code/OpenCode usage. See `docs/claude.md` for log format details and dedup logic.
- **Token tracking (alt):** [tokscale](https://github.com/junhoyeo/tokscale) — Documents JSONL paths for Claude, OpenCode, Gemini, Cursor, and others. Uses LiteLLM for dynamic pricing.
- **aidevops framework:** [marcusquinn/aidevops](https://github.com/marcusquinn/aidevops) — Filesystem conventions, agent structure, CLI commands.

## Architecture

```
client/                          # Phase 1 frontend (already built)
server/
├── index.ts                     # Bun.serve entry — mounts routes + WebSocket
├── config.ts                    # Environment config, paths, polling intervals
├── routes/
│   ├── tasks.ts                 # GET /api/tasks — parsed TODO.md + PLANS.md
│   ├── agents.ts                # GET /api/agents — parsed SKILL.md files
│   ├── status.ts                # GET /api/status — aidevops status wrapper
│   ├── health.ts                # GET /api/health — system metrics (local + VPS)
│   ├── ollama.ts                # GET /api/ollama — Ollama API proxy
│   ├── projects.ts              # GET /api/projects — Git platform APIs
│   ├── tokens.ts                # GET /api/tokens — token usage + cost tracking
│   ├── documents.ts             # GET /api/documents — workspace file tree + content
│   ├── needs.ts                 # GET /api/needs — aggregated human action queue
│   ├── uptime.ts                # GET /api/uptime — updown.io proxy
│   └── settings.ts              # GET /api/settings — config reader
├── parsers/
│   ├── todo-parser.ts           # TODO.md → structured tasks with Beads, time tracking
│   ├── plans-parser.ts          # PLANS.md → execution plans
│   ├── skill-parser.ts          # SKILL.md → agent metadata
│   └── status-parser.ts         # `aidevops status` CLI output → JSON
├── collectors/
│   ├── system-local.ts          # macOS metrics via shell commands
│   ├── system-vps.ts            # VPS metrics via SSH
│   ├── ollama-collector.ts      # Ollama /api/tags + /api/ps polling
│   ├── git-collector.ts         # GitHub/GitLab/Gitea API polling
│   ├── token-collector.ts       # Anthropic usage tracking + Ollama inference logs
│   └── uptime-collector.ts      # updown.io API polling
├── watchers/
│   └── file-watcher.ts          # fsevents for TODO.md, workspace changes
├── ws/
│   └── realtime.ts              # WebSocket broadcast on data changes
└── cache/
    └── store.ts                 # In-memory cache with TTL per data source
```

## Shared Conventions

### API Response Format
Every endpoint returns:
```typescript
{
  data: T,              // The actual payload
  meta: {
    source: string,     // "filesystem" | "cli" | "api" | "cache"
    timestamp: string,  // ISO 8601 when this data was collected
    cached: boolean,    // Whether this came from cache
    ttl: number         // Seconds until next refresh
  }
}
```

### Error Response
```typescript
{
  error: {
    code: string,       // "PARSE_ERROR" | "CONNECTION_FAILED" | "NOT_FOUND" etc
    message: string,
    source: string
  }
}
```

### Cache Strategy
```typescript
const CACHE_TTL = {
  tasks: 5,           // 5 seconds (filesystem watcher triggers instant refresh anyway)
  agents: 300,        // 5 minutes (rarely changes)
  status: 60,         // 1 minute
  healthLocal: 15,    // 15 seconds
  healthVPS: 30,      // 30 seconds
  ollama: 10,         // 10 seconds
  projects: 300,      // 5 minutes
  tokens: 300,        // 5 minutes
  uptime: 120,        // 2 minutes
  documents: 30,      // 30 seconds
  settings: 600,      // 10 minutes
};
```

### Config (server/config.ts)
Reads from environment variables with sensible defaults:
```typescript
export const config = {
  port: process.env.DASHBOARD_PORT ?? 3000,
  
  // Paths
  aidevopsDir: process.env.AIDEVOPS_DIR ?? `${process.env.HOME}/.aidevops`,
  aidevopsRepo: process.env.AIDEVOPS_REPO ?? `${process.env.HOME}/Git/aidevops`,
  workspaceDir: process.env.WORKSPACE_DIR ?? `${process.env.HOME}/.aidevops/.agent-workspace`,
  
  // VPS SSH
  vpsHost: process.env.VPS_HOST,           // e.g., "65.108.xxx.xxx"
  vpsUser: process.env.VPS_USER ?? "root",
  vpsPort: process.env.VPS_PORT ?? 22,
  
  // External APIs
  githubToken: null,    // Loaded from gopass at startup: `aidevops secret get GITHUB_TOKEN`
  anthropicKey: null,   // Loaded from gopass at startup
  updownApiKey: null,   // Loaded from gopass at startup
  
  // Ollama
  ollamaHost: process.env.OLLAMA_HOST ?? "http://localhost:11434",
  
  // Feature flags
  enableVPS: process.env.ENABLE_VPS !== "false",
  enableGit: process.env.ENABLE_GIT !== "false",
  enableUptime: process.env.ENABLE_UPTIME !== "false",
};
```

Secrets loaded at startup via:
```bash
# The backend shells out to gopass/aidevops secret at boot
const githubToken = await $`aidevops secret get GITHUB_TOKEN`.text();
```

---

## Session A — Backend Scaffold + Parsers + Filesystem

**Goal:** Backend server running, parsers reading real local files, endpoints returning real data for tasks, agents, status, documents, and settings.

**Estimated time:** 1.5-2 hours

### Step 1: Backend scaffold

Create `server/index.ts` with Bun.serve:
- Mount all API routes under `/api/*`
- Serve the Vite-built frontend for all other routes (SPA fallback)
- CORS headers for dev mode (Vite on :5173, server on :3000)
- WebSocket upgrade handling at `/ws`
- Startup: load secrets from gopass, initialize cache, start file watchers

Update `package.json` with scripts:
```json
{
  "scripts": {
    "dev": "concurrently \"bun run server:dev\" \"bun run client:dev\"",
    "server:dev": "bun --watch server/index.ts",
    "client:dev": "cd client && bun run dev",
    "build": "cd client && bun run build",
    "start": "bun server/index.ts"
  }
}
```

### Step 2: TODO.md parser

This is the most complex parser. The aidevops TODO.md format includes:

```markdown
## Backlog
- [ ] Task title ~4h #project @agent P2
  - Subtask or note
  - Depends: t-003

## In Progress  
- [ ] Task title ~6h started:2026-02-24T07:00:00Z #project @agent P1
  
## Done
- [x] Task title ~3h completed:2026-02-23T16:00:00Z #project @agent
```

The parser must extract:
- Title (text after `- [ ]` or `- [x]`)
- Status (from section header or checkbox)
- Time estimate (`~Xh` pattern)
- Started/completed timestamps
- Project tag (`#project`)
- Agent tag (`@agent`)
- Priority (`P0`-`P3`)
- Subtasks (indented lines)
- Dependencies (`Depends: t-XXX`)
- Task ID (if present, or generate from position)

Also parse `todo/PLANS.md` for execution plans linked to tasks.

**Route:** `GET /api/tasks` → returns tasks grouped by kanban column
**Route:** `GET /api/tasks?project=X` → filtered by project
**Route:** `GET /api/tasks?status=pending-approval` → filtered by status

### Step 3: SKILL.md parser

Scan `~/.aidevops/agents/` for all SKILL.md files. Each contains YAML frontmatter:

```yaml
---
name: code
description: Primary coding agent
subagents: [list]
mcps: [list]
---
```

Parse all of them into the agent roster structure.

Also scan agent config files for MCP server assignments and loading strategy.

**Route:** `GET /api/agents` → full agent roster with subagent counts and MCP assignments
**Route:** `GET /api/agents/mcps` → MCP server status list

### Step 4: `aidevops status` wrapper

Shell out to `aidevops status`, capture stdout, parse the structured output into JSON.

```typescript
const output = await $`aidevops status`.text();
// Parse sections: Version, Dependencies, Tools, etc.
```

**Route:** `GET /api/status` → parsed status object

### Step 5: Documents / workspace file browser

Recursively read `~/.aidevops/.agent-workspace/` and key files (`AGENTS.md`, `TODO.md`, `PLANS.md`).

Build a file tree structure with:
- Directory names, child counts
- File names, sizes, last modified timestamps

For file content requests, read and return raw markdown.

**Route:** `GET /api/documents/tree` → file tree JSON
**Route:** `GET /api/documents/content?path=X` → raw file content (markdown)

### Step 6: Settings reader

Read from:
- `~/.config/aidevops/mcp-env.sh` — configured API keys (names only, values masked)
- `aidevops version` — framework version
- MCP config files — loading strategy per server

**Route:** `GET /api/settings` → settings object (no secret values exposed)

### Step 7: File watcher

Set up filesystem watchers using Bun's built-in file watching or `fs.watch`:
- Watch `TODO.md` in all registered projects
- Watch `~/.aidevops/.agent-workspace/` recursively
- On change → invalidate relevant cache entries → broadcast via WebSocket

### Checkpoint A — Verify

After Session A, you should be able to:
```bash
# Start the backend
bun run server:dev

# Test endpoints
curl localhost:3000/api/tasks        # Real tasks from your TODO.md
curl localhost:3000/api/agents       # Real agents from ~/.aidevops/agents/
curl localhost:3000/api/status       # Real aidevops status
curl localhost:3000/api/documents/tree   # Real workspace file tree
curl localhost:3000/api/settings     # Real config (masked secrets)
```

Each should return real data from your filesystem. If any endpoint returns an error, debug before moving on.

---

## Session B — External Collectors

**Goal:** All external data sources connected and returning real data. System metrics, Ollama, Git platform data, token usage, and uptime monitors all live.

**Estimated time:** 2-3 hours (external APIs are where surprises happen)

### Step 1: Local system metrics

macOS system metrics via shell commands:

```typescript
// CPU
const cpu = await $`top -l 1 -n 0 | grep "CPU usage"`.text();

// Memory  
const mem = await $`vm_stat`.text();
// Parse: Pages free, active, inactive, wired → calculate used/total/pressure

// Disk
const disk = await $`df -h /`.text();

// GPU (Metal)
const gpu = await $`sudo powermetrics --samplers gpu_power -i 1000 -n 1`.text();
// Fallback if sudo not available: skip GPU or use IOKit

// Uptime
const uptime = await $`uptime`.text();
```

**Route:** `GET /api/health/local` → local machine metrics
**Polling:** Every 15 seconds, cached

### Step 2: VPS system metrics

SSH into VPS and collect:

```typescript
// Single SSH command that returns all metrics as JSON
const metrics = await $`ssh ${config.vpsUser}@${config.vpsHost} -p ${config.vpsPort} 'echo "{
  \"cpu\": $(top -bn1 | grep Cpu | awk \"{print \\$2}\"),
  \"ram\": $(free -m | awk \"/Mem:/ {print \\$3, \\$2}\"),
  \"disk\": $(df -h / | awk \"NR==2 {print \\$5}\"),
  \"uptime\": \"$(uptime -p)\",
  \"services\": \"$(systemctl is-active nginx node fail2ban certbot)\"
}"'`.text();
```

Handle SSH connection failures gracefully — return last cached value with `stale: true` flag.

**Route:** `GET /api/health/vps` → VPS metrics
**Polling:** Every 30 seconds, cached. Timeout: 5 seconds.

### Step 3: Ollama collector

Hit the local Ollama API:

```typescript
// Loaded models
const tags = await fetch(`${config.ollamaHost}/api/tags`).then(r => r.json());

// Running models (with VRAM allocation)
const ps = await fetch(`${config.ollamaHost}/api/ps`).then(r => r.json());
```

Also track inference metrics if Ollama exposes them, or derive from request logging.

**Route:** `GET /api/ollama` → models, inference stats, memory
**Polling:** Every 10 seconds

### Step 4: Git platform collector

Use GitHub API (primary) with PAT from gopass:

```typescript
// For each registered repo from `aidevops repos`
const repos = await $`aidevops repos`.text(); // Parse repo list

// Per repo:
// GET /repos/{owner}/{repo} — repo metadata
// GET /repos/{owner}/{repo}/commits?per_page=10 — recent commits
// GET /repos/{owner}/{repo}/pulls?state=open — open PRs
// GET /repos/{owner}/{repo}/issues?state=open — open issues
// GET /repos/{owner}/{repo}/actions/runs?per_page=5 — CI status
```

Respect rate limits (5000/hour for authenticated). Cache aggressively.

For code quality scores, check if CodeFactor/SonarCloud APIs are configured and fetch per-repo grades.

**Route:** `GET /api/projects` → all projects with live git data
**Route:** `GET /api/projects/:name` → single project detail
**Polling:** Every 5 minutes

### Step 5: Token usage collector

Prior art: [CodexBar](https://github.com/steipete/CodexBar) and [tokscale](https://github.com/junhoyeo/tokscale) have already reverse-engineered the local JSONL log formats for Claude Code and OpenCode. We reference their approach rather than building from scratch.

**Primary source — Local JSONL log scanning:**

Claude Code and OpenCode write session logs as JSONL files:
```
~/.claude/projects/{projectPath}/*.jsonl      # Claude Code
~/.config/opencode/sessions/**/*.jsonl        # OpenCode (verify path on your machine)
```

Each JSONL line with `type: "assistant"` contains token usage:
```json
{
  "type": "assistant",
  "message": {
    "id": "msg_xxx",
    "model": "claude-sonnet-4-20250514",
    "usage": {
      "input_tokens": 1234,
      "output_tokens": 567,
      "cache_read_input_tokens": 890,
      "cache_creation_input_tokens": 200
    }
  },
  "timestamp": "2026-02-24T10:00:00Z"
}
```

**Parser logic** (adapted from CodexBar/tokscale approach):
```typescript
// collectors/token-collector.ts

import { glob } from "bun";

const CLAUDE_LOG_DIR = `${process.env.HOME}/.claude/projects`;
// Also check ~/.config/opencode/ for OpenCode sessions

interface TokenEntry {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  timestamp: string;
  messageId: string;
  requestId?: string;
  projectPath: string;
}

async function scanTokenLogs(since: Date): Promise<TokenEntry[]> {
  const entries: TokenEntry[] = [];
  const seen = new Set<string>(); // Dedup key: messageId + requestId
  
  // Scan all JSONL files modified since `since`
  for await (const path of glob(`${CLAUDE_LOG_DIR}/**/*.jsonl`)) {
    const stat = await Bun.file(path).stat();
    if (stat.mtime < since) continue;
    
    const text = await Bun.file(path).text();
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line);
        if (entry.type !== "assistant" || !entry.message?.usage) continue;
        
        // Dedup streaming chunks — usage is cumulative per chunk
        // Keep only the LAST chunk for each message (highest token counts)
        const dedupKey = `${entry.message.id}:${entry.requestId ?? ""}`;
        if (seen.has(dedupKey)) continue; // Already processed a later chunk
        seen.add(dedupKey);
        
        entries.push({
          model: entry.message.model,
          inputTokens: entry.message.usage.input_tokens ?? 0,
          outputTokens: entry.message.usage.output_tokens ?? 0,
          cacheReadTokens: entry.message.usage.cache_read_input_tokens ?? 0,
          cacheCreateTokens: entry.message.usage.cache_creation_input_tokens ?? 0,
          timestamp: entry.timestamp,
          messageId: entry.message.id,
          requestId: entry.requestId,
          projectPath: path, // Extract project name from path
        });
      } catch { /* skip malformed lines */ }
    }
  }
  return entries;
}
```

**IMPORTANT dedup note from CodexBar:** Usage numbers in streaming chunks are *cumulative*, not incremental. If a message has 3 chunks, the last chunk contains the total. Dedup by `message.id + requestId` and keep only one entry per message.

**Cost calculation** using model pricing (reference tokscale's LiteLLM pricing lookup or hardcode current rates):
```typescript
const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheCreate: number }> = {
  // Per million tokens
  "claude-opus-4-6":              { input: 15.00, output: 75.00, cacheRead: 1.50, cacheCreate: 18.75 },
  "claude-sonnet-4-5-20250929":   { input: 3.00,  output: 15.00, cacheRead: 0.30, cacheCreate: 3.75 },
  "claude-haiku-4-5-20251001":    { input: 0.80,  output: 4.00,  cacheRead: 0.08, cacheCreate: 1.00 },
  // Add more models as needed — or fetch dynamically from LiteLLM
};

function calculateCost(entry: TokenEntry): number {
  const rates = PRICING[entry.model];
  if (!rates) return 0; // Unknown model — track tokens but skip cost
  return (
    (entry.inputTokens * rates.input / 1_000_000) +
    (entry.outputTokens * rates.output / 1_000_000) +
    (entry.cacheReadTokens * rates.cacheRead / 1_000_000) +
    (entry.cacheCreateTokens * rates.cacheCreate / 1_000_000)
  );
}
```

**Optional bonus — CodexBar CLI as data source:**
If CodexBar is installed (`codexbar` binary available), we can also shell out for web-based usage data (session limits, weekly quotas) that the local JSONL logs don't contain:
```typescript
// Session + weekly quota from claude.ai (requires CodexBar with cookies configured)
const quotaJson = await $`codexbar --provider claude --format json`.text().catch(() => null);
if (quotaJson) {
  const quota = JSON.parse(quotaJson);
  // quota contains: sessionUsage, weeklyUsage, resetTime, etc.
}
```

This is purely optional and additive — the JSONL scanner gives us accurate cost/token data regardless.

**Ollama local tracking:**
Ollama doesn't write JSONL logs by default, but we can track via request counting in our collector's poll cycle, or instrument via Ollama's API response headers if they include token counts.

**Route:** `GET /api/tokens` → aggregated token usage, cost by model, daily/weekly/monthly totals
**Route:** `GET /api/tokens/models` → per-model performance (success rate, latency, retries)
**Route:** `GET /api/tokens/projects` → token spend attributed per project (derived from JSONL file paths)
**Polling:** Scan JSONL files every 5 minutes (or on filesystem watch trigger). Cache aggregated results.

### Step 6: Uptime collector

If updown.io is configured:

```typescript
const checks = await fetch("https://updown.io/api/checks", {
  headers: { "X-API-Key": config.updownApiKey }
}).then(r => r.json());
```

Each check returns: url, status, uptime, response times, last check time.

**Route:** `GET /api/uptime` → all monitored URLs with status
**Polling:** Every 2 minutes

### Step 7: Needs aggregator

This isn't a collector — it's an aggregator that pulls from other endpoints:

```typescript
function aggregateNeeds() {
  const needs = [];
  
  // From tasks: items in "pending-approval" status
  const tasks = cache.get("tasks");
  needs.push(...tasks.pendingApproval.map(t => ({
    type: "approval", source: "TODO.md", ...t
  })));
  
  // From projects: PRs awaiting review
  const projects = cache.get("projects");
  for (const p of projects) {
    needs.push(...p.prs.filter(pr => pr.reviewRequested).map(pr => ({
      type: "review", source: "GitHub", ...pr
    })));
  }
  
  // From projects: failing CI
  needs.push(...projects.filter(p => p.ci === "failing").map(p => ({
    type: "failure", source: "GitHub Actions", ...p
  })));
  
  // From projects: critical/high vulns
  needs.push(...projects.filter(p => p.vulns.critical > 0 || p.vulns.high > 0).map(p => ({
    type: "security", source: "Snyk", ...p
  })));
  
  // From settings: expiring certs/keys
  // From tasks: overdue items
  
  return needs.sort(byPriority);
}
```

**Route:** `GET /api/needs` → priority-sorted action queue
**Refresh:** Recomputed whenever any source data changes

### Checkpoint B — Verify

After Session B, every API endpoint should return real data:
```bash
curl localhost:3000/api/health/local   # Real CPU/RAM/disk from Mac Mini
curl localhost:3000/api/health/vps     # Real VPS metrics via SSH
curl localhost:3000/api/ollama         # Real loaded models + stats
curl localhost:3000/api/projects       # Real repos with commits, PRs, CI status
curl localhost:3000/api/tokens         # Real or estimated token usage
curl localhost:3000/api/uptime         # Real updown.io monitors
curl localhost:3000/api/needs          # Aggregated from all sources above
```

Test failure modes too: what happens if Ollama is stopped? If VPS SSH times out? If GitHub rate limits? Each should return a graceful error, not crash the server.

---

## Session C — WebSocket + Frontend Integration

**Goal:** Wire the frontend to the real backend. Replace all mock data imports with API calls. Add WebSocket for real-time updates. Dashboard shows 100% live data.

**Estimated time:** 2-3 hours

### Step 1: WebSocket server

In `server/ws/realtime.ts`:

```typescript
// Broadcast to all connected clients when data changes
type WSMessage = {
  type: "update",
  channel: "tasks" | "health" | "ollama" | "projects" | "tokens" | "needs",
  data: any,
  timestamp: string
};

// File watcher triggers → reparse → broadcast
// Polling collector refresh → broadcast if data changed
// Use JSON diff to avoid broadcasting unchanged data
```

### Step 2: Frontend data hooks

Create hooks that replace mock data:

```typescript
// hooks/useApiData.ts
function useApiData<T>(endpoint: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initial fetch
  useEffect(() => {
    fetch(`/api/${endpoint}`)
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [endpoint]);
  
  // WebSocket updates
  useWebSocket((msg) => {
    if (msg.channel === endpoint) {
      setData(msg.data);
    }
  });
  
  return { data, loading, error };
}

// hooks/useWebSocket.ts
function useWebSocket(onMessage: (msg: WSMessage) => void) {
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/ws`);
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    return () => ws.close();
  }, []);
}
```

### Step 3: Swap each page

Go page by page, replacing mock imports with API hooks:

**OverviewPage.tsx:**
```typescript
// Before:
import { systemMock, tokensMock, needsMock } from "@/lib/mock-data";

// After:
const { data: health } = useApiData("health/local", null);
const { data: tokens } = useApiData("tokens", null);
const { data: needs } = useApiData("needs", []);
```

Do this for every page:
- OverviewPage → `/api/health/local`, `/api/tokens`, `/api/needs`, `/api/projects`
- ProjectsPage → `/api/projects`
- KanbanPage → `/api/tasks`
- HealthPage → `/api/health/local`, `/api/health/vps`, `/api/ollama`, `/api/uptime`
- NeedsPage → `/api/needs`
- TokensPage → `/api/tokens`, `/api/tokens/models`
- AgentsPage → `/api/agents`, `/api/agents/mcps`
- DocumentsPage → `/api/documents/tree`, `/api/documents/content?path=X`
- SettingsPage → `/api/settings`, `/api/status`

### Step 4: Loading and error states

Each page needs 3 states:
- **Loading:** Skeleton shimmer placeholders matching the component layout
- **Error:** Inline error message with retry button, not a full-page crash
- **Stale data:** If WebSocket disconnects, show last known data with a "stale data" indicator in the TopBar

### Step 5: TopBar live wiring

The TopBar is the most critical integration — it shows real-time data on every page:
- System health dots: poll `/api/health/local` and `/api/health/vps` status fields
- Token budget bar: from `/api/tokens` budget data
- Needs badge count: from `/api/needs` array length, filtered by priority
- Active sessions: from `/api/ollama` queue or agent status

### Step 6: Keep mock data as fallback

Don't delete `mock-data.ts`. Instead, add a config toggle:

```typescript
// lib/config.ts
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

// hooks/useApiData.ts
import { USE_MOCK } from "@/lib/config";
import * as mock from "@/lib/mock-data";

function useApiData<T>(endpoint: string, mockKey: keyof typeof mock) {
  if (USE_MOCK) return { data: mock[mockKey], loading: false, error: null };
  // ... real API logic
}
```

This lets you toggle back to mock data for development or demos.

### Checkpoint C — Verify

After Session C, the full dashboard should run against real data:

1. `bun run dev` starts both server and client
2. Open `localhost:5173` (or wherever Vite serves)
3. **Overview page** shows real system metrics, real token spend, real needs count
4. **Projects page** shows your actual GitHub repos with real commit history and CI status
5. **Kanban page** shows tasks from your actual TODO.md
6. **Health page** shows real CPU/RAM/disk for both Mac Mini and VPS, real Ollama models
7. **Needs page** shows real pending PRs, real CI failures, real security findings
8. **Tokens page** shows real or estimated API spend
9. **Agents page** shows real agents from `~/.aidevops/agents/`
10. **Documents page** lets you browse real workspace files and render real markdown
11. **Settings page** shows real framework version and API key status

WebSocket test: edit your TODO.md in another terminal → kanban board updates within 5 seconds without page refresh.

---

## Known Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| TODO.md format varies from expected | Medium | Parser should be lenient — extract what it can, skip what it can't, log warnings |
| VPS SSH connection flaky | Low | 5-second timeout, cache last good value, show stale indicator |
| JSONL log path differs on your machine | Low | Check both `~/.claude/projects/` and `~/.config/opencode/` — verify actual paths in Session B |
| GitHub rate limit hit during development | Low | Cache aggressively (5-min TTL), use conditional requests (If-None-Match) |
| Ollama API changes between versions | Low | Pin to documented endpoints (`/api/tags`, `/api/ps`), handle gracefully |
| gopass not available for secret loading | Medium | Fall back to env vars, document both methods in config |
| SKILL.md format inconsistent across agents | Medium | Lenient parser with sensible defaults for missing fields |
| Model pricing changes | Low | Hardcode current rates with override config; optionally fetch from LiteLLM dynamically |

## Definition of Done

Phase 2 is complete when:
- [ ] `bun run dev` starts server + client cleanly
- [ ] All `/api/*` endpoints return real data (or graceful errors)
- [ ] All 9 frontend pages show real data from API
- [ ] WebSocket updates flow for tasks and health metrics
- [ ] Editing TODO.md triggers live kanban update
- [ ] Mock data toggle works via env var
- [ ] Server handles source failures gracefully (no crashes)
- [ ] Server runs stable for 4+ hours without memory growth
- [ ] All API responses follow the standard `{ data, meta }` format
