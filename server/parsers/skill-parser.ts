import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface Agent {
  name: string;
  description: string;
  mode: string;
  subagents: string[];
  mcps: string[];
  filePath: string;
}

function parseYamlFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result: Record<string, unknown> = {};

  let currentKey: string | null = null;
  let currentList: string[] | null = null;

  for (const line of yaml.split("\n")) {
    // List item (indented with -)
    const listMatch = line.match(/^\s+-\s+(.+)$/);
    if (listMatch && currentKey && currentList) {
      // Strip inline comments
      const val = listMatch[1].replace(/#.*$/, "").trim();
      if (val) currentList.push(val);
      continue;
    }

    // Key-value pair
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      // Save previous list
      if (currentKey && currentList) {
        result[currentKey] = currentList;
      }

      currentKey = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === "" || value === "[]") {
        // Start of a list or empty
        currentList = [];
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // Inline list: [a, b, c]
        result[currentKey] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        currentKey = null;
        currentList = null;
      } else {
        result[currentKey] = value;
        currentKey = null;
        currentList = null;
      }
    }
  }

  // Save last list
  if (currentKey && currentList) {
    result[currentKey] = currentList;
  }

  return result;
}

export async function parseAgentFile(filePath: string): Promise<Agent | null> {
  try {
    const content = await Bun.file(filePath).text();
    const frontmatter = parseYamlFrontmatter(content);
    if (!frontmatter || !frontmatter.name) return null;

    return {
      name: String(frontmatter.name),
      description: String(frontmatter.description ?? ""),
      mode: String(frontmatter.mode ?? "subagent"),
      subagents: Array.isArray(frontmatter.subagents) ? frontmatter.subagents.map(String) : [],
      mcps: Array.isArray(frontmatter.mcps) ? frontmatter.mcps.map(String) : [],
      filePath,
    };
  } catch {
    return null;
  }
}

export async function scanAgents(agentsDir: string): Promise<Agent[]> {
  const agents: Agent[] = [];

  try {
    const entries = await readdir(agentsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(".md")) {
        const agent = await parseAgentFile(join(agentsDir, entry.name));
        if (agent) agents.push(agent);
      }
    }
  } catch (err) {
    console.error(`Failed to scan agents at ${agentsDir}:`, err);
  }

  return agents.sort((a, b) => b.subagents.length - a.subagents.length);
}
