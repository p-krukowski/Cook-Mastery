/**
 * Custom hook for managing Learning view data fetching
 * Handles aggregated (all) and single-type (tutorials/articles) modes
 * with pagination, filtering, and proper error handling
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
import type { ContentCardItemVM } from "../content/content.types";
import type {
  LearningTypeFilter,
  LearningLevelFilter,
  LearningFeedErrorVM,
  LearningPaginationVM,
} from "../learning/learning.types";

interface UseLearningFeedOptions {
  isAuthenticated: boolean;
  userSelectedLevel?: DifficultyLevel;
  initialLevelFilter: LearningLevelFilter;
  initialTypeFilter?: LearningTypeFilter;
}

interface UseLearningFeedReturn {
  type: LearningTypeFilter;
  level: LearningLevelFilter;
  page: number;
  items: ContentCardItemVM[];
  pagination: LearningPaginationVM;
  isLoading: boolean;
  error: LearningFeedErrorVM | null;
  setType: (nextType: LearningTypeFilter) => void;
  setLevel: (nextLevel: LearningLevelFilter) => void;
  goPrev: () => void;
  goNext: () => void;
  retry: () => void;
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
function mapTutorialToVM(dto: TutorialListItemDTO, isAuthenticated: boolean): ContentCardItemVM {
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
    isCompleted: isAuthenticated ? dto.is_completed : undefined,
  };
}

/**
 * Helper: Map article DTO to view model
 */
function mapArticleToVM(dto: ArticleListItemDTO, isAuthenticated: boolean): ContentCardItemVM {
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
    isCompleted: isAuthenticated ? dto.is_completed : undefined,
    completedAt: isAuthenticated ? dto.completed_at : undefined,
  };
}

/**
 * Helper: Parse API error response
 */
