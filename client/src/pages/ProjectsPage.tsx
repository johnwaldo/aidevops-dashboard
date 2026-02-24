import { ProjectGrid } from "@/components/projects/ProjectGrid";

export function ProjectsPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold font-[Plus_Jakarta_Sans]">Projects</h1>
        <p className="text-sm text-[#71717a] mt-1">All repositories and project status.</p>
      </div>
      <ProjectGrid />
    </div>
  );
}
