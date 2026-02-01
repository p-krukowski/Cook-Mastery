/**
 * CookbookListView - Top-level list view for cookbook entries
 * Fetches and displays paginated list of user's saved recipe links
 */

import { useId } from 'react';
import useCookbookEntries from './useCookbookEntries';
import CookbookEntryCard from './CookbookEntryCard';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { FullPageError } from '@/components/shared/FullPageError';
import { PaginationControls } from '@/components/shared/PaginationControls';
import type { CookbookSort } from './cookbook.types';

interface CookbookListViewProps {
  isAuthenticated: boolean;
  defaultSort?: CookbookSort;
  defaultLimit?: number;
}

export default function CookbookListView({
  isAuthenticated,
  defaultSort = 'newest',
  defaultLimit = 20,
}: CookbookListViewProps) {
  const headingId = useId();

  // Fetch entries with hook
  const { data, isLoading, error, setSort, goPrev, goNext, retry } = useCookbookEntries({
    sort: defaultSort,
    page: 1,
    limit: defaultLimit,
  });

  return (
    <section aria-labelledby={headingId} className="w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id={headingId} className="text-3xl font-bold tracking-tight">
            Cookbook
          </h2>
          <p className="mt-1 text-muted-foreground">Private recipe links you've saved.</p>
        </div>
        <a
          href="/cookbook/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-test-id="cookbook-new-entry-button"
        >
          New entry
        </a>
      </div>

      {/* Sort controls */}
      {!isLoading && !error && data && data.entries.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm text-muted-foreground">
            Sort by:
          </label>
          <select
            id="sort-select"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            defaultValue={defaultSort}
            onChange={(e) => setSort(e.target.value as CookbookSort)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title_asc">Title (A-Z)</option>
          </select>
        </div>
      )}

      {/* Content area */}
      <div className="space-y-6">
        {/* Loading state */}
        {isLoading && <LoadingState count={6} />}

        {/* Error state */}
        {error && !isLoading && (
          <FullPageError
            title={error.status === 500 ? 'Server error' : 'Something went wrong'}
            message={error.message}
            onRetry={retry}
          />
        )}

        {/* Empty state */}
        {!isLoading && !error && data && data.entries.length === 0 && (
          <EmptyState
            title="No cookbook entries yet"
            description="Start saving your favorite recipe links by creating your first entry."
          />
        )}

        {/* Success state - entries grid */}
        {!isLoading && !error && data && data.entries.length > 0 && (
          <>
            <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.entries.map((entry) => (
                <CookbookEntryCard key={entry.id} entry={entry} />
              ))}
            </ul>

            {/* Pagination */}
            <PaginationControls
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              isLoading={isLoading}
              onPrev={goPrev}
              onNext={goNext}
            />
          </>
        )}
      </div>
    </section>
  );
}
