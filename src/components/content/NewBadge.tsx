/**
 * NewBadge - Displays "New" badge for recently created content
 * Shows badge only if content was created within the specified days threshold
 */

interface NewBadgeProps {
  createdAt: string;
  days?: number;
}

/**
 * Helper: Check if content was created within the last N days
 */
function isCreatedWithinDays(createdAt: string, days: number): boolean {
  try {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= days;
  } catch {
    return false;
  }
}

export function NewBadge({ createdAt, days = 7 }: NewBadgeProps) {
  // Don't render if not within threshold
  if (!isCreatedWithinDays(createdAt, days)) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
      New
    </span>
  );
}
