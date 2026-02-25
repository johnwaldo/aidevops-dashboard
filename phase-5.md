# Phase 5 — Write Operations

## Objective

Transform the dashboard from observer to operator. Enable targeted write-back actions — create and move tasks, edit configuration, approve PRs, re-trigger CI, and dispatch agents — all from the dashboard. Every action requires explicit confirmation, logs to an audit trail, and rolls back on failure.

## Prerequisites

- Phase 4 complete (Tailscale access, auth, rate limiting, stability hardening all working)
- Dashboard running stable for 48+ hours with Phase 4 auth active
- At least one GitHub repo with an open PR (for testing PR actions)

## Design Principle: Explicit Confirmation

**Non-negotiable:** Every write action requires an explicit confirmation dialog. No action fires from a single click. No automatic mutations. The pattern is always:

```
User clicks action → Confirmation dialog (shows what will happen) → API call → Optimistic UI update → Rollback on failure
```

---

## Architecture Additions

```
server/
├── routes/
│   └── actions/
│       ├── tasks.ts             # Task creation, movement, updates
│       ├── github.ts            # PR approve/merge, CI re-trigger
│       ├── agents.ts            # Agent dispatch via CLI
│       ├── settings.ts          # Config modifications
│       └── needs.ts             # Dismiss, snooze, resolve needs
├── writers/
│   ├── todo-writer.ts           # Atomic TODO.md read-modify-write
│   ├── config-writer.ts         # Dashboard config modifications
│   └── audit-log.ts             # Append-only action audit trail
├── middleware/
│   └── write-auth.ts            # Stricter auth for write endpoints
client/
├── src/
│   ├── components/
│   │   └── actions/
│   │       ├── ConfirmDialog.tsx     # Reusable confirmation modal
│   │       ├── ActionButton.tsx      # Button with loading/success/error states
│   │       ├── QuickActions.tsx      # Context menus on cards/items
│   │       ├── TaskCreateDialog.tsx  # New task creation form
│   │       └── AuditLog.tsx          # View recent actions (Settings page)
│   └── hooks/
│       └── useAction.ts             # Mutation hook: confirm → optimistic → rollback
```

---

## Session A — Task Operations (TODO.md Write-Back)

**Goal:** Create tasks, move kanban cards, and update task metadata — all persisted to TODO.md with atomic writes and automatic backups.

**Estimated time:** 2-3 hours

### Step 1: TODO.md writer — atomic file operations

This is the most critical writer because TODO.md is a text file, not a database. One bad write corrupts the whole task board.

