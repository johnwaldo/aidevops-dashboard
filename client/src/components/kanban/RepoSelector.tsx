import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FolderGit2 } from "lucide-react";
import type { TrackedRepo } from "@/hooks/useRepos";

interface RepoSelectorProps {
  repos: TrackedRepo[];
  value: string;
  onChange: (value: string) => void;
}

export function RepoSelector({ repos, value, onChange }: RepoSelectorProps) {
  if (repos.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <FolderGit2 className="h-4 w-4 text-[#71717a]" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-[180px] bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] text-xs">
          <SelectValue placeholder="All repos" />
        </SelectTrigger>
        <SelectContent className="bg-[#111118] border-[#1e1e2e]">
          <SelectItem value="all" className="text-[#e4e4e7] text-xs">
            All repos
          </SelectItem>
          {repos.map((repo) => (
            <SelectItem key={repo.name} value={repo.name} className="text-[#e4e4e7] text-xs">
              {repo.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
