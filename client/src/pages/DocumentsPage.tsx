import { useState } from "react";
import { documentsMock } from "@/lib/mock-data";
import { FileTree } from "@/components/documents/FileTree";
import { MarkdownViewer } from "@/components/documents/MarkdownViewer";
import { SearchBar } from "@/components/documents/SearchBar";

export function DocumentsPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-full">
      <div className="w-72 shrink-0 border-r border-[#1e1e2e] bg-[#111118] flex flex-col">
        <div className="p-3 border-b border-[#1e1e2e]">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-2">Documents</h2>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <FileTree tree={documentsMock.tree} onSelect={setSelectedFile} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <MarkdownViewer fileName={selectedFile} />
      </div>
    </div>
  );
}
