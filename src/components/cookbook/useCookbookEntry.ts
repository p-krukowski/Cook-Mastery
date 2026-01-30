/**
 * useCookbookEntry - Custom hook for fetching single cookbook entry
 * Handles UUID validation, not-found states, and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GetCookbookEntryResponseDTO, ApiErrorResponse } from '@/types';
import { isUuid, toDetailVM } from './cookbook.types';
import type { CookbookEntryDetailVM, CookbookEntryErrorVM } from './cookbook.types';

interface UseCookbookEntryParams {
  entryId: string;
}

interface UseCookbookEntryResult {
  data: CookbookEntryDetailVM | null;
  isLoading: boolean;
  error: CookbookEntryErrorVM | null;
  isNotFound: boolean;
  retry: () => void;
}

/**
 * Parse API error response
 */
async function parseApiError(response: Response): Promise<CookbookEntryErrorVM> {
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

export default function useCookbookEntry({
  entryId,
}: UseCookbookEntryParams): UseCookbookEntryResult {
  const [data, setData] = useState<CookbookEntryDetailVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<CookbookEntryErrorVM | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  // Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch entry detail from API
   */
  const fetchEntry = useCallback(async () => {
    // Pre-validate UUID to avoid unnecessary API call
    if (!isUuid(entryId)) {
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
      const response = await fetch(`/api/cookbook/${entryId}`, {
        signal: abortController.signal,
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

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
      const dto = (await response.json()) as GetCookbookEntryResponseDTO;
      const vm = toDetailVM(dto);

      setData(vm);
      setError(null);
      setIsNotFound(false);
    } catch (err) {
      // Handle abort and network errors
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }

      // Network error
      setError({
        kind: 'network',
        message: "Couldn't load entry. Check your connection.",
      });
      setData(null);
      setIsNotFound(false);
    } finally {
      setIsLoading(false);
    }
  }, [entryId]);

  /**
   * Retry fetching data
   */
  const retry = useCallback(() => {
    fetchEntry();
  }, [fetchEntry]);

  /**
   * Fetch data on mount and when dependencies change
   */
  useEffect(() => {
    fetchEntry();

    // Cleanup on unmount
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchEntry]);

  return {
    data,
    isLoading,
    error,
    isNotFound,
    retry,
  };
}
