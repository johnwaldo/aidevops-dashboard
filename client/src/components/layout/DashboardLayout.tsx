export function DashboardLayout({ children }: { children: React.ReactNode }) {
  // TODO: Phase 1 — Main shell: sidebar + topbar + content area
  return (
    <div className="flex h-screen bg-[#0a0a0f] text-[#e4e4e7]">
      {children}
    </div>
  );
}