async function parseApiError(response: Response): Promise<LearningFeedErrorVM> {
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
 * Helper: Build query params for API requests
 */
function buildQueryParams(
  page: number,
  limit: number,
  level: LearningLevelFilter,
  isAuthenticated: boolean
): URLSearchParams {
  const params = new URLSearchParams({
    limit: String(limit),
    page: String(page),
    sort: "newest",
    include_completed: isAuthenticated ? "true" : "false",
  });

  // Only add level if it's not "ALL"
  if (level !== "ALL") {
    params.set("level", level);
  }

  return params;
}

/**
 * Custom hook for fetching and managing Learning feed
 */
export function useLearningFeed(options: UseLearningFeedOptions): UseLearningFeedReturn {
  const { isAuthenticated, initialLevelFilter, initialTypeFilter = "all" } = options;

  // Filter state
  const [type, setTypeState] = useState<LearningTypeFilter>(initialTypeFilter);
  const [level, setLevelState] = useState<LearningLevelFilter>(initialLevelFilter);
  const [page, setPage] = useState(1);

  // Data state
  const [items, setItems] = useState<ContentCardItemVM[]>([]);
  const [pagination, setPagination] = useState<LearningPaginationVM>({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    pageSize: 10,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LearningFeedErrorVM | null>(null);

  // Abort controllers for cleanup
  const tutorialsAbortRef = useRef<AbortController | null>(null);
  const articlesAbortRef = useRef<AbortController | null>(null);

  /**
   * Fetch tutorials from API
   */
  const fetchTutorials = useCallback(
    async (currentPage: number, limit: number, signal: AbortSignal) => {
      const params = buildQueryParams(currentPage, limit, level, isAuthenticated);
      const response = await fetch(`/api/tutorials?${params.toString()}`, { signal });

      if (!response.ok) {
        throw await parseApiError(response);
      }

      return (await response.json()) as ListTutorialsResponseDTO;
    },
    [level, isAuthenticated]
  );

  /**
   * Fetch articles from API
   */
  const fetchArticles = useCallback(
    async (currentPage: number, limit: number, signal: AbortSignal) => {
      const params = buildQueryParams(currentPage, limit, level, isAuthenticated);
      const response = await fetch(`/api/articles?${params.toString()}`, { signal });

      if (!response.ok) {
        throw await parseApiError(response);
      }

      return (await response.json()) as ListArticlesResponseDTO;
    },
    [level, isAuthenticated]
  );

  /**
   * Fetch data based on current type filter
   */
  const fetchData = useCallback(async () => {
    // Cancel any in-flight requests
    tutorialsAbortRef.current?.abort();
    articlesAbortRef.current?.abort();

    setIsLoading(true);
    setError(null);

    try {
      if (type === "all") {
        // Aggregated mode: fetch both in parallel
        const tutorialsAbort = new AbortController();
        const articlesAbort = new AbortController();
        tutorialsAbortRef.current = tutorialsAbort;
        articlesAbortRef.current = articlesAbort;

        const [tutorialsData, articlesData] = await Promise.all([
          fetchTutorials(page, 5, tutorialsAbort.signal),
          fetchArticles(page, 5, articlesAbort.signal),
        ]);

        // Map to view models
        const tutorialItems = tutorialsData.tutorials.map((dto) => mapTutorialToVM(dto, isAuthenticated));
        const articleItems = articlesData.articles.map((dto) => mapArticleToVM(dto, isAuthenticated));

        // Merge and sort by createdAt desc
        const combined = [...tutorialItems, ...articleItems].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Take first 10 items
        const displayItems = combined.slice(0, 10);

        // Compute combined pagination
        const combinedTotalItems = tutorialsData.pagination.total_items + articlesData.pagination.total_items;
        const combinedPageSize = 10;
        const combinedTotalPages = Math.ceil(combinedTotalItems / combinedPageSize);

        setItems(displayItems);
        setPagination({
          page,
          totalPages: Math.max(combinedTotalPages, 1),
          totalItems: combinedTotalItems,
          pageSize: combinedPageSize,
        });
      } else {
        // Single type mode
        const abortController = new AbortController();
        tutorialsAbortRef.current = abortController;

        let data: ListTutorialsResponseDTO | ListArticlesResponseDTO;
        let mappedItems: ContentCardItemVM[];

        if (type === "tutorials") {
          data = await fetchTutorials(page, 10, abortController.signal);
          mappedItems = data.tutorials.map((dto) => mapTutorialToVM(dto, isAuthenticated));
        } else {
          data = await fetchArticles(page, 10, abortController.signal);
          mappedItems = data.articles.map((dto) => mapArticleToVM(dto, isAuthenticated));
        }

        setItems(mappedItems);
        setPagination({
          page,
          totalPages: Math.max(data.pagination.total_pages, 1),
          totalItems: data.pagination.total_items,
          pageSize: 10,
        });
      }

      setError(null);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Request was cancelled, ignore
        return;
      }

      if (typeof err === "object" && err !== null && "kind" in err) {
        setError(err as LearningFeedErrorVM);
      } else {
        setError({
          kind: "network",
          message: "Couldn't load learning content. Check your connection.",
        });
      }
      setItems([]);
      setPagination({
        page: 1,
        totalPages: 1,
        totalItems: 0,
        pageSize: 10,
      });
    } finally {
      setIsLoading(false);
    }
  }, [type, page, isAuthenticated, fetchTutorials, fetchArticles]);

  /**
   * Set type filter and reset to page 1
   */
  const setType = useCallback((nextType: LearningTypeFilter) => {
    setTypeState(nextType);
    setPage(1);
  }, []);

  /**
   * Set level filter and reset to page 1
   */
  const setLevel = useCallback((nextLevel: LearningLevelFilter) => {
    setLevelState(nextLevel);
    setPage(1);
  }, []);

  /**
   * Go to previous page
   */
  const goPrev = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  /**
   * Go to next page
   */
  const goNext = useCallback(() => {
    setPage((prev) => Math.min(pagination.totalPages, prev + 1));
  }, [pagination.totalPages]);

  /**
   * Retry current request
   */
  const retry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();

    // Cleanup on unmount
    return () => {
      tutorialsAbortRef.current?.abort();
      articlesAbortRef.current?.abort();
    };
  }, [fetchData]);

  return {
    type,
    level,
    page,
    items,
    pagination,
    isLoading,
    error,
    setType,
    setLevel,
    goPrev,
    goNext,
    retry,
  };
}
