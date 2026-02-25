import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { LoginGate } from "@/components/auth/LoginGate";
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

  return (
    <TooltipProvider>
      <LoginGate>
        <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-[#e4e4e7] font-[Plus_Jakarta_Sans]">
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto">
              <PageComponent />
            </main>
          </div>
          <CommandPalette onNavigate={(page) => setCurrentPage(page as Page)} />
        </div>
      </LoginGate>
    </TooltipProvider>
  );
}

export default App;
