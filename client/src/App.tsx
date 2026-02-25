import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { LoginGate } from "@/components/auth/LoginGate";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useApiData } from "@/hooks/useApiData";
import { OverviewPage } from "@/pages/OverviewPage";
import { ProjectsPage } from "@/pages/ProjectsPage";
import { KanbanPage } from "@/pages/KanbanPage";
import { HealthPage } from "@/pages/HealthPage";
import { NeedsPage } from "@/pages/NeedsPage";
import { TokensPage } from "@/pages/TokensPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { DocumentsPage } from "@/pages/DocumentsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export type Page =
  | "overview"
  | "projects"
  | "kanban"
  | "health"
  | "needs"
  | "tokens"
  | "agents"
  | "documents"
  | "settings";

const pages: Record<Page, () => React.JSX.Element> = {
  overview: OverviewPage,
  projects: ProjectsPage,
  kanban: KanbanPage,
  health: HealthPage,
  needs: NeedsPage,
  tokens: TokensPage,
  agents: AgentsPage,
  documents: DocumentsPage,
  settings: SettingsPage,
};

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("overview");
  const PageComponent = pages[currentPage];
  const { status: wsStatus } = useWebSocket();
  const { data: needs } = useApiData<unknown[]>("needs", 10);
  const needsCount = needs?.length ?? 0;

  return (
    <TooltipProvider>
      <LoginGate>
        <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-[#e4e4e7] font-[Plus_Jakarta_Sans]">
          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden md:block">
            <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar wsStatus={wsStatus} />
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              <PageComponent />
            </main>
          </div>
          {/* Mobile bottom nav — hidden on desktop */}
          <MobileNav currentPage={currentPage} onNavigate={setCurrentPage} needsCount={needsCount} />
          <CommandPalette onNavigate={(page) => setCurrentPage(page as Page)} />
        </div>
      </LoginGate>
    </TooltipProvider>
  );
}

export default App;