```typescript
// writers/todo-writer.ts

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const BACKUP_DIR = join(process.env.HOME!, ".aidevops/dashboard/backups");

export class TodoWriter {
  private todoPath: string;
  private lockActive = false;

  constructor(todoPath: string) {
    this.todoPath = todoPath;
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // ── Core write pattern: backup → modify → atomic write → verify ──

  private async withBackup<T>(operation: (content: string) => string): Promise<T> {
    if (this.lockActive) throw new Error("Concurrent write rejected — TODO.md is locked");
    this.lockActive = true;

    const backupPath = join(BACKUP_DIR, `TODO.md.${Date.now()}`);

    try {
      // 1. Backup current state
      copyFileSync(this.todoPath, backupPath);

      // 2. Read current content
      const content = readFileSync(this.todoPath, "utf-8");

      // 3. Apply modification
      const newContent = operation(content);

      // 4. Validate result (basic sanity checks)
      this.validate(newContent);

      // 5. Atomic write: temp file → rename
      const tmpPath = `${this.todoPath}.tmp.${Date.now()}`;
      writeFileSync(tmpPath, newContent, "utf-8");
      Bun.renameSync(tmpPath, this.todoPath);

      // 6. Clean old backups (keep last 20)
      this.cleanBackups(20);

      return undefined as T;
    } catch (err) {
      // Restore from backup on ANY failure
      if (existsSync(backupPath)) {
        copyFileSync(backupPath, this.todoPath);
      }
      throw err;
    } finally {
      this.lockActive = false;
    }
  }

  private validate(content: string): void {
    // Must still have markdown structure
    if (!content.includes("#")) throw new Error("Validation failed: no markdown headers found");
    // Must not be empty
    if (content.trim().length < 10) throw new Error("Validation failed: content too short");
    // Must not have duplicate task IDs (if using IDs)
    // Must preserve sections that weren't modified
  }

  private cleanBackups(keep: number): void {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith("TODO.md."))
      .sort()
      .reverse();
    for (const file of files.slice(keep)) {
      unlinkSync(join(BACKUP_DIR, file));
    }
  }

  // ── Public operations ──

  async moveTask(taskId: string, fromColumn: string, toColumn: string): Promise<void> {
    await this.withBackup((content) => {
      const sections = this.parseSections(content);

      // Find task in source column
      const sourceSection = sections.get(fromColumn);
      if (!sourceSection) throw new Error(`Column "${fromColumn}" not found`);

      const taskIndex = sourceSection.findIndex(line => this.extractTaskId(line) === taskId);
      if (taskIndex === -1) throw new Error(`Task "${taskId}" not found in "${fromColumn}"`);

      // Remove from source
      const [taskLine] = sourceSection.splice(taskIndex, 1);

      // Modify task metadata for target column
      const updatedLine = this.updateTaskForColumn(taskLine, toColumn);

      // Add to target column
      const targetSection = sections.get(toColumn);
      if (!targetSection) throw new Error(`Column "${toColumn}" not found`);
      targetSection.push(updatedLine);

      return this.serializeSections(sections, content);
    });
  }

  async createTask(task: {
    title: string;
    column: string;
    project?: string;
    priority?: string;
    agent?: string;
    estimate?: string;
    beadsDeps?: string[];
  }): Promise<void> {
    await this.withBackup((content) => {
      const sections = this.parseSections(content);

      const targetSection = sections.get(task.column);
      if (!targetSection) throw new Error(`Column "${task.column}" not found`);

      // Build task line in TODO.md format
      let line = `- [ ] ${task.title}`;
      if (task.estimate) line += ` ~${task.estimate}`;
      if (task.priority) line += ` [${task.priority}]`;
      if (task.project) line += ` @${task.project}`;
      if (task.agent) line += ` →${task.agent}`;
      if (task.beadsDeps?.length) line += ` (needs: ${task.beadsDeps.join(", ")})`;

      targetSection.push(line);

      return this.serializeSections(sections, content);
    });
  }

  async updateTaskField(taskId: string, field: string, value: string): Promise<void> {
    await this.withBackup((content) => {
      // Find the task line anywhere in the document
      const lines = content.split("\n");
      const taskLineIndex = lines.findIndex(l => this.extractTaskId(l) === taskId);
      if (taskLineIndex === -1) throw new Error(`Task "${taskId}" not found`);

      switch (field) {
        case "estimate":
          lines[taskLineIndex] = this.replaceOrAppend(lines[taskLineIndex], /~\S+/, `~${value}`);
          break;
        case "priority":
          lines[taskLineIndex] = this.replaceOrAppend(lines[taskLineIndex], /\[\w+\]/, `[${value}]`);
          break;
        case "agent":
          lines[taskLineIndex] = this.replaceOrAppend(lines[taskLineIndex], /→\S+/, `→${value}`);
          break;
        case "title":
          lines[taskLineIndex] = lines[taskLineIndex].replace(
            /^(- \[[ x]\] )(.+?)(\s+[~\[@→(])/, `$1${value}$3`
          );
          break;
        default:
          throw new Error(`Unknown field: ${field}`);
      }

      return lines.join("\n");
    });
  }

  private updateTaskForColumn(taskLine: string, column: string): string {
    const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    switch (column) {
      case "backlog":
        return taskLine.replace(/\[x\]/, "[ ]");
      case "inProgress":
        return taskLine.replace(/\[x\]/, "[ ]") + (taskLine.includes("started:") ? "" : ` (started: ${now})`);
      case "pendingApproval":
        return taskLine + ` (awaiting: ${now})`;
      case "recentlyCompleted":
        return taskLine.replace(/\[ \]/, "[x]") + ` (done: ${now})`;
      default:
        return taskLine;
    }
  }

  // ── Parsing helpers ──
  // parseSections: split TODO.md into named sections by headers
  // extractTaskId: derive ID from task content (hash or line number based)
  // serializeSections: rebuild markdown preserving non-section content
  // replaceOrAppend: replace pattern if exists, append if not
}
```

### Step 2: Task API routes

