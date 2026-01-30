/**
 * ProgressPanel component
 * Displays user progress for the currently selected learning level
 */

import { Button } from '../ui/button';
import type { ProfileProgressVM } from './profile.types';

interface ProgressPanelProps {
  isLoading: boolean;
  error?: string;
  progress?: ProfileProgressVM;
  onRetry?(): void;
}

/**
 * Format level for display
 */
function formatLevel(level: string): string {
  return level.charAt(0) + level.slice(1).toLowerCase();
}

/**
 * ProgressPanel component
 * Shows completion percentage, status, and advancement eligibility
 */
export function ProgressPanel({ isLoading, error, progress, onRetry }: ProgressPanelProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold">Progress</h2>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted"></div>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="space-y-4">
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Success state with data */}
      {!isLoading && !error && progress && (
        <div className="space-y-4">
          {/* Empty state - no content at this level */}
          {progress.emptyState ? (
            <div className="text-sm text-muted-foreground">
              <p>No content available for {formatLevel(progress.selectedLevel)} level yet.</p>
              <p className="mt-2">
                Progress tracking will appear here once content is added to this level.
              </p>
            </div>
          ) : (
            <>
              {/* Completion percentage */}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {formatLevel(progress.selectedLevel)} Level Completion
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-3xl font-bold">{Math.round(progress.completionPercent)}%</p>
                  <p className="text-sm text-muted-foreground">
                    ({progress.completedCount} of {progress.totalCount})
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(progress.completionPercent, 100)}%` }}
                />
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Status:</p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    progress.isUpToDate
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {progress.isUpToDate ? 'Up to date' : 'Out of date'}
                </span>
              </div>

              {/* Eligibility to advance */}
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-sm font-medium">Advancement Eligibility</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {progress.isEligibleToAdvance ? (
                    <>
                      <span className="font-medium text-foreground">Eligible to advance!</span> You
                      can consider moving to the next level.
                    </>
                  ) : progress.selectedLevel === 'EXPERIENCED' ? (
                    <>You&apos;re already at the highest level.</>
                  ) : (
                    <>
                      Complete at least 85% of content at this level to become eligible for
                      advancement.
                    </>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
