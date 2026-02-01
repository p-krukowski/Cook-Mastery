/**
 * CookbookCreateView - Page-level component for creating new cookbook entries
 * Manages form state and submission for POST /api/cookbook
 */

import { useState } from 'react';
import { toast } from 'sonner';
import CookbookEntryForm from './CookbookEntryForm';
import { createEmptyForm, isValidUrl } from './cookbook.types';
import type { CookbookEntryFormVM, CookbookEntryFormErrorsVM } from './cookbook.types';
import type { CreateCookbookEntryCommand, ApiErrorResponse } from '@/types';

interface CookbookCreateViewProps {
  isAuthenticated: boolean;
}

export default function CookbookCreateView({ isAuthenticated }: CookbookCreateViewProps) {
  const [form, setForm] = useState<CookbookEntryFormVM>(createEmptyForm());
  const [errors, setErrors] = useState<CookbookEntryFormErrorsVM>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Client-side validation before submission
   */
  const validateForm = (): boolean => {
    const newErrors: CookbookEntryFormErrorsVM = {};

    // URL validation
    if (!form.url.trim()) {
      newErrors.url = 'Recipe URL is required';
    } else if (!isValidUrl(form.url)) {
      newErrors.url = 'Please enter a valid URL starting with http:// or https://';
    }

    // Title validation
    if (!form.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Client-side validation
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Build command (send notes as string or undefined, not null)
      const command: CreateCookbookEntryCommand = {
        url: form.url.trim(),
        title: form.title.trim(),
        notes: form.notes.trim() || undefined,
      };

      const response = await fetch('/api/cookbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        window.location.href = '/login';
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
        toast.error(errorData.error.message || 'Failed to save entry');
        return;
      }

      // Success
      const data = await response.json();
      toast.success('Cookbook entry saved');
      window.location.href = `/cookbook/${data.id}`;
    } catch (err) {
      // Network error
      toast.error("Couldn't save entry. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full" data-test-id="cookbook-create-view">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <a
            href="/cookbook"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-test-id="cookbook-back-link"
          >
            ← Back to Cookbook
          </a>
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight" data-test-id="cookbook-create-heading">
          New cookbook entry
        </h2>
      </div>

      {/* Form */}
      <div className="rounded-lg border border-border bg-card p-6">
        <CookbookEntryForm
          value={form}
          errors={errors}
          disabled={isSubmitting}
          submitLabel={isSubmitting ? 'Saving...' : 'Save'}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />
      </div>
    </section>
  );
}
