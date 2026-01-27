/**
 * HomeSection - Section wrapper for Tutorials or Articles feed
 * Handles loading, error, empty, and success states
 */

import { useId } from "react";
import type { HomeContentItemVM, HomeFeedErrorVM } from "./home.types";
import { SectionHeader } from "../shared/SectionHeader";
import { LoadingState } from "../shared/LoadingState";
import { EmptyState } from "../shared/EmptyState";
import { FullPageError } from "../shared/FullPageError";
import { ContentCard } from "../content/ContentCard";

export type HomeSectionKind = "tutorials" | "articles";

interface HomeSectionProps {
  kind: HomeSectionKind;
  title: string;
  description: string;
  items: HomeContentItemVM[];
  isLoading: boolean;
  error: HomeFeedErrorVM | null;
  onRetry: () => void;
}

export function HomeSection({
  kind,
  title,
  description,
  items,
  isLoading,
  error,
  onRetry,
}: HomeSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <SectionHeader id={headingId} title={title} description={description} />

      {/* Loading State */}
      {isLoading && <LoadingState count={5} />}

      {/* Error State */}
      {!isLoading && error && (
        <FullPageError
          title={`Couldn't load ${kind}`}
          message={error.message}
          onRetry={onRetry}
        />
      )}

      {/* Empty State */}
      {!isLoading && !error && items.length === 0 && (
        <EmptyState
          title={`No ${kind} available`}
          description={`Check back later for new ${kind}.`}
        />
      )}

      {/* Success State - Content Grid */}
      {!isLoading && !error && items.length > 0 && (
        <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}
