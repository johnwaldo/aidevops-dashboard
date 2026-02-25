import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { config } from "../config";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

interface TreeNode {
  type: "dir" | "file";
  name: string;
  path: string;
  children?: TreeNode[];
  size?: string;
  modified?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

async function buildTree(dirPath: string, basePath: string, depth = 0, maxDepth = 5): Promise<TreeNode[]> {
  if (depth > maxDepth) return [];

  const nodes: TreeNode[] = [];

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files (except .agent-workspace), node_modules, etc.
      if (entry.name.startsWith(".") && entry.name !== ".agent-workspace") continue;
      if (entry.name === "node_modules" || entry.name === ".git") continue;

      const fullPath = join(dirPath, entry.name);
      const relPath = relative(basePath, fullPath);

      if (entry.isDirectory()) {
        const children = await buildTree(fullPath, basePath, depth + 1, maxDepth);
        nodes.push({
          type: "dir",
          name: entry.name,
          path: relPath,
          children,
        });
      } else if (entry.isFile()) {
        try {
          const fileStat = await stat(fullPath);
          nodes.push({
            type: "file",
            name: entry.name,
            path: relPath,
            size: formatSize(fileStat.size),
            modified: timeAgo(fileStat.mtime),
          });
        } catch {
          nodes.push({ type: "file", name: entry.name, path: relPath });
        }
      }
    }
  } catch {
    // Directory not readable
  }

  // Sort: dirs first, then files, alphabetical within each
  return nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function handleDocumentsTree(_req: Request): Promise<Response> {
  const cacheKey = "documents";
  const cached = cacheGet(cacheKey);
  if (cached) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const basePath = config.aidevopsDir;
    const tree = await buildTree(config.workspaceDir, basePath);

    // Also add key root files
    const rootFiles: TreeNode[] = [];
    for (const name of ["AGENTS.md", "TODO.md"]) {
      const filePath = join(config.aidevopsAgents, name);
      try {
        const fileStat = await stat(filePath);
        rootFiles.push({
          type: "file",
          name,
          path: name,
          size: formatSize(fileStat.size),
          modified: timeAgo(fileStat.mtime),
        });
      } catch {
        // File doesn't exist
      }
    }

    // Add TODO.md from the repo
    try {
      const todoPath = join(config.aidevopsRepo, "TODO.md");
      const todoStat = await stat(todoPath);
      rootFiles.push({
        type: "file",
        name: "TODO.md (repo)",
        path: "repo/TODO.md",
        size: formatSize(todoStat.size),
        modified: timeAgo(todoStat.mtime),
      });
    } catch {
      // No TODO.md in repo
    }

    const result = { tree: [...rootFiles, ...tree] };
    cacheSet(cacheKey, result, CACHE_TTL.documents);
    return apiResponse(result, "filesystem", CACHE_TTL.documents);
  } catch (err) {
    return apiError("SCAN_ERROR", String(err), "documents");
  }
}

export async function handleDocumentsContent(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");

  if (!filePath) {
    return apiError("MISSING_PARAM", "path parameter required", "documents", 400);
  }

  // Security: prevent path traversal
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return apiError("INVALID_PATH", "Path traversal not allowed", "documents", 400);
  }

  try {
    let fullPath: string;
    if (filePath.startsWith("repo/")) {
      fullPath = join(config.aidevopsRepo, filePath.slice(5));
    } else if (filePath === "AGENTS.md" || filePath === "TODO.md") {
      fullPath = join(config.aidevopsAgents, filePath);
    } else {
      fullPath = join(config.workspaceDir, filePath);
    }

    const file = Bun.file(fullPath);
    const exists = await file.exists();
    if (!exists) {
      return apiError("NOT_FOUND", `File not found: ${filePath}`, "documents", 404);
    }

    const content = await file.text();
    return apiResponse({ path: filePath, content }, "filesystem", 0);
  } catch (err) {
    return apiError("READ_ERROR", String(err), "documents");
  }
}
