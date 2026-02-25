import { LayoutDashboard, Kanban, HeartPulse, Bell, Coins, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Page } from "@/App";
import { useState } from "react";

interface MobileNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  needsCount: number;
}

const primaryTabs: { page: Page; label: string; icon: React.ElementType }[] = [
  { page: "overview", label: "Overview", icon: LayoutDashboard },
  { page: "kanban", label: "Kanban", icon: Kanban },
  { page: "health", label: "Health", icon: HeartPulse },
  { page: "needs", label: "Needs", icon: Bell },
  { page: "tokens", label: "Tokens", icon: Coins },
];

const overflowPages: { page: Page; label: string }[] = [
  { page: "projects", label: "Projects" },
  { page: "agents", label: "Agents" },
  { page: "documents", label: "Documents" },
  { page: "settings", label: "Settings" },
];

export function MobileNav({ currentPage, onNavigate, needsCount }: MobileNavProps) {
  const [showMore, setShowMore] = useState(false);

  const isOverflowPage = overflowPages.some((p) => p.page === currentPage);

  return (
    <>
      {/* Overflow menu */}
      {showMore && (
        <div className="fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 rounded-lg border border-[#1e1e2e] bg-[#111118] shadow-xl p-1"
            onClick={(e) => e.stopPropagation()}
          >
            {overflowPages.map(({ page, label }) => (
              <button
                key={page}
                onClick={() => {
                  onNavigate(page);
                  setShowMore(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors",
                  currentPage === page
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-[#e4e4e7] hover:bg-[#1e1e2e]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1e1e2e] bg-[#111118] md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-14 px-1">
          {primaryTabs.map(({ page, label, icon: Icon }) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors",
                currentPage === page
                  ? "text-cyan-400"
                  : "text-[#71717a]"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {page === "needs" && needsCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                    {needsCount > 99 ? "99+" : needsCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors",
              isOverflowPage ? "text-cyan-400" : "text-[#71717a]"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[9px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
