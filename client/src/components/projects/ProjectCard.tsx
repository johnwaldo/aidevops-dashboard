import { Github, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";

interface Project {
  name: string;
  description: string;
  url: string;
  platform: string;
  branch: string;
  lastCommit: { sha: string; message: string; author: string; time: string };
  ci: string;
  issues: number;
  prs: number;
  language: string;
  visibility: string;
  updatedAt: string;
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="rounded-md border border-[#1e1e2e] bg-[#111118] p-4 transition-all hover:border-[#2e2e3e] hover:shadow-lg hover:shadow-black/20 group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#e4e4e7] group-hover:text-cyan-300 transition-colors truncate">
            {project.name}
          </h3>
          <p className="text-xs text-[#71717a] mt-0.5 truncate">{project.description}</p>
        </div>
        <Badge variant="outline" className="shrink-0 ml-2 text-[10px] border border-[#1e1e2e] text-[#71717a]">
          {project.visibility}
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
        <Badge variant="outline" className="text-[10px] border-[#1e1e2e] text-[#71717a]">
          {project.language}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-[#71717a]">
        <div className="flex items-center gap-3">
          <span>{project.issues} issues</span>
          <span>{project.prs} PRs</span>
        </div>
        <span className={cn("text-[#71717a]")}>{project.platform}</span>
      </div>
    </div>
  );
}