```typescript
// routes/actions/tasks.ts

// POST /api/actions/tasks/move
// Body: { taskId: string, from: string, to: string }
// Response: { success: true } or { error: { code, message } }

// POST /api/actions/tasks/create
// Body: { title: string, column: string, project?: string, priority?: string,
//         agent?: string, estimate?: string, beadsDeps?: string[] }

// PUT /api/actions/tasks/:taskId
// Body: { field: string, value: string }

// All routes:
//   - Require auth (write-auth middleware)
//   - Log to audit trail
//   - Broadcast change via WebSocket (triggers frontend refresh)
```

### Step 3: Frontend — Kanban drag-and-drop wired to backend

```typescript
// In KanbanBoard.tsx — wire drag events to write API

async function onDragEnd(result: DropResult) {
  const { draggableId, source, destination } = result;
  if (!destination || source.droppableId === destination.droppableId) return;

  // Optimistic: move card in local state immediately
  const rollback = moveTaskLocally(draggableId, source.droppableId, destination.droppableId);

  try {
    await fetch("/api/actions/tasks/move", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        taskId: draggableId,
        from: source.droppableId,
        to: destination.droppableId,
      }),
    });
    // Success — WebSocket will broadcast the update to other connected clients
  } catch (err) {
    // Rollback local state
    rollback();
    showToast("error", "Failed to move task — reverted");
  }
}
```

**Note:** Kanban drag doesn't use the confirmation dialog — moving cards is low-risk and reversible. The optimistic update + rollback pattern provides the right UX here.

### Step 4: Frontend — Task creation dialog

```typescript
// components/actions/TaskCreateDialog.tsx

// Triggered from:
//   - "+" button on each Kanban column header
//   - "New Task" button on Overview page
//   - Command palette: "create task"

// Form fields:
//   - Title (required, text input)
//   - Column (required, dropdown: Backlog, In Progress, Pending Approval)
//   - Project (optional, dropdown from registered projects)
//   - Priority (optional, select: low, medium, high, critical)
//   - Agent (optional, dropdown from known agents)
//   - Estimate (optional, text: "2h", "1d", "30m")
//   - Dependencies (optional, multi-select from existing tasks)

// Submit → confirmation not needed for creation (additive, not destructive)
// → POST /api/actions/tasks/create
// → Task appears in target column
// → Toast: "Task created ✓"
```

### Checkpoint A — Verify

```bash
# Create a task from the dashboard
# → Check TODO.md on disk: new line added in correct section

# Drag a task from "Backlog" to "In Progress" on kanban
# → Check TODO.md: task moved, "(started: 2026-XX-XX)" appended

# Drag a task to "Recently Completed"
# → Check TODO.md: checkbox changed to [x], "(done: 2026-XX-XX)" appended

# Edit a task estimate
# → Check TODO.md: ~estimate pattern updated

# Verify backup exists
ls ~/.aidevops/dashboard/backups/
# Should show timestamped backups

# Force a failure (e.g., make TODO.md read-only temporarily)
chmod 444 TODO.md
# Drag a task → should fail, rollback, show error toast
chmod 644 TODO.md
```

---

## Session B — GitHub Actions + Agent Dispatch + Settings

**Goal:** Approve/merge PRs, re-trigger CI, dispatch agents, and edit dashboard settings — all from the dashboard.

**Estimated time:** 2-3 hours

### Step 1: GitHub write actions

```typescript
// routes/actions/github.ts

// POST /api/actions/github/pr/approve
// Body: { owner: string, repo: string, prNumber: number }
async function approvePR(owner: string, repo: string, prNumber: number): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.githubToken}`,
        "Accept": "application/vnd.github+json",
      },
      body: JSON.stringify({ event: "APPROVE" }),
    }
  );
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
}

// POST /api/actions/github/pr/merge
// Body: { owner: string, repo: string, prNumber: number, method?: "squash" | "merge" | "rebase" }
async function mergePR(owner: string, repo: string, prNumber: number, method = "squash"): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${config.githubToken}`,
        "Accept": "application/vnd.github+json",
      },
      body: JSON.stringify({ merge_method: method }),
    }
  );
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
}

// POST /api/actions/github/workflow/rerun
// Body: { owner: string, repo: string, runId: number }
async function rerunWorkflow(owner: string, repo: string, runId: number): Promise<void> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/rerun`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.githubToken}`,
        "Accept": "application/vnd.github+json",
      },
    }
  );
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
}

// POST /api/actions/github/issue/close
// Body: { owner: string, repo: string, issueNumber: number }
```

