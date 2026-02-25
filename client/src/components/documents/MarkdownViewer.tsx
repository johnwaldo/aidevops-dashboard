export function MarkdownViewer({ fileName }: { fileName: string | null }) {
  if (!fileName) {
    return (
      <div className="flex items-center justify-center h-full text-[#71717a] text-sm">
        Select a file to view its contents
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold font-[JetBrains_Mono] text-[#e4e4e7] mb-4">{fileName}</h2>
      <div className="prose prose-invert prose-sm max-w-none">
        <div className="rounded bg-[#0a0a0f] p-4 text-xs font-mono text-[#71717a] leading-relaxed">
          <p className="text-[#e4e4e7] mb-2"># {fileName.replace(".md", "")}</p>
          <p className="mb-2">This is a mock preview of <span className="text-cyan-400">{fileName}</span>.</p>
          <p className="mb-2">In Phase 2, this viewer will render actual markdown content from the filesystem.</p>
          <p className="text-[#71717a]">---</p>
          <p className="mt-2">## Section 1</p>
          <p className="mt-1">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
          <p className="mt-2">## Section 2</p>
          <p className="mt-1">Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        </div>
      </div>
    </div>
  );
}
