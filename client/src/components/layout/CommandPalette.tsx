import { useEffect, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { useApiData } from "@/hooks/useApiData";

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

interface Agent {
  name: string;
  description: string;
  subagents: string[];
  mcps: string[];
}

interface AgentsData {
  agents: Agent[];
  totalSubagents: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  tags: string[];
  agents: string[];
  estimate: string;
  started: string | null;
  completed: string | null;
}

interface TasksData {
  backlog: Task[];
  ready: Task[];
  inProgress: Task[];
  inReview: Task[];
  done: Task[];
  declined: Task[];
}

interface CommandPaletteProps {
  onNavigate?: (page: string) => void;
}

const pages = [
  { name: "Overview", page: "overview", icon: LayoutDashboard },
  { name: "Projects", page: "projects", icon: FolderGit2 },
  { name: "Kanban", page: "kanban", icon: Kanban },
  { name: "Health", page: "health", icon: HeartPulse },
  { name: "Needs From Me", page: "needs", icon: Bell },
  { name: "Tokens & Cost", page: "tokens", icon: Coins },
  { name: "Agents", page: "agents", icon: Bot },
  { name: "Documents", page: "documents", icon: FileText },
  { name: "Settings", page: "settings", icon: Settings },
];

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const { data: projects } = useApiData<Project[]>("projects");
  const { data: agentsData } = useApiData<AgentsData>("agents");
  const { data: tasks } = useApiData<TasksData>("tasks");

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelect(page: string) {
    onNavigate?.(page);
    setOpen(false);
  }

  const activeTasks = [
    ...(tasks?.inProgress ?? []),
    ...(tasks?.inReview ?? []),
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, projects, agents, tasks..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map(({ name, page, icon: Icon }) => (
            <CommandItem key={page} onSelect={() => handleSelect(page)}>
              <Icon className="mr-2 h-4 w-4" />
              {name}
            </CommandItem>
          ))}
        </CommandGroup>
        {projects && projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem key={p.name} onSelect={() => handleSelect("projects")}>
                <FolderGit2 className="mr-2 h-4 w-4" />
                {p.name}
                <span className="ml-auto text-xs text-[#71717a]">{p.language}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {agentsData && agentsData.agents.length > 0 && (
          <CommandGroup heading="Agents">
            {agentsData.agents.map((a) => (
              <CommandItem key={a.name} onSelect={() => handleSelect("agents")}>
                <Bot className="mr-2 h-4 w-4" />
                {a.name}
                <span className="ml-auto text-xs text-[#71717a]">{a.description}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {activeTasks.length > 0 && (
          <CommandGroup heading="Tasks">
            {activeTasks.map((t) => (
              <CommandItem key={t.id} onSelect={() => handleSelect("kanban")}>
                <Kanban className="mr-2 h-4 w-4" />
                {t.title}
                <span className="ml-auto text-xs text-[#71717a]">{t.id}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
