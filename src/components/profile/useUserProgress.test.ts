/**
 * Unit tests for useUserProgress hook
 * Tests business rules, edge cases, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { UserProgressSummaryDTO, ApiErrorResponse } from '../../types';
import { useUserProgress } from './useUserProgress';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const originalLocation = window.location;
delete (window as any).location;
window.location = { ...originalLocation, href: '' } as Location;

describe('useUserProgress', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    window.location.href = '';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('transformToProgressVM', () => {
    it('should transform valid summary to progress VM', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'BEGINNER',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 10,
            completed_count: 5,
            completion_percent: 50,
            is_up_to_date: false,
          },
        ],
        can_advance: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        selectedLevel: 'BEGINNER',
        completionPercent: 50,
        isUpToDate: false,
        isEligibleToAdvance: false,
        totalCount: 10,
        completedCount: 5,
        emptyState: false,
      });
    });

    it('should set emptyState to true when total count is zero', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'BEGINNER',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 0,
            completed_count: 0,
            completion_percent: 0,
            is_up_to_date: false,
          },
        ],
        can_advance: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.emptyState).toBe(true);
      expect(result.current.data?.totalCount).toBe(0);
      expect(result.current.data?.completedCount).toBe(0);
    });

    it('should return null when no matching level progress found', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'INTERMEDIATE',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 10,
            completed_count: 5,
            completion_percent: 50,
            is_up_to_date: false,
          },
        ],
        can_advance: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('should correctly map all DTO fields to VM fields', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'EXPERIENCED',
        level_progress: [
          {
            level: 'EXPERIENCED',
            total_count: 20,
            completed_count: 18,
            completion_percent: 90,
            is_up_to_date: true,
          },
        ],
        can_advance: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        selectedLevel: 'EXPERIENCED',
        completionPercent: 90,
        isUpToDate: true,
        isEligibleToAdvance: false,
        totalCount: 20,
        completedCount: 18,
        emptyState: false,
      });
    });
  });

  describe('hook initialization', () => {
    it('should start with loading state when no initial data provided', () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      );

      const { result } = renderHook(() => useUserProgress());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should use initial data and skip loading state', async () => {
      const initialData: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'BEGINNER',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 10,
            completed_count: 5,
            completion_percent: 50,
            is_up_to_date: false,
          },
        ],
        can_advance: false,
      };

      // Mock successful fetch for the automatic refetch on mount
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => initialData,
      });

      const { result } = renderHook(() =>
        useUserProgress({ initialData })
      );

      // Initial data should be set immediately
      expect(result.current.data).toEqual({
        selectedLevel: 'BEGINNER',
        completionPercent: 50,
        isUpToDate: false,
        isEligibleToAdvance: false,
        totalCount: 10,
        completedCount: 5,
        emptyState: false,
      });

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fetch should still be called on mount
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not fetch when disabled', async () => {
      const { result } = renderHook(() =>
        useUserProgress({ enabled: false })
      );

      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('API error handling', () => {
    it('should redirect to login on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }),
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(window.location.href).toBe('/login');
      expect(result.current.error).toBeNull();
      expect(result.current.data).toBeNull();
    });

    it('should set error message on 400 bad request', async () => {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Invalid request parameters');
      expect(result.current.data).toBeNull();
    });

    it('should set error message on 500 internal server error', async () => {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Something went wrong',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Something went wrong');
      expect(result.current.data).toBeNull();
    });

    it('should use fallback message when error message is missing', async () => {
      const errorResponse: ApiErrorResponse = {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load progress');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(
        "Couldn't load progress. Check your connection."
      );
      expect(result.current.data).toBeNull();
    });

    it('should handle fetch timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(
        "Couldn't load progress. Check your connection."
      );
    });
  });

  describe('retry functionality', () => {
    it('should retry after error', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'BEGINNER',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 10,
            completed_count: 5,
            completion_percent: 50,
            is_up_to_date: false,
          },
        ],
        can_advance: false,
      };

      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(
        "Couldn't load progress. Check your connection."
      );

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      result.current.retry();

      // Wait for retry to complete successfully
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).not.toBeNull();
      expect(result.current.data?.completionPercent).toBe(50);
    });

    it('should clear error on retry', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      const errorBeforeRetry = result.current.error;
      expect(errorBeforeRetry).toBe(
        "Couldn't load progress. Check your connection."
      );

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user_id: 'user-123',
          selected_level: 'BEGINNER',
          level_progress: [
            {
              level: 'BEGINNER',
              total_count: 10,
              completed_count: 5,
              completion_percent: 50,
              is_up_to_date: false,
            },
          ],
          can_advance: false,
        }),
      });

      result.current.retry();

      // Wait for the fetch to complete and error to be cleared
      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.data).not.toBeNull();
    });

    it('should handle multiple retry calls', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'BEGINNER',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 10,
            completed_count: 5,
            completion_percent: 50,
            is_up_to_date: false,
          },
        ],
        can_advance: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockFetch.mock.calls.length;

      result.current.retry();

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBe(callCount + 1);
      });

      result.current.retry();

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBe(callCount + 2);
      });

      expect(result.current.data).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty level_progress array', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'BEGINNER',
        level_progress: [],
        can_advance: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeNull();
    });

    it('should handle multiple levels with correct selected level', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'INTERMEDIATE',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 10,
            completed_count: 10,
            completion_percent: 100,
            is_up_to_date: true,
          },
          {
            level: 'INTERMEDIATE',
            total_count: 15,
            completed_count: 7,
            completion_percent: 47,
            is_up_to_date: false,
          },
          {
            level: 'EXPERIENCED',
            total_count: 20,
            completed_count: 0,
            completion_percent: 0,
            is_up_to_date: false,
          },
        ],
        can_advance: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.selectedLevel).toBe('INTERMEDIATE');
      expect(result.current.data?.completionPercent).toBe(47);
      expect(result.current.data?.totalCount).toBe(15);
      expect(result.current.data?.completedCount).toBe(7);
    });

    it('should handle 100% completion', async () => {
      const mockSummary: UserProgressSummaryDTO = {
        user_id: 'user-123',
        selected_level: 'BEGINNER',
        level_progress: [
          {
            level: 'BEGINNER',
            total_count: 10,
            completed_count: 10,
            completion_percent: 100,
            is_up_to_date: true,
          },
        ],
        can_advance: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSummary,
      });

      const { result } = renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data?.completionPercent).toBe(100);
      expect(result.current.data?.isUpToDate).toBe(true);
      expect(result.current.data?.isEligibleToAdvance).toBe(true);
    });

    it('should not fetch when re-enabled from disabled state', async () => {
      const { rerender } = renderHook(
        ({ enabled }) => useUserProgress({ enabled }),
        { initialProps: { enabled: false } }
      );

      expect(mockFetch).not.toHaveBeenCalled();

      // Re-rendering with enabled: true should trigger fetch
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user_id: 'user-123',
          selected_level: 'BEGINNER',
          level_progress: [
            {
              level: 'BEGINNER',
              total_count: 10,
              completed_count: 5,
              completion_percent: 50,
              is_up_to_date: false,
            },
          ],
          can_advance: false,
        }),
      });

      rerender({ enabled: true });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('API integration', () => {
    it('should call correct API endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user_id: 'user-123',
          selected_level: 'BEGINNER',
          level_progress: [],
          can_advance: false,
        }),
      });

      renderHook(() => useUserProgress());

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/progress/summary');
      });
    });

    it('should maintain loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useUserProgress());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
      expect(result.current.error).toBeNull();

      resolvePromise!({
        ok: true,
        status: 200,
        json: async () => ({
          user_id: 'user-123',
          selected_level: 'BEGINNER',
          level_progress: [
            {
              level: 'BEGINNER',
              total_count: 10,
              completed_count: 5,
              completion_percent: 50,
              is_up_to_date: false,
            },
          ],
          can_advance: false,
        }),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).not.toBeNull();
    });
  });
});
