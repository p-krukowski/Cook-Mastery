/**
 * CookbookEntryForm - Reusable form for create and edit operations
 * Renders URL, Title inputs and Notes textarea with inline validation errors
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InlineFieldError } from '@/components/auth/InlineFieldError';
import type { CookbookEntryFormVM, CookbookEntryFormErrorsVM } from './cookbook.types';

interface CookbookEntryFormProps {
  value: CookbookEntryFormVM;
  errors: CookbookEntryFormErrorsVM;
  disabled?: boolean;
  submitLabel: string;
  showCancel?: boolean;
  onCancel?: () => void;
  onChange: (next: Partial<CookbookEntryFormVM>) => void;
  onSubmit: () => void;
}

export default function CookbookEntryForm({
  value,
  errors,
  disabled = false,
  submitLabel,
  showCancel = false,
  onCancel,
  onChange,
  onSubmit,
}: CookbookEntryFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      {/* General error */}
      {errors.general && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errors.general}
        </div>
      )}

      {/* URL field */}
      <div className="space-y-2">
        <Label htmlFor="url">
          Recipe URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="url"
          type="url"
          value={value.url}
          onChange={(e) => onChange({ url: e.target.value })}
          disabled={disabled}
          placeholder="https://example.com/recipe"
          aria-invalid={!!errors.url}
          aria-describedby={errors.url ? 'url-error' : undefined}
        />
        <InlineFieldError error={errors.url} />
      </div>

      {/* Title field */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          type="text"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
          disabled={disabled}
          placeholder="Recipe name"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        <InlineFieldError error={errors.title} />
      </div>

      {/* Notes field - native textarea */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          disabled={disabled}
          placeholder="Optional notes about this recipe..."
          rows={6}
          className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? 'notes-error' : undefined}
        />
        <InlineFieldError error={errors.notes} />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          {submitLabel}
        </button>
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
