export interface StatusSection {
  name: string;
  items: { label: string; status: "ok" | "warn" | "error" | "info"; detail?: string }[];
}

export interface ParsedStatus {
  version: { installed: string; latest: string; updateAvailable: boolean };
  sections: StatusSection[];
}

// Strip ANSI escape codes
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

export function parseStatusOutput(raw: string): ParsedStatus {
  const clean = stripAnsi(raw);
  const lines = clean.split("\n").filter((l) => l.trim());

  const result: ParsedStatus = {
    version: { installed: "", latest: "", updateAvailable: false },
    sections: [],
  };

  let currentSection: StatusSection | null = null;

  for (const line of lines) {
    // Skip header
    if (line.startsWith("AI DevOps") || line.startsWith("===")) continue;

    // Version lines
    const installedMatch = line.match(/Installed:\s*(.+)/);
    if (installedMatch) {
      result.version.installed = installedMatch[1].trim();
      continue;
    }
    const latestMatch = line.match(/Latest:\s*(.+)/);
    if (latestMatch) {
      result.version.latest = latestMatch[1].trim();
      continue;
    }
    if (line.includes("Update available")) {
      result.version.updateAvailable = true;
      continue;
    }

    // Section header (no leading whitespace, not a status line)
    if (!line.startsWith(" ") && !line.startsWith("[")) {
      const sectionName = line.trim();
      if (sectionName && !sectionName.startsWith("[")) {
        currentSection = { name: sectionName, items: [] };
        result.sections.push(currentSection);
        continue;
      }
    }

    // Status items: [OK] label or [WARN] label - detail
    const itemMatch = line.match(/\[(OK|WARN|ERROR)\]\s+(.+)/);
    if (itemMatch && currentSection) {
      const statusMap: Record<string, "ok" | "warn" | "error"> = {
        OK: "ok",
        WARN: "warn",
        ERROR: "error",
      };
      const parts = itemMatch[2].split(" - ");
      currentSection.items.push({
        label: parts[0].trim(),
        status: statusMap[itemMatch[1]] ?? "info",
        detail: parts[1]?.trim(),
      });
    }
  }

  return result;
}

export async function getAidevopsStatus(): Promise<ParsedStatus> {
  try {
    const proc = Bun.spawn(["aidevops", "status"], { stdout: "pipe", stderr: "pipe" });
    const text = await new Response(proc.stdout).text();
    await proc.exited;
    return parseStatusOutput(text);
  } catch (err) {
    console.error("Failed to run aidevops status:", err);
    return {
      version: { installed: "unknown", latest: "unknown", updateAvailable: false },
      sections: [],
    };
  }
}
