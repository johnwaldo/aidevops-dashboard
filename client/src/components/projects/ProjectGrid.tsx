import { useState } from "react";
import { projectsMock } from "@/lib/mock-data";
import { ProjectCard } from "./ProjectCard";
import { cn } from "@/lib/utils";

const categories = ["All", ...new Set(projectsMock.map((p) => p.category))];

export function ProjectGrid() {
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? projectsMock : projectsMock.filter((p) => p.category === filter);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              filter === cat
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-[#71717a] border border-[#1e1e2e] hover:border-[#2e2e3e] hover:text-[#e4e4e7]"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </div>
    </div>
  );
}
