import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const HOME = process.env.HOME ?? "/tmp";
const BACKUP_DIR = join(HOME, ".aidevops/dashboard/backups");
const MAX_BACKUPS = 20;

export class TodoWriter {
  private todoPath: string;
  private lockActive = false;

  constructor(todoPath: string) {
    this.todoPath = todoPath;
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // ── Core write pattern: backup → modify → atomic write → verify ──

  private async withBackup(operation: (content: string) => string): Promise<void> {
    if (this.lockActive) throw new Error("Concurrent write rejected — TODO.md is locked");
    this.lockActive = true;

    const backupPath = join(BACKUP_DIR, `TODO.md.${Date.now()}`);

    try {
      // 1. Backup current state
      if (existsSync(this.todoPath)) {
        copyFileSync(this.todoPath, backupPath);
      }

      // 2. Read current content
      const content = readFileSync(this.todoPath, "utf-8");

      // 3. Apply modification
      const newContent = operation(content);

      // 4. Validate result
      this.validate(newContent);

      // 5. Atomic write: temp file → rename
      const tmpPath = `${this.todoPath}.tmp.${Date.now()}`;
      writeFileSync(tmpPath, newContent, "utf-8");

      // Bun doesn't have renameSync on the global — use fs
      const { renameSync } = await import("node:fs");
      renameSync(tmpPath, this.todoPath);

      // 6. Clean old backups
      this.cleanBackups();
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
    if (!content.includes("#")) throw new Error("Validation failed: no markdown headers found");
    if (content.trim().length < 10) throw new Error("Validation failed: content too short");
  }

  private cleanBackups(): void {
    try {
      const files = readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith("TODO.md."))
        .sort()
        .reverse();
      for (const file of files.slice(MAX_BACKUPS)) {
        unlinkSync(join(BACKUP_DIR, file));
      }
    } catch {
      // Non-critical
    }
  }

  // ── Section parsing ──

  private parseSections(content: string): { sections: Map<string, string[]>; raw: string[] } {
    const lines = content.split("\n");
    const sections = new Map<string, string[]>();
    let currentSection: string | null = null;

    for (const line of lines) {
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        currentSection = this.normalizeSection(headerMatch[1].trim());
        if (!sections.has(currentSection)) {
          sections.set(currentSection, []);
        }
        continue;
      }

      if (currentSection && line.match(/^- \[/)) {
        sections.get(currentSection)!.push(line);
      }
    }

    return { sections, raw: lines };
  }

  private normalizeSection(name: string): string {
    const lower = name.toLowerCase();
    const map: Record<string, string> = {
      "ready": "ready",
      "backlog": "backlog",
      "in progress": "inProgress",
      "in review": "inReview",
      "done": "done",
      "declined": "declined",
    };
    return map[lower] ?? lower;
  }

  private sectionHeader(normalized: string): string {
    const map: Record<string, string> = {
      ready: "Ready",
      backlog: "Backlog",
      inProgress: "In Progress",
      inReview: "In Review",
      done: "Done",
      declined: "Declined",
    };
    return map[normalized] ?? normalized;
  }

  private extractTaskId(line: string): string | null {
    const match = line.match(/^- \[[ x\-]\]\s+(t\d+(?:\.\d+)*)\s/);
    return match ? match[1] : null;
  }

  private serializeSections(sections: Map<string, string[]>, originalContent: string): string {
    const lines = originalContent.split("\n");
    const result: string[] = [];
    let currentSection: string | null = null;
    let skipTaskLines = false;

    for (const line of lines) {
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        // If we were in a section, append its tasks
        if (currentSection && sections.has(currentSection)) {
          const tasks = sections.get(currentSection)!;
          for (const task of tasks) {
            result.push(task);
          }
          skipTaskLines = false;
        }

        currentSection = this.normalizeSection(headerMatch[1].trim());
        skipTaskLines = true;
        result.push(line);
        continue;
      }

      if (skipTaskLines && line.match(/^- \[/)) {
        // Skip original task lines — we'll insert from sections map
        continue;
      }

      if (skipTaskLines && !line.match(/^- \[/) && line.trim() !== "") {
        // Non-task content after header — flush section tasks first
        if (currentSection && sections.has(currentSection)) {
          const tasks = sections.get(currentSection)!;
          for (const task of tasks) {
            result.push(task);
          }
          sections.delete(currentSection); // Mark as flushed
        }
        skipTaskLines = false;
      }

      result.push(line);
    }

    // Flush last section if needed
    if (currentSection && sections.has(currentSection)) {
      const tasks = sections.get(currentSection)!;
      for (const task of tasks) {
        result.push(task);
      }
    }

    return result.join("\n");
  }

  private replaceOrAppend(line: string, pattern: RegExp, replacement: string): string {
    if (pattern.test(line)) {
      return line.replace(pattern, replacement);
    }
    return `${line} ${replacement}`;
  }

  private updateTaskForColumn(taskLine: string, toColumn: string): string {
    const now = new Date().toISOString().split("T")[0];
    switch (toColumn) {
      case "backlog":
      case "ready":
        return taskLine.replace(/\[x\]/, "[ ]");
      case "inProgress":
        return taskLine.replace(/\[x\]/, "[ ]").replace(/\[ \]/, "[ ]") +
          (taskLine.includes("started:") ? "" : ` started:${now}`);
      case "inReview":
        return taskLine;
      case "done":
        return taskLine.replace(/\[ \]/, "[x]") +
          (taskLine.includes("completed:") ? "" : ` completed:${now}`);
      default:
        return taskLine;
    }
  }

  // ── Public operations ──

  async moveTask(taskId: string, fromColumn: string, toColumn: string): Promise<void> {
    await this.withBackup((content) => {
      const { sections, raw } = this.parseSections(content);

      const sourceSection = sections.get(fromColumn);
      if (!sourceSection) throw new Error(`Column "${fromColumn}" not found`);

      const taskIndex = sourceSection.findIndex((line) => this.extractTaskId(line) === taskId);
      if (taskIndex === -1) throw new Error(`Task "${taskId}" not found in "${fromColumn}"`);

      const [taskLine] = sourceSection.splice(taskIndex, 1);
      const updatedLine = this.updateTaskForColumn(taskLine, toColumn);

      let targetSection = sections.get(toColumn);
      if (!targetSection) {
        targetSection = [];
        sections.set(toColumn, targetSection);
      }
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
    taskId?: string;
  }): Promise<string> {
    let newTaskId = task.taskId ?? "";

    await this.withBackup((content) => {
      const { sections } = this.parseSections(content);

      // Generate task ID if not provided
      if (!newTaskId) {
        let maxId = 0;
        for (const tasks of sections.values()) {
          for (const line of tasks) {
            const id = this.extractTaskId(line);
            if (id) {
              const num = parseInt(id.replace("t", ""), 10);
              if (num > maxId) maxId = num;
            }
          }
        }
        newTaskId = `t${String(maxId + 1).padStart(3, "0")}`;
      }

      // Build task line
      let line = `- [ ] ${newTaskId} ${task.title}`;
      if (task.estimate) line += ` ~${task.estimate}`;
      if (task.priority) line += ` ${task.priority}`;
      if (task.project) line += ` @${task.project}`;
      if (task.agent) line += ` assignee:${task.agent}`;

      // Find the target section in the raw content and insert
      const targetColumn = task.column || "backlog";
      const lines = content.split("\n");
      const sectionHeaderText = `## ${this.sectionHeader(targetColumn)}`;
      const headerIndex = lines.findIndex((l) => l.trim() === sectionHeaderText);

      if (headerIndex === -1) {
        throw new Error(`Column "${targetColumn}" not found in TODO.md`);
      }

      // Find the end of this section (next ## header or EOF)
      let insertIndex = headerIndex + 1;
      // Skip blank lines after header
      while (insertIndex < lines.length && lines[insertIndex].trim() === "") {
        insertIndex++;
      }
      // Skip existing task lines to insert at end of section
      while (insertIndex < lines.length && lines[insertIndex].match(/^- \[/)) {
        insertIndex++;
      }

      lines.splice(insertIndex, 0, line);
      return lines.join("\n");
    });

    return newTaskId;
  }

  async updateTaskField(taskId: string, field: string, value: string): Promise<void> {
    await this.withBackup((content) => {
      const lines = content.split("\n");
      const taskLineIndex = lines.findIndex((l) => {
        const id = l.match(/^- \[[ x\-]\]\s+(t\d+(?:\.\d+)*)\s/);
        return id && id[1] === taskId;
      });

      if (taskLineIndex === -1) throw new Error(`Task "${taskId}" not found`);

      switch (field) {
        case "estimate":
          lines[taskLineIndex] = this.replaceOrAppend(lines[taskLineIndex], /~\S+/, `~${value}`);
          break;
        case "priority":
          lines[taskLineIndex] = this.replaceOrAppend(lines[taskLineIndex], /\bP[0-3]\b/, value);
          break;
        case "agent":
          lines[taskLineIndex] = this.replaceOrAppend(lines[taskLineIndex], /assignee:\S+/, `assignee:${value}`);
          break;
        case "title": {
          // Replace the title portion (after task ID, before metadata)
          const idMatch = lines[taskLineIndex].match(/^(- \[[ x\-]\]\s+t\d+(?:\.\d+)*\s+)/);
          if (idMatch) {
            const prefix = idMatch[1];
            const rest = lines[taskLineIndex].slice(prefix.length);
            // Find where metadata starts (first ~, P0-3, @, assignee:, started:, etc.)
            const metaStart = rest.search(/\s+(?:~|P[0-3]|@|assignee:|started:|completed:|model:|pr:|ref:|blocked-by:|blocks:|#)/);
            if (metaStart > 0) {
              lines[taskLineIndex] = prefix + value + rest.slice(metaStart);
            } else {
              lines[taskLineIndex] = prefix + value;
            }
          }
          break;
        }
        default:
          throw new Error(`Unknown field: ${field}`);
      }

      return lines.join("\n");
    });
  }
}
