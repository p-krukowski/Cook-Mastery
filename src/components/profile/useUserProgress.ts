/**
 * Custom hook for fetching user progress summary
 */

import { useState, useEffect, useCallback } from "react";
import type { UserProgressSummaryDTO, ApiErrorResponse } from "../../types";
import type { ProfileProgressVM } from "./profile.types";

interface UseUserProgressOptions {
  enabled?: boolean;
  initialData?: UserProgressSummaryDTO;
}

interface UseUserProgressResult {
  data: ProfileProgressVM | null;
  isLoading: boolean;
  error: string | null;
  retry(): void;
}

/**
 * Transform UserProgressSummaryDTO to ProfileProgressVM for the selected level
 */
function transformToProgressVM(summary: UserProgressSummaryDTO): ProfileProgressVM | null {
  // Find progress for the selected level
  const levelProgress = summary.level_progress.find((lp) => lp.level === summary.selected_level);

  if (!levelProgress) {
    return null;
  }

  return {
    selectedLevel: summary.selected_level,
    completionPercent: levelProgress.completion_percent,
    isUpToDate: levelProgress.is_up_to_date,
    isEligibleToAdvance: summary.can_advance,
    totalCount: levelProgress.total_count,
    completedCount: levelProgress.completed_count,
    emptyState: levelProgress.total_count === 0,
  };
}

/**
 * Hook to fetch and manage user progress summary
 *
 * @param options - Configuration options
 * @returns Progress data, loading state, error state, and retry function
 */
export function useUserProgress(options: UseUserProgressOptions = {}): UseUserProgressResult {
  const { enabled = true, initialData } = options;

  const [data, setData] = useState<ProfileProgressVM | null>(initialData ? transformToProgressVM(initialData) : null);
  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const fetchProgress = useCallback(async () => {
    // Skip if disabled
    if (!enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/progress/summary");

      // Handle 401 - session expired
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        setError(errorData.error.message || "Failed to load progress");
        return;
      }

      // Success - transform and set data
      const summary = (await response.json()) as UserProgressSummaryDTO;
      const progressVM = transformToProgressVM(summary);
      setData(progressVM);
    } catch {
      // Network error
      setError("Couldn't load progress. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  // Fetch on mount and when refetch is triggered
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress, refetchTrigger]);

  // Retry function
  const retry = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  return {
    data,
    isLoading,
    error,
    retry,
  };
}
