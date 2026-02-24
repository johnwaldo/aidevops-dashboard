import {
  LayoutDashboard,
  FolderGit2,
  Kanban,
  HeartPulse,
  Bell,
  Coins,
  Bot,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Page } from "@/App";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: "overview", label: "Overview", icon: LayoutDashboard },
  { page: "projects", label: "Projects", icon: FolderGit2 },
  { page: "kanban", label: "Kanban", icon: Kanban },
  { page: "health", label: "Health", icon: HeartPulse },
  { page: "needs", label: "Needs", icon: Bell },
  { page: "tokens", label: "Tokens", icon: Coins },
  { page: "agents", label: "Agents", icon: Bot },
  { page: "documents", label: "Documents", icon: FileText },
  { page: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-16 shrink-0 border-r border-[#1e1e2e] bg-[#111118] flex flex-col">
      <div className="flex h-12 items-center justify-center border-b border-[#1e1e2e]">
        <div className="flex flex-col items-center leading-none">
          <span className="text-[13px] font-bold font-mono text-cyan-400">AI</span>
          <span className="text-[9px] font-bold font-mono text-[#e4e4e7] -mt-0.5">DevOps</span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1 p-2 pt-4">
        {navItems.map(({ page, label, icon: Icon }) => (
          <Tooltip key={page} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onNavigate(page)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-md transition-colors",
                  currentPage === page
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-[#71717a] hover:bg-[#1e1e2e] hover:text-[#e4e4e7]"
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-[#1e1e2e] text-[#e4e4e7] border-[#2e2e3e]">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </nav>
    </aside>
  );
}
