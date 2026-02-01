/**
 * ContentSections - Structured tutorial content sections
 * Renders all tutorial sections in the required order:
 * 1. Summary
 * 2. Content
 * 3. Steps/sections
 * 4. Practice recommendations
 * 5. Key takeaways
 */

import { useId } from "react";
import type { ContentSectionsProps } from "./tutorial-detail.types";

export function ContentSections({ sections }: ContentSectionsProps) {
  const summaryId = useId();
  const contentId = useId();
  const stepsId = useId();
  const practiceId = useId();
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

      {/* Section 3: Steps */}
      {sections.steps.length > 0 && (
        <section aria-labelledby={stepsId} className="space-y-4">
          <h2 id={stepsId} className="text-2xl font-semibold text-foreground">
            Steps
          </h2>
          <ol className="space-y-6 pl-0">
            {sections.steps.map((step, index) => (
              <li key={step.order} className="relative pl-8">
                {/* Step number badge */}
                <span
                  className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                  aria-label={`Step ${index + 1}`}
                >
                  {index + 1}
                </span>

                <div className="space-y-2">
                  {/* Step title */}
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>

                  {/* Step content */}
                  <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{step.content}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Empty steps message */}
      {sections.steps.length === 0 && (
        <section aria-labelledby={stepsId} className="space-y-3">
          <h2 id={stepsId} className="text-2xl font-semibold text-foreground">
            Steps
          </h2>
          <p className="text-sm text-muted-foreground">No specific steps for this tutorial.</p>
        </section>
      )}

      {/* Section 4: Practice Recommendations */}
      <section aria-labelledby={practiceId} className="space-y-3">
        <h2 id={practiceId} className="text-2xl font-semibold text-foreground">
          Practice Recommendations
        </h2>
        <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
          {sections.practiceRecommendations}
        </p>
      </section>

      {/* Section 5: Key Takeaways */}
      <section aria-labelledby={takeawaysId} className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-6">
        <h2 id={takeawaysId} className="text-2xl font-semibold text-foreground">
          Key Takeaways
        </h2>
        <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground">{sections.keyTakeaways}</div>
      </section>
    </div>
  );
}
