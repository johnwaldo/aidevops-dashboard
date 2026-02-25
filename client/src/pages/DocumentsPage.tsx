import { useState, useEffect, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData";
import { FileTree } from "@/components/documents/FileTree";
import { MarkdownViewer } from "@/components/documents/MarkdownViewer";
import { SearchBar } from "@/components/documents/SearchBar";
import { LoadingPanel } from "@/components/shared/LoadingPanel";
import { API_BASE } from "@/lib/config";

interface TreeNode {
  type: "dir" | "file";
  name: string;
  children?: TreeNode[];
  size?: string;
  modified?: string;
}

export function DocumentsPage() {
  const { data: tree, loading, error, refresh } = useApiData<TreeNode[]>("documents/tree");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [content, setContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  const fetchContent = useCallback(async (path: string) => {
    setContentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/documents/content?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const json = await res.json();
        setContent(json.data?.content ?? null);
      } else {
        setContent(null);
      }
    } catch {
      setContent(null);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedFile) {
      fetchContent(selectedFile);
    } else {
      setContent(null);
    }
  }, [selectedFile, fetchContent]);

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className={`${selectedFile ? "hidden md:flex" : "flex"} w-full md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-[#1e1e2e] bg-[#111118] flex-col`}>
        <div className="p-3 border-b border-[#1e1e2e]">
          <h2 className="text-xs font-medium uppercase tracking-wider text-[#71717a] mb-2">Documents</h2>
          <SearchBar value={search} onChange={setSearch} />
        </div>
        <div className="flex-1 overflow-y-auto p-2 max-h-[50vh] md:max-h-none">
          <LoadingPanel loading={loading} error={error} onRetry={refresh}>
            {tree ? (
              <FileTree tree={tree} onSelect={setSelectedFile} />
            ) : (
              <p className="text-xs text-[#71717a] p-2">No documents found</p>
            )}
          </LoadingPanel>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {contentLoading ? (
          <div className="flex items-center justify-center h-full text-[#71717a] text-sm">Loading...</div>
        ) : content ? (
          <div className="p-4 md:p-6">
            <button
              onClick={() => setSelectedFile(null)}
              className="md:hidden text-xs text-cyan-400 mb-3 flex items-center gap-1"
            >
              &larr; Back to files
            </button>
            <h2 className="text-lg font-semibold font-[JetBrains_Mono] text-[#e4e4e7] mb-4 break-all">{selectedFile}</h2>
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="rounded bg-[#0a0a0f] p-4 text-xs font-mono text-[#71717a] leading-relaxed whitespace-pre-wrap">
                {content}
              </div>
            </div>
          </div>
        ) : (
          <MarkdownViewer fileName={selectedFile} />
        )}
      </div>
    </div>
  );
}
