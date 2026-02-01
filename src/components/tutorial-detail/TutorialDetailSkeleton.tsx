/**
 * TutorialDetailSkeleton - Loading skeleton for tutorial detail page
 * Shows placeholder content while tutorial data is being fetched
 */

export function TutorialDetailSkeleton() {
  return (
    <div
      className="animate-pulse space-y-8"
      role="status"
      aria-label="Loading tutorial"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header skeleton */}
      <div className="space-y-4">
        {/* Badge skeleton */}
        <div className="h-6 w-24 rounded-full bg-muted" />

        {/* Title skeleton */}
        <div className="h-10 w-3/4 rounded bg-muted" />

        {/* Metadata row skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-4 w-20 rounded bg-muted" />
          <div className="h-4 w-28 rounded bg-muted" />
        </div>
      </div>

      {/* Content sections skeleton */}
      <div className="space-y-8">
        {/* Section 1 */}
        <div className="space-y-3">
          <div className="h-7 w-32 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
        </div>

        {/* Section 2 */}
        <div className="space-y-3">
          <div className="h-7 w-28 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
        </div>

        {/* Section 3 */}
        <div className="space-y-3">
          <div className="h-7 w-24 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
