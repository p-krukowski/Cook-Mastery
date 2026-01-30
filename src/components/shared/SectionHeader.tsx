/**
 * SectionHeader - Displays section title and description
 * Used for both Tutorials and Articles sections on Home
 */

interface SectionHeaderProps {
  id: string;
  title: string;
  description: string;
}

export function SectionHeader({ id, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-6" suppressHydrationWarning>
      <h2 id={id} className="text-2xl font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
