export interface Task {
  id: string;
  title: string;
  status: "ready" | "backlog" | "in-progress" | "in-review" | "done" | "declined";
  checked: boolean;
  estimate: string | null;
  actual: string | null;
  started: string | null;
  completed: string | null;
  logged: string | null;
  project: string | null;
  agent: string | null;
  assignee: string | null;
  priority: string | null;
  model: string | null;
  tags: string[];
  pr: string | null;
  ref: string | null;
  blockedBy: string[];
  blocks: string[];
  subtasks: Task[];
  description: string;
}

export interface ParsedTodo {
  ready: Task[];
  backlog: Task[];
  inProgress: Task[];
  inReview: Task[];
  done: Task[];
  declined: Task[];
}

const SECTION_MAP: Record<string, keyof ParsedTodo> = {
  "ready": "ready",
  "backlog": "backlog",
  "in progress": "inProgress",
  "in review": "inReview",
  "done": "done",
  "declined": "declined",
};

function parseTaskLine(line: string, section: keyof ParsedTodo): Task | null {
  // Match: - [ ] or - [x] or - [-]
  const checkMatch = line.match(/^(\s*)- \[([ x\-])\]\s+(.+)$/);
  if (!checkMatch) return null;

  const indent = checkMatch[1].length;
  const checked = checkMatch[2] === "x";
  const declined = checkMatch[2] === "-";
  let rest = checkMatch[3];

  // Extract task ID (tXXX or tXXX.X.X)
  const idMatch = rest.match(/^(t\d+(?:\.\d+)*)\s+/);
  const id = idMatch ? idMatch[1] : `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  if (idMatch) rest = rest.slice(idMatch[0].length);

  // Extract fields from the rest of the line
  const estimate = rest.match(/~(\d+(?:\.\d+)?[hm](?:\s*\([^)]+\))?)/)?.[1] ?? null;
  const actual = rest.match(/actual:(\S+)/)?.[1] ?? null;
  const started = rest.match(/started:(\S+)/)?.[1] ?? null;
  const completed = rest.match(/completed:(\S+)/)?.[1] ?? null;
  const logged = rest.match(/logged:(\S+)/)?.[1] ?? null;
  const agent = rest.match(/@(\w[\w-]*)/)?.[1] ?? null;
  const assignee = rest.match(/assignee:(\S+)/)?.[1] ?? null;
  const priority = rest.match(/\b(P[0-3])\b/)?.[1] ?? null;
  const model = rest.match(/model:(\S+)/)?.[1] ?? null;
  const pr = rest.match(/pr:(#?\S+)/)?.[1] ?? null;
  const ref = rest.match(/ref:(\S+)/)?.[1] ?? null;

  // Extract tags (#word)
  const tags = [...rest.matchAll(/#(\w[\w-]*)/g)].map((m) => m[1]);

  // Extract dependencies
  const blockedBy = rest.match(/blocked-by:(\S+)/)?.[1]?.split(",") ?? [];
  const blocks = rest.match(/blocks:(\S+)/)?.[1]?.split(",") ?? [];

  // Clean title: remove all metadata fields to get the description
  let title = rest
    .replace(/~\d+(?:\.\d+)?[hm](?:\s*\([^)]+\))?/g, "")
    .replace(/actual:\S+/g, "")
    .replace(/started:\S+/g, "")
    .replace(/completed:\S+/g, "")
    .replace(/logged:\S+/g, "")
    .replace(/assignee:\S+/g, "")
    .replace(/model:\S+/g, "")
    .replace(/pr:\S+/g, "")
    .replace(/ref:\S+/g, "")
    .replace(/blocked-by:\S+/g, "")
    .replace(/blocks:\S+/g, "")
    .replace(/status:\S+/g, "")
    .replace(/\bP[0-3]\b/g, "")
    .replace(/#\w[\w-]*/g, "")
    .replace(/@\w[\w-]*/g, "")
    .replace(/→\s*\[.*?\]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Determine status
  let status: Task["status"] = section;
  if (declined) status = "declined";
  else if (checked) status = "done";

  return {
    id,
    title,
    status,
    checked,
    estimate,
    actual,
    started,
    completed,
    logged,
    project: tags[0] ?? null, // First tag is typically the project
    agent: agent ? `@${agent}` : null,
    assignee,
    priority,
    model,
    tags,
    pr,
    ref,
    blockedBy,
    blocks,
    subtasks: [],
    description: rest,
  };
}

export function parseTodoMd(content: string): ParsedTodo {
  const result: ParsedTodo = {
    ready: [],
    backlog: [],
    inProgress: [],
    inReview: [],
    done: [],
    declined: [],
  };

  let currentSection: keyof ParsedTodo = "backlog";
  let skipFormat = true; // Skip the Format section at the top

  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim().toLowerCase();
      if (sectionName === "format") {
        skipFormat = true;
        continue;
      }
      if (SECTION_MAP[sectionName]) {
        currentSection = SECTION_MAP[sectionName];
        skipFormat = false;
        continue;
      }
      // Unknown section — stop skipping format
      skipFormat = false;
      continue;
    }

    if (skipFormat) continue;

    // Parse task lines (top-level only — starts with "- [")
    if (line.match(/^- \[/)) {
      const task = parseTaskLine(line, currentSection);
      if (task) {
        result[currentSection].push(task);
      }
    }
  }

  return result;
}

export async function parseTodoFile(filePath: string): Promise<ParsedTodo> {
  try {
    const file = Bun.file(filePath);
    const content = await file.text();
    return parseTodoMd(content);
  } catch (err) {
    console.error(`Failed to parse TODO.md at ${filePath}:`, err);
    return { ready: [], backlog: [], inProgress: [], inReview: [], done: [], declined: [] };
  }
}
