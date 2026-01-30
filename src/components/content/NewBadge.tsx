/**
 * NewBadge - Displays "New" badge for recently created content
 * The parent component determines if the badge should be shown via conditional rendering
 */

export function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
      New
    </span>
  );
}
