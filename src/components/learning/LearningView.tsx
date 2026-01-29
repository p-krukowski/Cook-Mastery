/**
 * LearningView - Main container for the Learning page
 * Allows users to browse all tutorials and articles with filtering and pagination
 */

import { useId } from "react";
import type { DifficultyLevel } from "../../types";
import type { LearningTypeFilter, LearningLevelFilter } from "./learning.types";
import { useLearningFeed } from "../hooks/useLearningFeed";
import { SectionHeader } from "../shared/SectionHeader";
import { LoadingState } from "../shared/LoadingState";
import { FullPageError } from "../shared/FullPageError";
import { EmptyState } from "../shared/EmptyState";
import { ContentCard } from "../content/ContentCard";
import { PaginationControls } from "../shared/PaginationControls";
import { FiltersBar } from "./FiltersBar";

interface LearningViewProps {
  isAuthenticated: boolean;
  userSelectedLevel?: DifficultyLevel;
  initialLevelFilter: LearningLevelFilter;
  initialTypeFilter?: LearningTypeFilter;
}

export default function LearningView({
  isAuthenticated,
  userSelectedLevel,
  initialLevelFilter,
  initialTypeFilter = "all",
}: LearningViewProps) {
  const headingId = useId();

  const {
    type,
    level,
    items,
    pagination,
    isLoading,
    error,
    setType,
    setLevel,
    goPrev,
    goNext,
    retry,
  } = useLearningFeed({
    isAuthenticated,
    userSelectedLevel,
    initialLevelFilter,
    initialTypeFilter,
  });

  return (
    <section aria-labelledby={headingId} className="w-full">
      {/* Header */}
      <SectionHeader
        id={headingId}
        title="Learning"
        description="Browse all tutorials and articles. Filter by type and level to find content that matches your learning goals."
      />

      {/* Filters */}
      <div className="mb-6">
        <FiltersBar
          type={type}
          level={level}
          userSelectedLevel={userSelectedLevel}
          onTypeChange={setType}
          onLevelChange={setLevel}
        />
      </div>

      {/* Results area */}
      <div className="mb-6">
        {isLoading && <LoadingState count={10} />}

        {!isLoading && error && (
          <FullPageError
            title="Failed to load content"
            message={error.message}
            onRetry={retry}
          />
        )}

        {!isLoading && !error && items.length === 0 && (
          <EmptyState
            title="No content found"
            description="Try a different type or level, or check back later for new content."
          />
        )}

        {!isLoading && !error && items.length > 0 && (
          <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ContentCard key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        )}
      </div>

      {/* Pagination - only show when there are items or totalItems > 0 */}
      {!isLoading && !error && pagination.totalItems > 0 && (
        <PaginationControls
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          isLoading={isLoading}
          onPrev={goPrev}
          onNext={goNext}
        />
      )}
    </section>
  );
}
