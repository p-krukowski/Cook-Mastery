import * as React from "react"
import { cn } from "@/lib/utils"

interface InlineFieldErrorProps {
  error?: string
  className?: string
}

/**
 * Displays inline validation error messages for form fields
 * Used to render ApiErrorResponse.error.details[field] when present
 */
export function InlineFieldError({ error, className }: InlineFieldErrorProps) {
  if (!error) return null

  return (
    <p
      className={cn("text-sm text-destructive mt-1.5", className)}
      role="alert"
      aria-live="polite"
    >
      {error}
    </p>
  )
}
