/**
 * Custom hook for fetching and managing tutorial detail data
 * Handles loading states, errors, UUID validation, and DTO-to-VM mapping
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { GetTutorialDetailResponseDTO, ApiErrorResponse, TutorialStep } from "../../types";
import type {
  TutorialDetailVM,
  TutorialDetailErrorVM,
  TutorialHeaderVM,
  TutorialSectionsVM,
  TutorialStepVM,
  TutorialCompletionVM,
} from "./tutorial-detail.types";
import {
  isUuid,
  formatCategory,
  formatLevel,
  formatDifficultyLabel,
  formatCreatedAtLabel,
} from "./tutorial-detail.types";

interface UseTutorialDetailOptions {
  tutorialId: string;
  isAuthenticated: boolean;
}

interface UseTutorialDetailReturn {
  data: TutorialDetailVM | null;
  isLoading: boolean;
  error: TutorialDetailErrorVM | null;
  isNotFound: boolean;
  retry: () => void;
}

/**
 * Parse API error response
 */
async function parseApiError(response: Response): Promise<TutorialDetailErrorVM> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return {
      kind: "http",
      status: response.status,
      message: data.error.message,
      api: data,
    };
  } catch {
    return {
      kind: "http",
      status: response.status,
      message: `Request failed with status ${response.status}`,
    };
  }
}

/**
 * Map tutorial DTO to view model
 */
function mapDtoToVM(dto: GetTutorialDetailResponseDTO, isAuthenticated: boolean): TutorialDetailVM {
  // Map header
  const header: TutorialHeaderVM = {
    title: dto.title,
    categoryLabel: formatCategory(dto.category),
    levelLabel: formatLevel(dto.level),
    difficultyLabel: formatDifficultyLabel(dto.difficulty_weight),
    createdAtLabel: formatCreatedAtLabel(dto.created_at),
  };

  // Sort steps by order ascending and map to VM
  const sortedSteps = [...dto.steps].sort((a, b) => a.order - b.order);
  const stepVMs: TutorialStepVM[] = sortedSteps.map((step: TutorialStep) => ({
    order: step.order,
    title: step.title,
    content: step.content,
  }));

  // Map sections
  const sections: TutorialSectionsVM = {
    summary: dto.summary,
    content: dto.content,
    steps: stepVMs,
    practiceRecommendations: dto.practice_recommendations,
    keyTakeaways: dto.key_takeaways,
  };

  // Map completion (only for authenticated users)
  let completion: TutorialCompletionVM | undefined = undefined;
  if (isAuthenticated) {
    completion = {
      isCompleted: dto.is_completed,
      completedAt: dto.completed_at,
    };
  }

  return {
    id: dto.id,
    header,
    sections,
    completion,
  };
}

/**
 * Custom hook for fetching tutorial detail
 */
export function useTutorialDetail(options: UseTutorialDetailOptions): UseTutorialDetailReturn {
  const { tutorialId, isAuthenticated } = options;

  // Data state
  const [data, setData] = useState<TutorialDetailVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<TutorialDetailErrorVM | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch tutorial detail from API
   */
  const fetchDetail = useCallback(async () => {
    // Pre-validate UUID to avoid unnecessary API call
    if (!isUuid(tutorialId)) {
      setIsLoading(false);
      setIsNotFound(true);
      setError(null);
      setData(null);
      return;
    }

    // Cancel any in-flight request
    abortControllerRef.current?.abort();

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);
    setIsNotFound(false);

    try {
      const response = await fetch(`/api/tutorials/${tutorialId}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        // Handle 404 or 400 (invalid UUID) as not found
        if (response.status === 404 || response.status === 400) {
          setIsNotFound(true);
          setData(null);
          setError(null);
        } else {
          // Handle other errors (500, network, etc.)
          const errorData = await parseApiError(response);
          setError(errorData);
          setData(null);
          setIsNotFound(false);
        }
        return;
      }

      // Success - parse and map to VM
      const dto = (await response.json()) as GetTutorialDetailResponseDTO;
      const vm = mapDtoToVM(dto, isAuthenticated);

      setData(vm);
      setError(null);
      setIsNotFound(false);
    } catch (err) {
      // Handle abort and network errors
      if (err instanceof Error && err.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }

      // Network error
      setError({
        kind: "network",
        message: "Couldn't load tutorial. Check your connection.",
      });
      setData(null);
      setIsNotFound(false);
    } finally {
      setIsLoading(false);
    }
  }, [tutorialId, isAuthenticated]);

  /**
   * Retry fetching data
   */
  const retry = useCallback(() => {
    fetchDetail();
  }, [fetchDetail]);

  /**
   * Fetch data on mount and when dependencies change
   */
  useEffect(() => {
    fetchDetail();

    // Cleanup on unmount
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchDetail]);

  return {
    data,
    isLoading,
    error,
    isNotFound,
    retry,
  };
}
