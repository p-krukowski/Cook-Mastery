/**
 * TypeFilter - Select control for content type filtering
 * Allows users to filter by All, Tutorials, or Articles
 */

import type { LearningTypeFilter } from "./learning.types";

interface TypeFilterProps {
  value: LearningTypeFilter;
  onChange: (next: LearningTypeFilter) => void;
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as LearningTypeFilter);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="learning-type" className="text-sm font-medium text-foreground">
        Type
      </label>
      <select
        id="learning-type"
        value={value}
        onChange={handleChange}
        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <option value="all">All</option>
        <option value="tutorials">Tutorials</option>
        <option value="articles">Articles</option>
      </select>
    </div>
  );
}
