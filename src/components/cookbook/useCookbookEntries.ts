/**
 * useCookbookEntries - Custom hook for fetching cookbook entry list
 * Handles pagination, sorting, and error states
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ListCookbookEntriesResponseDTO, ApiErrorResponse } from '@/types';
import { toListVM } from './cookbook.types';
import type {
  CookbookListVM,
  CookbookListErrorVM,
  CookbookSort,
} from './cookbook.types';

interface UseCookbookEntriesParams {
  sort?: CookbookSort;
  page?: number;
  limit?: number;
}

interface UseCookbookEntriesResult {
  data: CookbookListVM | null;
  isLoading: boolean;
  error: CookbookListErrorVM | null;
  setSort: (next: CookbookSort) => void;
  goPrev: () => void;
  goNext: () => void;
  retry: () => void;
}

/**
 * Parse API error response
 */
async function parseApiError(response: Response): Promise<CookbookListErrorVM> {
  try {
    const data = (await response.json()) as ApiErrorResponse;
    return {
      kind: 'http',
      status: response.status,
      message: data.error.message,
      api: data,
    };
  } catch {
    return {
      kind: 'http',
      status: response.status,
      message: `Request failed with status ${response.status}`,
    };
  }
}

export default function useCookbookEntries({
  sort = 'newest',
  page = 1,
  limit = 20,
}: UseCookbookEntriesParams = {}): UseCookbookEntriesResult {
  const [data, setData] = useState<CookbookListVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CookbookListErrorVM | null>(null);
  const [currentSort, setCurrentSort] = useState<CookbookSort>(sort);
  const [currentPage, setCurrentPage] = useState(page);

  // Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch cookbook entries from API
   */
  const fetchEntries = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();

    // Create new abort controller
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({
        sort: currentSort,
        page: String(currentPage),
        limit: String(limit),
      });

      const response = await fetch(`/api/cookbook?${params.toString()}`, {
        signal: abortController.signal,
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await parseApiError(response);
        setError(errorData);
        setData(null);
        return;
      }

      // Success - parse and map to VM
      const dto = (await response.json()) as ListCookbookEntriesResponseDTO;
      const vm = toListVM(dto);

      setData(vm);
      setError(null);
    } catch (err) {
      // Handle abort and network errors
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }

      // Network error
      setError({
        kind: 'network',
        message: "Couldn't load cookbook entries. Check your connection.",
      });
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentSort, currentPage, limit]);

  /**
   * Set sort and reset to page 1
   */
  const setSort = useCallback((next: CookbookSort) => {
    setCurrentSort(next);
    setCurrentPage(1);
  }, []);

  /**
   * Go to previous page
   */
  const goPrev = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  /**
   * Go to next page
   */
  const goNext = useCallback(() => {
    setCurrentPage((prev) => {
      if (data && prev < data.pagination.totalPages) {
        return prev + 1;
      }
      return prev;
    });
  }, [data]);

  /**
   * Retry current request
   */
  const retry = useCallback(() => {
    fetchEntries();
  }, [fetchEntries]);

  /**
   * Fetch data on mount and when dependencies change
   */
  useEffect(() => {
    fetchEntries();

    // Cleanup on unmount
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchEntries]);

  return {
    data,
    isLoading,
    error,
    setSort,
    goPrev,
    goNext,
    retry,
  };
}
