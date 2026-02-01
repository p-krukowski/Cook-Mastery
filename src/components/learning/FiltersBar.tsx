/**
 * FiltersBar - Container for Learning view filters
 * Displays Type and Level filters with context labels
 */

import type { DifficultyLevel } from "../../types";
import type { LearningTypeFilter, LearningLevelFilter } from "./learning.types";
import { TypeFilter } from "./TypeFilter";
import { LevelFilter } from "./LevelFilter";

interface FiltersBarProps {
  type: LearningTypeFilter;
  level: LearningLevelFilter;
  userSelectedLevel?: DifficultyLevel;
  onTypeChange: (next: LearningTypeFilter) => void;
  onLevelChange: (next: LearningLevelFilter) => void;
}

export function FiltersBar({ type, level, userSelectedLevel, onTypeChange, onLevelChange }: FiltersBarProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Filters row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        {/* Left: Filter controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <TypeFilter value={type} onChange={onTypeChange} />
          <LevelFilter value={level} userSelectedLevel={userSelectedLevel} onChange={onLevelChange} />
        </div>

        {/* Right: Context label */}
        <div className="flex items-end text-xs text-muted-foreground sm:ml-auto">
          <span>Sorted by newest</span>
        </div>
      </div>
    </div>
  );
}
