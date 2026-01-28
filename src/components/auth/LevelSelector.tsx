import * as React from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { DifficultyLevel } from "@/types"

interface LevelOption {
  value: DifficultyLevel
  label: string
  description: string
}

const levelOptions: LevelOption[] = [
  {
    value: "BEGINNER",
    label: "Beginner",
    description: "Just getting started in the kitchen",
  },
  {
    value: "INTERMEDIATE",
    label: "Intermediate",
    description: "Comfortable with basic techniques",
  },
  {
    value: "EXPERIENCED",
    label: "Experienced",
    description: "Confident with advanced cooking",
  },
]

interface LevelSelectorProps {
  value: DifficultyLevel | null
  onChange: (level: DifficultyLevel) => void
  error?: string
  disabled?: boolean
}

/**
 * Single-select difficulty level selector for signup
 * Implements accessible radio group pattern
 */
export function LevelSelector({
  value,
  onChange,
  error,
  disabled = false,
}: LevelSelectorProps) {
  const groupId = React.useId()

  return (
    <div className="space-y-3">
      <Label htmlFor={groupId} className="text-base">
        What's your skill level?
      </Label>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        aria-invalid={!!error}
        className="space-y-2"
      >
        {levelOptions.map((option) => {
          const isSelected = value === option.value
          const radioId = `${groupId}-${option.value}`

          return (
            <label
              key={option.value}
              htmlFor={radioId}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                "hover:bg-accent/50",
                isSelected &&
                  "border-primary bg-primary/5 ring-2 ring-primary/20",
                !isSelected && "border-border",
                disabled && "opacity-50 cursor-not-allowed",
                error && !isSelected && "border-destructive"
              )}
            >
              <input
                type="radio"
                id={radioId}
                name="selected_level"
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                disabled={disabled}
                className="mt-0.5 h-4 w-4 text-primary focus:ring-2 focus:ring-primary/20"
                aria-describedby={`${radioId}-description`}
              />
              <div className="flex-1 space-y-1">
                <div className="font-medium text-sm">{option.label}</div>
                <div
                  id={`${radioId}-description`}
                  className="text-sm text-muted-foreground"
                >
                  {option.description}
                </div>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
