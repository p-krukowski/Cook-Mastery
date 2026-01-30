/**
 * CookbookEntryView - Detail controller for individual cookbook entries
 * Handles load, view/edit modes, and delete operations
 */

import { useId, useState, useEffect } from 'react';
import { toast } from 'sonner';
import useCookbookEntry from './useCookbookEntry';
import CookbookEntryDetail from './CookbookEntryDetail';
import { LoadingState } from '@/components/shared/LoadingState';
import { NotFoundState } from '@/components/shared/NotFoundState';
import { FullPageError } from '@/components/shared/FullPageError';
import { createFormFromDetail, areFormsEqual, isValidUrl } from './cookbook.types';
import type {
  CookbookEntryFormVM,
  CookbookEntryFormErrorsVM,
  CookbookEntryDetailVM,
} from './cookbook.types';
import type { UpdateCookbookEntryCommand, ApiErrorResponse } from '@/types';

interface CookbookEntryViewProps {
  entryId: string;
  isAuthenticated: boolean;
}

export default function CookbookEntryView({ entryId, isAuthenticated }: CookbookEntryViewProps) {
  const headingId = useId();

  // Fetch entry data
  const { data, isLoading, error, isNotFound, retry } = useCookbookEntry({ entryId });

  // Edit state
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [form, setForm] = useState<CookbookEntryFormVM>({ url: '', title: '', notes: '' });
  const [errors, setErrors] = useState<CookbookEntryFormErrorsVM>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastSavedEntry, setLastSavedEntry] = useState<CookbookEntryDetailVM | null>(null);

  // Initialize form when data loads
  useEffect(() => {
    if (data) {
      setForm(createFormFromDetail(data));
      setLastSavedEntry(data);
    }
  }, [data]);

  // Check if form is dirty
  const isDirty =
    lastSavedEntry !== null &&
    !areFormsEqual(form, createFormFromDetail(lastSavedEntry));

  /**
   * Handle edit mode toggle
   */
  const handleEdit = () => {
    setMode('edit');
    setErrors({});
  };

  /**
   * Handle cancel edit
   */
  const handleCancel = () => {
    if (lastSavedEntry) {
      setForm(createFormFromDetail(lastSavedEntry));
    }
    setErrors({});
    setMode('view');
  };

  /**
   * Handle form field changes
   */
  const handleChange = (next: Partial<CookbookEntryFormVM>) => {
    setForm((prev) => ({ ...prev, ...next }));

    // Clear field error on change
    if (next.url !== undefined && errors.url) {
      setErrors((prev) => ({ ...prev, url: undefined }));
    }
    if (next.title !== undefined && errors.title) {
      setErrors((prev) => ({ ...prev, title: undefined }));
    }
    if (next.notes !== undefined && errors.notes) {
      setErrors((prev) => ({ ...prev, notes: undefined }));
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  /**
   * Handle save (update)
   */
  const handleSave = async () => {
    if (!lastSavedEntry) return;

    // Check if anything changed
    if (!isDirty) {
      setErrors({ general: 'No changes to save.' });
      return;
    }

    setIsSaving(true);
    setErrors({});

    try {
      // Build command with only changed fields
      const command: UpdateCookbookEntryCommand = {};
      const lastForm = createFormFromDetail(lastSavedEntry);

      if (form.url.trim() !== lastForm.url) {
        // Validate URL if changed
        if (!form.url.trim()) {
          setErrors({ url: 'URL is required' });
          setIsSaving(false);
          return;
        }
        if (!isValidUrl(form.url)) {
          setErrors({ url: 'Please enter a valid URL starting with http:// or https://' });
          setIsSaving(false);
          return;
        }
        command.url = form.url.trim();
      }

      if (form.title.trim() !== lastForm.title) {
        // Validate title if changed
        if (!form.title.trim()) {
          setErrors({ title: 'Title is required' });
          setIsSaving(false);
          return;
        }
        command.title = form.title.trim();
      }

      if (form.notes !== lastForm.notes) {
        command.notes = form.notes.trim() || undefined;
      }

      // Ensure at least one field is present
      if (Object.keys(command).length === 0) {
        setErrors({ general: 'No changes to save.' });
        setIsSaving(false);
        return;
      }

      const response = await fetch(`/api/cookbook/${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      // Handle 404 - entry not found or no longer accessible
      if (response.status === 404) {
        toast.error('Entry not found');
        window.location.href = '/cookbook';
        return;
      }

      // Handle validation errors (400)
      if (response.status === 400) {
        const errorData = (await response.json()) as ApiErrorResponse;
        const newErrors: CookbookEntryFormErrorsVM = {};

        if (errorData.error.details) {
          if (errorData.error.details.url) {
            newErrors.url = errorData.error.details.url;
          }
          if (errorData.error.details.title) {
            newErrors.title = errorData.error.details.title;
          }
          if (errorData.error.details.notes) {
            newErrors.notes = errorData.error.details.notes;
          }
          if (errorData.error.details.general) {
            newErrors.general = errorData.error.details.general;
          }
        }

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
        } else {
          setErrors({ general: errorData.error.message });
        }
        return;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        toast.error(errorData.error.message || 'Failed to save changes');
        return;
      }

      // Success - update local state and exit edit mode
      const updatedData = await response.json();
      const updatedVM = {
        ...lastSavedEntry,
        url: updatedData.url,
        title: updatedData.title,
        notes: updatedData.notes ?? '',
      };
      setLastSavedEntry(updatedVM);
      setForm(createFormFromDetail(updatedVM));
      setMode('view');
      toast.success('Changes saved');
    } catch (err) {
      // Network error
      toast.error("Couldn't save changes. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = async () => {
    // Confirm deletion
    const confirmed = window.confirm('Delete this cookbook entry?');
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/cookbook/${entryId}`, {
        method: 'DELETE',
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      // Handle 404 - entry not found (already deleted or never existed)
      if (response.status === 404) {
        toast.error('Entry not found');
        window.location.href = '/cookbook';
        return;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        toast.error(errorData.error.message || 'Failed to delete entry');
        setIsDeleting(false);
        return;
      }

      // Success
      toast.success('Entry deleted');
      window.location.href = '/cookbook';
    } catch (err) {
      // Network error
      toast.error("Couldn't delete entry. Check your connection.");
      setIsDeleting(false);
    }
  };

  return (
    <section aria-labelledby={headingId} className="w-full">
      <div className="mb-6">
        <a
          href="/cookbook"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Cookbook
        </a>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      )}

      {/* Not found state */}
      {isNotFound && !isLoading && (
        <NotFoundState
          title="Entry not found"
          description="This cookbook entry doesn't exist or is no longer available."
          backHref="/cookbook"
          backLabel="Back to Cookbook"
        />
      )}

      {/* Error state */}
      {error && !isLoading && !isNotFound && (
        <FullPageError
          title={error.status === 500 ? 'Server error' : 'Something went wrong'}
          message={error.message}
          onRetry={retry}
        />
      )}

      {/* Success state - detail view */}
      {lastSavedEntry && !isLoading && !isNotFound && !error && (
        <CookbookEntryDetail
          entry={lastSavedEntry}
          mode={mode}
          form={form}
          errors={errors}
          isSubmitting={isSaving || isDeleting}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onChange={handleChange}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
