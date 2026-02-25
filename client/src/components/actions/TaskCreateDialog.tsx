import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/components/actions/Toaster";

interface TaskCreateDialogProps {
  defaultColumn?: string;
  onCreated?: () => void;
  children?: React.ReactNode;
}

const columns = [
  { value: "backlog", label: "Backlog" },
  { value: "ready", label: "Ready" },
  { value: "inProgress", label: "In Progress" },
  { value: "inReview", label: "In Review" },
];

const priorities = [
  { value: "", label: "None" },
  { value: "P0", label: "P0 - Critical" },
  { value: "P1", label: "P1 - High" },
  { value: "P2", label: "P2 - Medium" },
  { value: "P3", label: "P3 - Low" },
];

export function TaskCreateDialog({ defaultColumn = "backlog", onCreated, children }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [column, setColumn] = useState(defaultColumn);
  const [priority, setPriority] = useState("");
  const [estimate, setEstimate] = useState("");
  const [project, setProject] = useState("");
  const { showToast } = useToast();

  const action = useAction({
    endpoint: "/api/actions/tasks/create",
    onSuccess: () => {
      showToast("success", `Task created in ${columns.find((c) => c.value === column)?.label ?? column}`);
      resetForm();
      setOpen(false);
      onCreated?.();
    },
    onError: (err) => {
      showToast("error", `Failed to create task: ${err}`);
    },
  });

  function resetForm() {
    setTitle("");
    setColumn(defaultColumn);
    setPriority("");
    setEstimate("");
    setProject("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    await action.execute({
      title: title.trim(),
      column,
      ...(priority && { priority }),
      ...(estimate && { estimate }),
      ...(project && { project }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" className="h-7 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]">
            <Plus className="h-3 w-3 mr-1" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#111118] border-[#1e1e2e]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[#e4e4e7] font-[Plus_Jakarta_Sans]">Create Task</DialogTitle>
            <DialogDescription className="text-[#71717a] text-sm">
              Add a new task to TODO.md. It will appear on the kanban board.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-xs text-[#71717a]">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task description..."
                className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] placeholder:text-[#3f3f46]"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs text-[#71717a]">Column</Label>
                <Select value={column} onValueChange={setColumn}>
                  <SelectTrigger className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111118] border-[#1e1e2e]">
                    {columns.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-[#e4e4e7]">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-[#71717a]">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111118] border-[#1e1e2e]">
                    {priorities.map((p) => (
                      <SelectItem key={p.value || "none"} value={p.value || "none"} className="text-[#e4e4e7]">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="estimate" className="text-xs text-[#71717a]">Estimate</Label>
                <Input
                  id="estimate"
                  value={estimate}
                  onChange={(e) => setEstimate(e.target.value)}
                  placeholder="2h, 1d, 30m"
                  className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] placeholder:text-[#3f3f46]"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="project" className="text-xs text-[#71717a]">Project tag</Label>
                <Input
                  id="project"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="project-name"
                  className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] placeholder:text-[#3f3f46]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-[#1e1e2e] text-[#71717a] hover:text-[#e4e4e7] hover:border-[#2e2e3e]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || action.loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {action.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
