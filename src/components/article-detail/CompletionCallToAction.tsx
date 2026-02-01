/**
 * CompletionCallToAction - Interactive CTA for marking article as read
 * Authenticated-only component with idempotent behavior
 * Shows completion status and allows one-time marking as read
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import type { CompletionCallToActionProps, CompletionCTAStateVM } from "./article-detail.types";
import type { CompleteArticleResponseDTO, ApiErrorResponse } from "../../types";

export function CompletionCallToAction({
  articleId,
  isCompleted,
  completedAt,
  onCompleted,
}: CompletionCallToActionProps) {
  // Local state for submission
  const [state, setState] = useState<CompletionCTAStateVM>({
    isSubmitting: false,
    error: null,
  });

  /**
   * Format completion date for display
   */
  const formatCompletedDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  /**
   * Handle mark as read action
   */
  const handleMarkRead = useCallback(async () => {
    // Guard: Already completed
    if (isCompleted) {
      return;
    }

    setState({ isSubmitting: true, error: null });

    try {
      const response = await fetch(`/api/articles/${articleId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Handle non-OK responses
      if (!response.ok) {
        // 401 Unauthorized - redirect to login
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }

        // 404 Not Found - article no longer exists
        if (response.status === 404) {
          setState({
            isSubmitting: false,
            error: "This article no longer exists.",
          });
          return;
        }

        // 429 Rate Limit or 500 Server Error - show toast and keep button enabled
        if (response.status === 429 || response.status >= 500) {
          const errorMessage =
            response.status === 429
              ? "Too many requests. Please try again in a moment."
              : "Something went wrong. Please try again.";

          setState({
            isSubmitting: false,
            error: errorMessage,
          });

          // Show toast for transient errors
          toast.error(errorMessage);
          return;
        }

        // Other errors - parse API response
        try {
          const errorData = (await response.json()) as ApiErrorResponse;
          setState({
            isSubmitting: false,
            error: errorData.error.message,
          });
        } catch {
          setState({
            isSubmitting: false,
            error: "An unexpected error occurred.",
          });
        }
        return;
      }

      // Success - parse response
      const data = (await response.json()) as CompleteArticleResponseDTO;

      // Update parent state via callback
      onCompleted(data.completed_at);

      // Clear local error state
      setState({ isSubmitting: false, error: null });

      // Show success toast
      toast.success("Marked as read");
    } catch {
      // Network error
      const errorMessage = "Network error. Please check your connection.";
      setState({
        isSubmitting: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
    }
  }, [articleId, isCompleted, onCompleted]);

  return (
    <section aria-label="Completion" className="mt-8 space-y-4 rounded-lg border border-border bg-card p-6">
      {/* Status callout */}
      {isCompleted ? (
        // Completed state
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="font-semibold">Read</p>
            {completedAt && (
              <p className="text-sm text-muted-foreground">Completed on {formatCompletedDate(completedAt)}</p>
            )}
          </div>
        </div>
      ) : (
        // Not completed state
        <div className="space-y-2">
          <p className="text-sm text-foreground">Finished reading? Mark this article as read to track your progress.</p>
        </div>
      )}

      {/* Primary action button */}
      <div className="space-y-3">
        <Button
          onClick={handleMarkRead}
          disabled={state.isSubmitting || isCompleted}
          className="w-full sm:w-auto"
          aria-label={isCompleted ? "Already marked as read" : "Mark as read"}
        >
          {state.isSubmitting ? "Marking..." : isCompleted ? "Read" : "Mark as read"}
        </Button>

        {/* Inline error message */}
        {state.error && (
          <div
            role="alert"
            className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {state.error}
          </div>
        )}
      </div>
    </section>
  );
}
