import { useState, useEffect, useCallback } from "react";
import { useApiData } from "./useApiData";
import { useAction } from "./useAction";

export interface TrackedRepo {
  name: string;
  path: string;
  enabled: boolean;
}

const STORAGE_KEY = "dashboard-selected-repo";

/**
 * Hook for managing tracked repos and the currently selected repo filter.
 * Selected repo is persisted in localStorage.
 * "all" means show tasks from all enabled repos (merged view).
 */
export function useRepos() {
  const { data: repos, loading, error, refresh } = useApiData<TrackedRepo[]>("repos", 60);
  const [selectedRepo, setSelectedRepo] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? "all";
  });

  const syncAction = useAction({
    endpoint: "/api/actions/repos/sync",
    onSuccess: () => refresh(),
  });

  const toggleAction = useAction({
    endpoint: "/api/actions/repos/toggle",
    onSuccess: () => refresh(),
  });

  // Persist selection
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, selectedRepo);
  }, [selectedRepo]);

  const syncRepos = useCallback(async () => {
    await syncAction.execute({});
  }, [syncAction]);

  const toggleRepo = useCallback(
    async (name: string, enabled: boolean) => {
      await toggleAction.execute({ name, enabled });
    },
    [toggleAction],
  );

  // Enabled repos only
  const enabledRepos = repos?.filter((r) => r.enabled) ?? [];

  return {
    repos: repos ?? [],
    enabledRepos,
    loading,
    error,
    refresh,
    selectedRepo,
    setSelectedRepo,
    syncRepos,
    syncLoading: syncAction.loading,
    toggleRepo,
    toggleLoading: toggleAction.loading,
  };
}
