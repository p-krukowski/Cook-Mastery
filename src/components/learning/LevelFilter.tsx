/**
 * LevelFilter - Select control for difficulty level filtering
 * Defaults to user's selected level when authenticated, or "All" when anonymous
 * Shows warning when browsing other levels (not recommended)
 */

import type { DifficultyLevel } from "../../types";
import type { LearningLevelFilter } from "./learning.types";

interface LevelFilterProps {
  value: LearningLevelFilter;
  userSelectedLevel?: DifficultyLevel;
  onChange: (next: LearningLevelFilter) => void;
}

export function LevelFilter({ value, userSelectedLevel, onChange }: LevelFilterProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as LearningLevelFilter);
  };

  // Show warning when browsing other levels (not recommended)
  const showWarning = value !== "ALL" && userSelectedLevel && value !== userSelectedLevel;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="learning-level" className="text-sm font-medium text-foreground">
        Level
      </label>
      <select
        id="learning-level"
        value={value}
        onChange={handleChange}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="ALL">All</option>
        <option value="BEGINNER">Beginner</option>
        <option value="INTERMEDIATE">Intermediate</option>
        <option value="EXPERIENCED">Experienced</option>
      </select>
      {showWarning && (
        <p className="text-xs text-amber-600 dark:text-amber-400">Browsing other levels (not recommended)</p>
      )}
    </div>
  );
}
