/**
 * LoadingState - Skeleton loading state for content lists
 * Shows placeholder cards while data is being fetched
 */

interface LoadingStateProps {
  count?: number;
}

export function LoadingState({ count = 5 }: LoadingStateProps) {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      suppressHydrationWarning
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-lg border bg-card p-4"
          role="status"
          aria-label="Loading content"
          suppressHydrationWarning
        >
          {/* Badge skeleton */}
          <div className="mb-3 h-5 w-20 rounded bg-muted" suppressHydrationWarning />

          {/* Title skeleton */}
          <div className="mb-2 h-6 w-3/4 rounded bg-muted" suppressHydrationWarning />

          {/* Summary skeleton */}
          <div className="mb-1 h-4 w-full rounded bg-muted" suppressHydrationWarning />
          <div className="mb-3 h-4 w-5/6 rounded bg-muted" suppressHydrationWarning />

          {/* Metadata skeleton */}
          <div className="flex items-center gap-2" suppressHydrationWarning>
            <div className="h-4 w-24 rounded bg-muted" suppressHydrationWarning />
            <div className="h-4 w-16 rounded bg-muted" suppressHydrationWarning />
          </div>
        </div>
      ))}
    </div>
  );
}
