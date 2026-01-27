/**
 * FullPageError - Error state with retry button
 * Used when content fails to load from the API
 */

import { Button } from "../ui/button";

interface FullPageErrorProps {
  title?: string;
  message: string;
  onRetry: () => void;
}

export function FullPageError({
  title = "Something went wrong",
  message,
  onRetry,
}: FullPageErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 px-6 py-12 text-center"
    >
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="mt-4"
        aria-label="Retry loading content"
      >
        Try again
      </Button>
    </div>
  );
}