**Frontend — PR action cards:**

```typescript
// These appear on:
//   - Needs From Me page (PR review requests)
//   - Project detail page (open PRs section)

// Each PR card gets action buttons:

<ConfirmDialog
  title={`Approve PR #${pr.number}`}
  description={`Submit an approval review on "${pr.title}" in ${pr.repo}. The author will be notified.`}
  onConfirm={() => approveAction.execute()}
>
  <ActionButton icon={<Check />} label="Approve" />
</ConfirmDialog>

<ConfirmDialog
  title={`Merge PR #${pr.number}`}
  description={`Squash-merge "${pr.title}" into ${pr.base}. This cannot be undone.`}
  destructive={true}
  onConfirm={() => mergeAction.execute()}
>
  <ActionButton icon={<GitMerge />} label="Merge" variant="destructive" />
</ConfirmDialog>

// Failed CI gets:
<ConfirmDialog
  title="Re-run workflow"
  description={`Re-trigger "${workflow.name}" on ${repo}. This will create a new workflow run.`}
  onConfirm={() => rerunAction.execute()}
>
  <ActionButton icon={<RefreshCw />} label="Re-run" />
</ConfirmDialog>
```

### Step 2: Agent dispatch

Trigger agents via CLI invocation. The dashboard sends the command; the agent framework handles execution.

```typescript
// routes/actions/agents.ts

// POST /api/actions/agents/dispatch
// Body: { agent: string, command: string, project?: string, workDir?: string }

async function dispatchAgent(
  agent: string,
  command: string,
  options?: { project?: string; workDir?: string }
): Promise<{ dispatched: true; pid?: number }> {
  const cwd = options?.workDir ?? options?.project ?? process.env.HOME;

  // Spawn as background process — don't wait for completion
  const proc = Bun.spawn(["aidevops", "agent", agent, command], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    // Detach so dashboard restart doesn't kill the agent
  });

  return { dispatched: true, pid: proc.pid };
}

// Alternative: if agents listen on Matrix rooms, send a command message instead
// This will be available in Phase 6 when Matrix integration lands
```

**Frontend — Agent dispatch from Agents page:**

```typescript
// components/agents/AgentDispatch.tsx

// Each agent card gets a "Dispatch" button
// Click opens dialog:
//   - Agent name (pre-filled, read-only)
//   - Command (text input — what to tell the agent)
//   - Project context (dropdown from registered projects)
// Confirmation required

<ConfirmDialog
  title={`Dispatch ${agent.name}`}
  description={`This will run: aidevops agent ${agent.name} "${command}" in ${project}. The agent will execute in the background.`}
  onConfirm={() => dispatchAction.execute()}
>
  <ActionButton icon={<Play />} label="Dispatch" />
</ConfirmDialog>
```

### Step 3: Settings modification

Scoped to safe, non-destructive dashboard settings. Not aidevops framework config.

```typescript
// routes/actions/settings.ts

// PUT /api/actions/settings/budget
// Body: { monthlyCap: number }
// Updates dashboard token budget cap

// PUT /api/actions/settings/alerts
// Body: { ruleId: string, enabled: boolean, threshold?: number }
// Toggle alert rules or adjust thresholds
// Example: { ruleId: "budget-90-percent", enabled: true, threshold: 0.9 }

// PUT /api/actions/settings/collectors
// Body: { collectorName: string, enabled: boolean }
// Enable/disable individual data collectors

// PUT /api/actions/settings/refresh-intervals
// Body: { source: string, intervalSeconds: number }
// Adjust how often a data source is polled
```

**What's NOT writable from the dashboard (must use CLI/direct file edit):**
- API keys and secrets (security risk)
- aidevops framework configuration
- MCP server configurations
- Tailscale settings
- System-level changes

**Frontend — Settings page gets edit affordances:**

```typescript
// Settings page currently shows read-only config values
// Phase 5 upgrades:

// Budget section: click monthly cap → inline edit → save
// Alert rules: toggle switches for enable/disable, click threshold → edit
// Collectors: toggle switches for each collector
// Refresh intervals: dropdown or number input per source

