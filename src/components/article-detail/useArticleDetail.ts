/**
 * Custom hook for fetching and managing article detail data
 * Handles loading states, errors, UUID validation, and DTO-to-VM mapping
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  GetArticleDetailResponseDTO,
  ApiErrorResponse,
} from "../../types";
import type {
  ArticleDetailVM,
  ArticleDetailErrorVM,
  ArticleHeaderVM,
  ArticleSectionsVM,
  ArticleCompletionVM,
} from "./article-detail.types";
import {
  isUuid,
  formatLevel,
  formatDifficultyLabel,
  formatCreatedAtLabel,
} from "./article-detail.types";

interface UseArticleDetailOptions {
  articleId: string;
  isAuthenticated: boolean;
}

interface UseArticleDetailReturn {
  data: ArticleDetailVM | null;
  isLoading: boolean;
  error: ArticleDetailErrorVM | null;
  isNotFound: boolean;
  retry: () => void;
}

/**
 * Parse API error response
 */
async function parseApiError(response: Response): Promise<ArticleDetailErrorVM> {
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
 * Map article DTO to view model
 */
function mapDtoToVM(
  dto: GetArticleDetailResponseDTO,
  isAuthenticated: boolean
): ArticleDetailVM {
  // Map header
  const header: ArticleHeaderVM = {
    title: dto.title,
    levelLabel: formatLevel(dto.level),
    difficultyLabel: formatDifficultyLabel(dto.difficulty_weight),
    createdAtLabel: formatCreatedAtLabel(dto.created_at),
  };

  // Map sections
  const sections: ArticleSectionsVM = {
    summary: dto.summary,
    content: dto.content,
    keyTakeaways: dto.key_takeaways,
  };

  // Map completion (only for authenticated users)
  let completion: ArticleCompletionVM | undefined = undefined;
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
 * Custom hook for fetching article detail
 */
export function useArticleDetail(
  options: UseArticleDetailOptions
): UseArticleDetailReturn {
  const { articleId, isAuthenticated } = options;

  // Data state
  const [data, setData] = useState<ArticleDetailVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ArticleDetailErrorVM | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch article detail from API
   */
  const fetchDetail = useCallback(async () => {
    // Pre-validate UUID to avoid unnecessary API call
    if (!isUuid(articleId)) {
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
      const response = await fetch(`/api/articles/${articleId}`, {
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
      const dto = (await response.json()) as GetArticleDetailResponseDTO;
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
        message: "Couldn't load article. Check your connection.",
      });
      setData(null);
      setIsNotFound(false);
    } finally {
      setIsLoading(false);
    }
  }, [articleId, isAuthenticated]);

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
