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
import { Loader2, Play } from "lucide-react";
import { useAction } from "@/hooks/useAction";
import { useToast } from "@/components/actions/Toaster";

interface AgentDispatchProps {
  agentName: string;
  children?: React.ReactNode;
}

export function AgentDispatch({ agentName, children }: AgentDispatchProps) {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [project, setProject] = useState("");
  const { showToast } = useToast();

  const action = useAction({
    endpoint: "/api/actions/agents/dispatch",
    onSuccess: (data: unknown) => {
      const result = data as { data?: { pid?: number } };
      showToast("success", `Agent ${agentName} dispatched (PID: ${result?.data?.pid ?? "?"})`);
      resetForm();
      setOpen(false);
    },
    onError: (err) => {
      showToast("error", `Failed to dispatch: ${err}`);
    },
  });

  function resetForm() {
    setCommand("");
    setProject("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim()) return;

    await action.execute({
      agent: agentName,
      command: command.trim(),
      ...(project && { project: project.trim() }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button variant="outline" size="sm" className="h-6 text-[10px] border-[#1e1e2e] text-[#71717a] hover:text-emerald-400 hover:border-emerald-400/30">
            <Play className="h-3 w-3 mr-1" />
            Dispatch
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#111118] border-[#1e1e2e]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-[#e4e4e7] font-[Plus_Jakarta_Sans]">
              Dispatch {agentName}
            </DialogTitle>
            <DialogDescription className="text-[#71717a] text-sm">
              Send a command to this agent. It will run in the background.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs text-[#71717a]">Agent</Label>
              <Input
                value={agentName}
                disabled
                className="bg-[#0a0a0f] border-[#1e1e2e] text-[#71717a] font-mono"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="command" className="text-xs text-[#71717a]">Command *</Label>
              <Input
                id="command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="What should the agent do?"
                className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] placeholder:text-[#3f3f46]"
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="project" className="text-xs text-[#71717a]">Project context (optional)</Label>
              <Input
                id="project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="~/Git/project-name"
                className="bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] placeholder:text-[#3f3f46]"
              />
            </div>
          </div>

          <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 mb-4">
            <p className="text-xs text-amber-400">
              This will run: <code className="font-mono">claude -p "@{agentName} {command || '...'}"</code>
              {project && <> in <code className="font-mono">{project}</code></>}
            </p>
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
              disabled={!command.trim() || action.loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {action.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Dispatch
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
