import { collectGitProjects } from "../collectors/git-collector";
import { cacheGet, cacheSet, CACHE_TTL } from "../cache/store";
import { apiResponse, apiError } from "./_helpers";

export async function handleProjects(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const nameFilter = url.searchParams.get("name");

  const cacheKey = "projects";
  const cached = cacheGet<ReturnType<typeof collectGitProjects> extends Promise<infer T> ? T : never>(cacheKey);

  if (cached && !nameFilter) {
    return apiResponse(cached.data, "cache", cached.ttl, true);
  }

  try {
    const projects = cached ? cached.data : await collectGitProjects();
    if (!cached) {
      cacheSet(cacheKey, projects, CACHE_TTL.projects);
    }

    if (nameFilter) {
      const filtered = projects.filter((p) => p.name === nameFilter);
      if (filtered.length === 0) {
        return apiError("NOT_FOUND", `Project '${nameFilter}' not found`, "projects", 404);
      }
      return apiResponse(filtered[0], "api", CACHE_TTL.projects);
    }

    return apiResponse(projects, "api", CACHE_TTL.projects);
  } catch (err) {
    return apiError("GITHUB_ERROR", String(err), "projects");
  }
}
