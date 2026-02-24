import { Github, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";

interface Project {
  name: string;
  description: string;
  repo: string;
  platform: string;
  branch: string;
  lastCommit: { sha: string; message: string; author: string; time: string };
  ci: "passing" | "failing" | "none";
  quality: string;
  issues: number;
  prs: number;
  vulns: { critical: number; high: number; medium: number };
  language: string;
  category: string;
  tokenSpend: number;
  lastDeploy: string | null;
}

const categoryColors: Record<string, string> = {
  "Custom Water": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Infrastructure: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const qualityColors: Record<string, string> = {
  A: "text-emerald-400",
  "A-": "text-emerald-400",
  "B+": "text-cyan-400",
  B: "text-cyan-400",
  "—": "text-[#71717a]",
};

export function ProjectCard({ project }: { project: Project }) {
  const totalVulns = project.vulns.critical + project.vulns.high + project.vulns.medium;

  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 transition-all hover:border-[#2e2e3e] hover:shadow-lg hover:shadow-black/20 group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#e4e4e7] group-hover:text-cyan-300 transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-xs text-[#71717a] mt-0.5 truncate">{project.description}</p>
        </div>
        <Badge variant="outline" className={cn("shrink-0 ml-2 text-[10px] border", categoryColors[project.category])}>
          {project.category}
        </Badge>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[#71717a] font-mono mb-3">
        <Github className="h-3 w-3" />
        <GitBranch className="h-3 w-3" />
        <span>{project.branch}</span>
      </div>

      <div className="rounded bg-[#0a0a0f] p-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-400/70">{project.lastCommit.sha}</span>
          <span className="text-xs text-[#e4e4e7] truncate flex-1">{project.lastCommit.message}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-violet-400/70">{project.lastCommit.author}</span>
          <span className="text-[10px] font-mono text-[#71717a]">{project.lastCommit.time}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <StatusBadge status={project.ci} label={project.ci === "none" ? "No CI" : project.ci === "passing" ? "Passing" : "Failing"} />
        <span className={cn("text-xs font-mono font-bold", qualityColors[project.quality] ?? "text-[#71717a]")}>
          {project.quality}
        </span>
        <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a]">
          {project.language}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-[#71717a]">
        <div className="flex items-center gap-3">
          <span>{project.issues} issues</span>
          <span>{project.prs} PRs</span>
          <span className={cn(totalVulns > 0 ? "text-amber-400" : "")}>
            {totalVulns} vulns
          </span>
        </div>
        <span className="text-cyan-400/70">${project.tokenSpend.toFixed(0)}/mo</span>
      </div>
    </div>
  );
}
