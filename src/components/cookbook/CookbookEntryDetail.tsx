/**
 * CookbookEntryDetail - Presentational component for entry detail
 * Renders view mode (read-only) or edit mode (form)
 */

import CookbookEntryForm from "./CookbookEntryForm";
import type { CookbookEntryDetailVM, CookbookEntryFormVM, CookbookEntryFormErrorsVM } from "./cookbook.types";

interface CookbookEntryDetailProps {
  entry: CookbookEntryDetailVM;
  mode: "view" | "edit";
  form: CookbookEntryFormVM;
  errors: CookbookEntryFormErrorsVM;
  isSubmitting: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (next: Partial<CookbookEntryFormVM>) => void;
  onSave: () => void;
  onDelete: () => void;
}

export default function CookbookEntryDetail({
  entry,
  mode,
  form,
  errors,
  isSubmitting,
  onEdit,
  onCancel,
  onChange,
  onSave,
  onDelete,
}: CookbookEntryDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight">{entry.title}</h2>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>Created {entry.createdAtLabel}</span>
            <span>Updated {entry.updatedAtLabel}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {mode === "view" ? (
            <>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" />
                  <path d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" />
                </svg>
                View Recipe
              </a>
              <button
                onClick={onEdit}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium text-destructive ring-offset-background transition-colors hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onSave}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save"}
              </button>
              <button
                onClick={onCancel}
                disabled={isSubmitting}
                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="rounded-lg border border-border bg-card p-6">
        {mode === "view" ? (
          <div className="space-y-6">
            {/* URL section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground">Recipe URL</h3>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block break-all text-sm text-primary hover:underline"
              >
                {entry.url}
              </a>
            </div>

            {/* Notes section */}
            {entry.notes && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Notes</h3>
                <div className="mt-1 max-h-[50vh] overflow-auto whitespace-pre-wrap break-words text-sm text-foreground">
                  {entry.notes}
                </div>
              </div>
            )}

            {/* Empty notes placeholder */}
            {!entry.notes && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">Notes</h3>
                <p className="mt-1 text-sm text-muted-foreground italic">No notes added</p>
              </div>
            )}
          </div>
        ) : (
          <CookbookEntryForm
            value={form}
            errors={errors}
            disabled={isSubmitting}
            submitLabel="Save changes"
            showCancel={true}
            onCancel={onCancel}
            onChange={onChange}
            onSubmit={onSave}
          />
        )}
      </div>
    </div>
  );
}
