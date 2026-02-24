import { useState } from "react";
import { ChevronRight, Folder, FolderOpen, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNode {
  type: "dir" | "file";
  name: string;
  children?: TreeNode[];
  size?: string;
  modified?: string;
}

function TreeItem({ node, depth, onSelect }: { node: TreeNode; depth: number; onSelect: (name: string) => void }) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === "file") {
    return (
      <button
        onClick={() => onSelect(node.name)}
        className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-[#1e1e2e] transition-colors group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <FileText className="h-3.5 w-3.5 text-[#71717a] shrink-0" />
        <span className="text-xs text-[#e4e4e7] group-hover:text-cyan-300 truncate">{node.name}</span>
        {node.size && <span className="text-[10px] font-mono text-[#71717a] ml-auto shrink-0">{node.size}</span>}
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left py-1 px-2 rounded hover:bg-[#1e1e2e] transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <ChevronRight className={cn("h-3 w-3 text-[#71717a] transition-transform", open && "rotate-90")} />
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 text-cyan-400/70 shrink-0" />
        ) : (
          <Folder className="h-3.5 w-3.5 text-cyan-400/70 shrink-0" />
        )}
        <span className="text-xs text-[#e4e4e7] truncate">{node.name}</span>
      </button>
      {open && node.children?.map((child) => (
        <TreeItem key={child.name} node={child} depth={depth + 1} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function FileTree({ tree, onSelect }: { tree: TreeNode[]; onSelect: (name: string) => void }) {
  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeItem key={node.name} node={node} depth={0} onSelect={onSelect} />
      ))}
    </div>
  );
}