// Each change triggers confirmation:
<ConfirmDialog
  title="Update budget cap"
  description={`Change monthly token budget cap from $${current} to $${newValue}.`}
  onConfirm={() => saveSettings()}
/>
```

### Step 4: Needs From Me quick actions

Wire the needs engine items to real write-back actions:

```typescript
// routes/actions/needs.ts

// POST /api/actions/needs/:needId/dismiss
// Permanently dismisses the need (won't resurface)

// POST /api/actions/needs/:needId/snooze
// Body: { until: string }  // ISO date or duration like "2h", "1d"
// Hides the need until the specified time

// POST /api/actions/needs/:needId/resolve
// Takes the appropriate action based on need type:
//   - type "review" → opens approve dialog for the PR
//   - type "failure" → opens re-run dialog for the workflow
//   - type "overdue" → opens task move dialog
//   - type "security" → navigates to the relevant detail page
//   - type "budget" → navigates to settings
```

**Frontend — Needs cards get action buttons:**

```typescript
// On each NeedItem card:
<div className="flex gap-2">
  {/* Primary action based on need type */}
  {need.type === "review" && (
    <ActionButton label="Review PR" onClick={() => navigate(`/projects/${need.project}`)} />
  )}
  {need.type === "failure" && (
    <ConfirmDialog title="Re-run CI" onConfirm={() => rerunAction.execute()}>
      <ActionButton label="Re-run" icon={<RefreshCw />} />
    </ConfirmDialog>
  )}

  {/* Universal actions */}
  <ActionButton label="Snooze" icon={<Clock />} onClick={() => openSnoozeDialog(need.id)} />
  <ActionButton label="Dismiss" icon={<X />} onClick={() => dismissNeed(need.id)} />
</div>
```

### Checkpoint B — Verify

```bash
# Approve a PR from dashboard → check on GitHub: approval submitted
# Merge a PR from dashboard → check on GitHub: PR merged (squash)
# Re-run a failed workflow → check GitHub Actions: new run triggered

# Dispatch an agent → check process list or agent output
ps aux | grep "aidevops agent"

# Change budget cap in Settings → verify /api/settings reflects new value
# Toggle an alert rule → verify alert engine respects the change
# Disable a collector → verify that data source stops updating

# Dismiss a need → verify it doesn't reappear on refresh
# Snooze a need for 2h → verify it disappears and returns after 2h

# All actions visible in audit log
curl localhost:3000/api/audit?limit=20
```

---

## Session C — Audit Trail + Action Infrastructure Polish

**Goal:** Complete the audit logging system, add the client-side action UX infrastructure (confirmation dialogs, toasts, loading states), and verify everything works end-to-end from mobile.

**Estimated time:** 1-2 hours

### Step 1: Audit trail

```typescript
// writers/audit-log.ts

const AUDIT_PATH = join(process.env.HOME!, ".aidevops/dashboard/audit.jsonl");

interface AuditEntry {
  ts: string;           // ISO timestamp
  action: string;       // "tasks.move" | "github.pr.approve" | "agents.dispatch" | etc.
  target: string;       // What was acted on (task ID, PR ref, agent name)
  params: any;          // Action parameters (sanitized — no secrets)
  user: string;         // Who did it (from auth: "localhost", "user@tailnet", "api-token")
  result: "success" | "failure";
  error?: string;       // Error message if failed
  durationMs: number;   // How long the action took
}

function logAudit(entry: AuditEntry): void {
  appendFileSync(AUDIT_PATH, JSON.stringify(entry) + "\n");
}

// Server middleware wraps all /api/actions/* routes:
async function auditMiddleware(req: Request, handler: () => Promise<Response>): Promise<Response> {
  const start = Date.now();
  const auth = authenticate(req);

  try {
    const response = await handler();
    logAudit({
      ts: new Date().toISOString(),
      action: extractAction(req),
      target: extractTarget(req),
      params: sanitizeBody(await req.clone().json()),
      user: auth.user ?? "unknown",
      result: response.ok ? "success" : "failure",
      error: response.ok ? undefined : await response.clone().text(),
      durationMs: Date.now() - start,
    });
    return response;
  } catch (err) {
    logAudit({
      ts: new Date().toISOString(),
      action: extractAction(req),
      target: extractTarget(req),
      params: sanitizeBody(await req.clone().json().catch(() => ({}))),
      user: auth.user ?? "unknown",
      result: "failure",
      error: String(err),
      durationMs: Date.now() - start,
    });
    throw err;
  }
}

