/**
 * ContentSections - Structured article content sections
 * Renders all article sections in the required order:
 * 1. Summary
 * 2. Content
 * 3. Key Takeaways
 */

import { useId } from "react";
import type { ContentSectionsProps } from "./article-detail.types";

export function ContentSections({ sections }: ContentSectionsProps) {
  const summaryId = useId();
  const contentId = useId();
  const takeawaysId = useId();

  return (
    <div className="space-y-8">
      {/* Section 1: Summary */}
      <section aria-labelledby={summaryId} className="space-y-3">
        <h2 id={summaryId} className="text-2xl font-semibold text-foreground">
          Summary
        </h2>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{sections.summary}</p>
      </section>

      {/* Section 2: Content */}
      <section aria-labelledby={contentId} className="space-y-3">
        <h2 id={contentId} className="text-2xl font-semibold text-foreground">
          Content
        </h2>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{sections.content}</p>
        </div>
      </section>

      {/* Section 3: Key Takeaways */}
      <section aria-labelledby={takeawaysId} className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-6">
        <h2 id={takeawaysId} className="text-2xl font-semibold text-foreground">
          Key Takeaways
        </h2>
        <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{sections.keyTakeaways}</div>
      </section>
    </div>
  );
}
