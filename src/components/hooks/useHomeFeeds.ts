/**
 * Custom hook for managing Home view data fetching
 * Handles parallel fetching of tutorials and articles with proper error handling
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  DifficultyLevel,
  ListTutorialsResponseDTO,
  ListArticlesResponseDTO,
  TutorialListItemDTO,
  ArticleListItemDTO,
  ApiErrorResponse,
} from "../../types";
import type {
  HomeViewMode,
  HomeFeedStateVM,
  HomeContentItemVM,
  HomeFeedErrorVM,
} from "../home/home.types";

interface UseHomeFeedsOptions {
  initialMode?: HomeViewMode;
  selectedLevel?: DifficultyLevel;
}

interface UseHomeFeedsReturn extends HomeFeedStateVM {
  refetchTutorials: () => void;
  refetchArticles: () => void;
  refetchAll: () => void;
}

/**
 * Helper: Check if content was created within the last N days
 */
function isCreatedWithinDays(createdAt: string, days: number): boolean {
  try {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  } catch {
    return false;
  }
}

/**
 * Helper: Map tutorial DTO to view model
 */
function mapTutorialToVM(
  dto: TutorialListItemDTO,
  mode: HomeViewMode
): HomeContentItemVM {
  return {
    type: "tutorial",
    id: dto.id,
    title: dto.title,
    summary: dto.summary,
    level: dto.level,
    difficultyWeight: dto.difficulty_weight,
    createdAt: dto.created_at,
    href: `/tutorials/${dto.id}`,
    category: dto.category,
    isNew: isCreatedWithinDays(dto.created_at, 7),
    isCompleted: mode === "authenticated" ? dto.is_completed : undefined,
  };
}

/**
 * Helper: Map article DTO to view model
 */
function mapArticleToVM(
  dto: ArticleListItemDTO,
  mode: HomeViewMode
): HomeContentItemVM {
  return {
    type: "article",
    id: dto.id,
    title: dto.title,
    summary: dto.summary,
    level: dto.level,
    difficultyWeight: dto.difficulty_weight,
    createdAt: dto.created_at,
    href: `/articles/${dto.id}`,
    isNew: isCreatedWithinDays(dto.created_at, 7),
    isCompleted: mode === "authenticated" ? dto.is_completed : undefined,
    completedAt: mode === "authenticated" ? dto.completed_at : undefined,
  };
}

/**
 * Helper: Parse API error response
 */
async function parseApiError(response: Response): Promise<HomeFeedErrorVM> {
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
 * Custom hook for fetching and managing Home feeds
 */
export function useHomeFeeds(options: UseHomeFeedsOptions = {}): UseHomeFeedsReturn {
  const { initialMode = "anonymous", selectedLevel } = options;

  // Determine mode based on selectedLevel availability
  const mode: HomeViewMode =
    selectedLevel && initialMode === "authenticated" ? "authenticated" : "anonymous";

  // State
  const [tutorials, setTutorials] = useState<HomeContentItemVM[]>([]);
  const [articles, setArticles] = useState<HomeContentItemVM[]>([]);
  const [isLoadingTutorials, setIsLoadingTutorials] = useState(true);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [tutorialsError, setTutorialsError] = useState<HomeFeedErrorVM | null>(null);
  const [articlesError, setArticlesError] = useState<HomeFeedErrorVM | null>(null);

  // Abort controllers for cleanup
  const tutorialsAbortRef = useRef<AbortController | null>(null);
  const articlesAbortRef = useRef<AbortController | null>(null);

  /**
   * Fetch tutorials from API
   */
  const fetchTutorials = useCallback(async () => {
    // Cancel any in-flight request
    tutorialsAbortRef.current?.abort();
    const abortController = new AbortController();
    tutorialsAbortRef.current = abortController;

    setIsLoadingTutorials(true);
    setTutorialsError(null);

    try {
      // Build query params based on mode
      const params = new URLSearchParams({
        limit: "5",
        page: "1",
        include_completed: mode === "authenticated" ? "true" : "false",
      });

      if (mode === "authenticated" && selectedLevel) {
        params.set("level", selectedLevel);
        params.set("sort", "difficulty_asc");
      } else {
        params.set("sort", "newest");
      }

      const response = await fetch(`/api/tutorials?${params.toString()}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await parseApiError(response);
        setTutorialsError(error);
        setTutorials([]);
        return;
      }

      const data = (await response.json()) as ListTutorialsResponseDTO;
      const mappedTutorials = data.tutorials.map((dto) => mapTutorialToVM(dto, mode));
      setTutorials(mappedTutorials);
      setTutorialsError(null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }

      setTutorialsError({
        kind: "network",
        message: "Couldn't load tutorials. Check your connection.",
      });
      setTutorials([]);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingTutorials(false);
      }
    }
  }, [mode, selectedLevel]);

  /**
   * Fetch articles from API
   */
  const fetchArticles = useCallback(async () => {
    // Cancel any in-flight request
    articlesAbortRef.current?.abort();
    const abortController = new AbortController();
    articlesAbortRef.current = abortController;

    setIsLoadingArticles(true);
    setArticlesError(null);

    try {
      // Build query params based on mode
      const params = new URLSearchParams({
        limit: "5",
        page: "1",
        include_completed: mode === "authenticated" ? "true" : "false",
      });

      if (mode === "authenticated" && selectedLevel) {
        params.set("level", selectedLevel);
        params.set("sort", "difficulty_asc");
      } else {
        params.set("sort", "newest");
      }

      const response = await fetch(`/api/articles?${params.toString()}`, {
        signal: abortController.signal,
      });

      if (!response.ok) {
        const error = await parseApiError(response);
        setArticlesError(error);
        setArticles([]);
        return;
      }

      const data = (await response.json()) as ListArticlesResponseDTO;
      const mappedArticles = data.articles.map((dto) => mapArticleToVM(dto, mode));
      setArticles(mappedArticles);
      setArticlesError(null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }

      setArticlesError({
        kind: "network",
        message: "Couldn't load articles. Check your connection.",
      });
      setArticles([]);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoadingArticles(false);
      }
    }
  }, [mode, selectedLevel]);

  /**
   * Refetch functions
   */
  const refetchTutorials = useCallback(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  const refetchArticles = useCallback(() => {
    fetchArticles();
  }, [fetchArticles]);

  const refetchAll = useCallback(() => {
    fetchTutorials();
    fetchArticles();
  }, [fetchTutorials, fetchArticles]);

  // Initial fetch on mount and when mode/selectedLevel changes
  useEffect(() => {
    fetchTutorials();
    fetchArticles();

    // Cleanup on unmount
    return () => {
      tutorialsAbortRef.current?.abort();
      articlesAbortRef.current?.abort();
    };
  }, [fetchTutorials, fetchArticles]);

  return {
    mode,
    selectedLevel,
    tutorials,
    articles,
    isLoadingTutorials,
    isLoadingArticles,
    tutorialsError,
    articlesError,
    refetchTutorials,
    refetchArticles,
    refetchAll,
  };
}