function sanitizeBody(body: any): any {
  // Remove any field containing "token", "key", "secret", "password"
  const sanitized = { ...body };
  for (const key of Object.keys(sanitized)) {
    if (/token|key|secret|password/i.test(key)) {
      sanitized[key] = "[redacted]";
    }
  }
  return sanitized;
}
```

**API for viewing audit log:**
```typescript
// GET /api/audit?limit=50&action=github.*&since=2026-03-01
// Returns recent audit entries, filterable by action pattern and date
// Only accessible to authenticated users
```

**Frontend — Audit log viewer on Settings page:**
```typescript
// components/actions/AuditLog.tsx

// Table view: Timestamp | Action | Target | User | Result | Duration
// Filter by action type (dropdown)
// Filter by date range
// Color-coded: green for success, red for failure
// Click to expand → show full params and error details
```

### Step 2: Reusable action UI components

```typescript
// components/actions/ConfirmDialog.tsx

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;       // Default: "Confirm"
  cancelLabel?: string;        // Default: "Cancel"
  destructive?: boolean;       // Red styling for dangerous actions
  onConfirm: () => Promise<void> | void;
  children: React.ReactNode;   // Trigger element
}

// Uses shadcn/ui AlertDialog
// Destructive variant: red confirm button, extra warning text
// Loading state: button shows spinner while action executes
// Error state: shows inline error if action fails, option to retry
```

```typescript
// components/actions/ActionButton.tsx

interface ActionButtonProps {
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline";
  loading?: boolean;
  success?: boolean;
  onClick?: () => void;
}

// States:
// Default: icon + label
// Loading: spinner + "Working..."
// Success: checkmark + "Done" (auto-clears after 2s)
// Error: red icon + "Failed" (shows error on hover)
```

```typescript
// hooks/useAction.ts

