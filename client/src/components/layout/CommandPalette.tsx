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
import { projectsMock, agentsMock, kanbanMock } from "@/lib/mock-data";

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
        <CommandGroup heading="Projects">
          {projectsMock.map((p) => (
            <CommandItem key={p.name} onSelect={() => handleSelect("projects")}>
              <FolderGit2 className="mr-2 h-4 w-4" />
              {p.name}
              <span className="ml-auto text-xs text-[#71717a]">{p.category}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Agents">
          {agentsMock.primary.map((a) => (
            <CommandItem key={a.name} onSelect={() => handleSelect("agents")}>
              <Bot className="mr-2 h-4 w-4" />
              {a.name}
              <span className="ml-auto text-xs text-[#71717a]">{a.desc}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Tasks">
          {[...kanbanMock.inProgress, ...kanbanMock.pendingApproval].map((t) => (
            <CommandItem key={t.id} onSelect={() => handleSelect("kanban")}>
              <Kanban className="mr-2 h-4 w-4" />
              {t.title}
              <span className="ml-auto text-xs text-[#71717a]">{t.id}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
