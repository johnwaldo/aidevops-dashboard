import { useApiData } from "@/hooks/useApiData";
import { ProjectCard } from "./ProjectCard";
import { LoadingPanel, EmptyState } from "@/components/shared/LoadingPanel";

interface Project {
  name: string;
  description: string;
  url: string;
  platform: string;
  branch: string;
  lastCommit: { sha: string; message: string; author: string; time: string };
  ci: string;
  issues: number;
  prs: number;
  language: string;
  visibility: string;
  updatedAt: string;
}

export function ProjectGrid() {
  const { data: projects, loading, error, refresh } = useApiData<Project[]>("projects");

  return (
    <LoadingPanel loading={loading} error={error} onRetry={refresh}>
      {!projects || projects.length === 0 ? (
        <EmptyState message="No projects found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}
    </LoadingPanel>
  );
}