function useAction<T>(options: {
  endpoint: string;
  method?: "POST" | "PUT" | "DELETE";
  body: any;
  optimisticUpdate?: () => (() => void);  // Returns rollback function
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    setState("loading");
    const rollback = options.optimisticUpdate?.();

    try {
      const response = await fetch(options.endpoint, {
        method: options.method ?? "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(options.body),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message ?? `HTTP ${response.status}`);
      }

      const data = await response.json();
      setState("success");
      options.onSuccess?.(data);

      // Reset to idle after 2s
      setTimeout(() => setState("idle"), 2000);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
      rollback?.();
      options.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  return { execute, state, error, loading: state === "loading", success: state === "success" };
}
```

### Step 3: Write-action rate limiting

Stricter rate limiting for write endpoints (on top of Phase 4's general rate limiting):

```typescript
// middleware/write-auth.ts

// Write endpoints get:
// - Authentication required (no anonymous)
// - 30 write actions per minute per user (vs 100 for reads)
// - Confirmation flag required in request body: { confirmed: true }
//   (prevents accidental API calls without going through the UI dialog)

function writeAuthMiddleware(req: Request): Response | null {
  const auth = authenticate(req);

  if (!auth.authenticated) {
    return jsonResponse(401, { error: { code: "UNAUTHORIZED" } });
  }

  if (auth.user === "anonymous") {
    return jsonResponse(403, { error: { code: "WRITE_REQUIRES_IDENTITY" } });
  }

  if (!rateLimiter.check(`write:${auth.user}`, 30, 60)) {
    return jsonResponse(429, { error: { code: "RATE_LIMITED", retryAfter: 60 } });
  }

  return null; // Pass through
}
```

### Step 4: Toast notification system

```typescript
// components/ui/Toaster.tsx

// Global toast container (bottom-right on desktop, bottom-center on mobile)
// Types: success (green), error (red), info (blue), warning (amber)
// Auto-dismiss after 4s (success/info) or stay until dismissed (error/warning)
// Stack up to 3 visible toasts, older ones collapse

// Usage throughout dashboard:
showToast("success", "Task moved to In Progress");
showToast("error", "Failed to merge PR — merge conflicts detected");
showToast("info", "Agent dispatched — running in background");
```

### Checkpoint C — Verify (Full End-to-End)

**From desktop:**
1. Create a task → appears in kanban → TODO.md updated
2. Drag task between columns → optimistic move, TODO.md updated
3. Approve PR → confirmation dialog → success toast → GitHub reflects approval
4. Merge PR → destructive confirmation → success toast → GitHub reflects merge
5. Dispatch agent → confirmation → background process started
6. Change budget cap → confirmation → settings updated
7. Dismiss a need → disappears from needs list
8. Snooze a need → disappears, returns after snooze period
9. Check audit log in Settings → all actions listed with timestamps

**From phone (via Tailscale):**
10. Same actions work from mobile with touch-friendly dialogs
11. Confirmation dialogs render correctly on small screens
12. Toast notifications visible and dismissible
13. Action buttons have adequate tap targets

**Error cases:**
14. Force a GitHub API failure (invalid token) → rollback, error toast, audit log shows failure
15. Force a TODO.md write failure (permissions) → rollback, error toast, backup preserved
16. Rapid-fire 40 write requests → first 30 succeed, last 10 get 429

---

## Audit Log Format

```jsonl
{"ts":"2026-03-01T14:30:00Z","action":"tasks.move","target":"implement-label-export","params":{"from":"backlog","to":"inProgress"},"user":"localhost","result":"success","durationMs":12}
{"ts":"2026-03-01T14:31:00Z","action":"tasks.create","target":"new-task","params":{"title":"Fix header alignment","column":"backlog","project":"acme-app"},"user":"localhost","result":"success","durationMs":8}
{"ts":"2026-03-01T14:35:00Z","action":"github.pr.approve","target":"acme-app#47","params":{"owner":"youruser","repo":"acme-app","prNumber":47},"user":"user@tailnet","result":"success","durationMs":340}
{"ts":"2026-03-01T14:36:00Z","action":"github.pr.merge","target":"acme-app#47","params":{"owner":"youruser","repo":"acme-app","prNumber":47,"method":"squash"},"user":"user@tailnet","result":"success","durationMs":890}
{"ts":"2026-03-01T14:40:00Z","action":"agents.dispatch","target":"@seo","params":{"command":"analyze acme-web","project":"acme-web"},"user":"localhost","result":"success","durationMs":45}
{"ts":"2026-03-01T14:45:00Z","action":"settings.budget","target":"monthlyCap","params":{"old":400,"new":500},"user":"localhost","result":"success","durationMs":5}
{"ts":"2026-03-01T14:50:00Z","action":"needs.dismiss","target":"need-ssl-expiry-warning","params":{},"user":"user@tailnet","result":"success","durationMs":3}
```

---

## Definition of Done

Phase 5 is complete when:

**Task Operations:**
- [ ] Tasks can be created from dashboard with title, column, project, priority, agent, estimate
- [ ] Kanban drag-and-drop persists to TODO.md
- [ ] Task metadata (estimate, priority, agent) editable from dashboard
- [ ] TODO.md writes are atomic with automatic backups
- [ ] Write failures roll back cleanly — TODO.md never left in corrupt state
- [ ] Backups auto-cleaned (keep last 20)

**GitHub Actions:**
- [ ] PRs can be approved from dashboard
- [ ] PRs can be merged (squash) from dashboard with destructive confirmation
- [ ] Failed CI workflows can be re-triggered
- [ ] GitHub API errors surface clearly (not silent failures)

**Agent Dispatch:**
- [ ] Agents can be triggered from the Agents page
- [ ] Command, project context, and working directory configurable
- [ ] Agent process spawns detached (survives dashboard restart)

**Settings:**
- [ ] Budget cap editable from Settings page
- [ ] Alert thresholds adjustable
- [ ] Collectors can be toggled on/off
- [ ] Refresh intervals adjustable
- [ ] Changes persist across dashboard restart

**Needs Quick Actions:**
- [ ] Needs can be dismissed permanently
- [ ] Needs can be snoozed with time duration
- [ ] Type-specific primary actions work (approve PR, re-run CI, etc.)

**Infrastructure:**
- [ ] All write actions go through confirmation dialog
- [ ] Optimistic UI updates with rollback on failure
- [ ] Toast notifications for success/error on all actions
- [ ] Audit trail logs every action with timestamp, user, result, duration
- [ ] Audit log viewable and filterable on Settings page
- [ ] Write endpoints rate-limited (30/min per user)
- [ ] All actions work from mobile via Tailscale
