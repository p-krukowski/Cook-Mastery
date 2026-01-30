/**
 * View Model Types and Helpers for Cookbook Components
 *
 * This file contains all ViewModel types used by cookbook components,
 * as well as helper functions for data transformation and formatting.
 */

import type {
  CookbookEntryDTO,
  ListCookbookEntriesResponseDTO,
  ApiErrorResponse,
  PaginationMeta,
} from '@/types';

// ============================================================================
// Sort Types
// ============================================================================

export type CookbookSort = 'newest' | 'oldest' | 'title_asc';

// ============================================================================
// List View Models
// ============================================================================

/**
 * View model for a single cookbook entry in list view
 */
export interface CookbookEntryListItemVM {
  id: string;
  title: string;
  url: string;
  urlLabel: string;
  notesPreview?: string;
  createdAtLabel: string;
}

/**
 * Pagination view model for cookbook list
 */
export interface CookbookListPaginationVM {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/**
 * Complete list view model
 */
export interface CookbookListVM {
  entries: CookbookEntryListItemVM[];
  pagination: CookbookListPaginationVM;
}

// ============================================================================
// Detail View Models
// ============================================================================

/**
 * View model for cookbook entry detail view
 */
export interface CookbookEntryDetailVM {
  id: string;
  title: string;
  url: string;
  notes: string;
  createdAtLabel: string;
  updatedAtLabel: string;
}

// ============================================================================
// Form View Models
// ============================================================================

/**
 * Form state for create/edit operations
 */
export interface CookbookEntryFormVM {
  url: string;
  title: string;
  notes: string;
}

/**
 * Form validation errors
 */
export interface CookbookEntryFormErrorsVM {
  url?: string;
  title?: string;
  notes?: string;
  general?: string;
}

// ============================================================================
// Edit State View Models
// ============================================================================

/**
 * Edit state tracking for detail view
 */
export interface CookbookEntryEditStateVM {
  mode: 'view' | 'edit';
  isSaving: boolean;
  isDeleting: boolean;
  isDirty: boolean;
}

// ============================================================================
// Error View Models
// ============================================================================

/**
 * Error view model for list operations
 */
export interface CookbookListErrorVM {
  kind: 'http' | 'network';
  status?: number;
  message: string;
  api?: ApiErrorResponse;
}

/**
 * Error view model for detail operations
 */
export interface CookbookEntryErrorVM {
  kind: 'http' | 'network';
  status?: number;
  message: string;
  api?: ApiErrorResponse;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates if a string is a valid UUID v4 format
 */
export function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Formats an ISO date string to a human-readable date label
 */
export function formatDateLabel(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

/**
 * Creates a preview text from notes, truncating to maxLen characters
 * and normalizing whitespace
 */
export function makeNotesPreview(notes: string | null | undefined, maxLen = 140): string {
  if (!notes) return '';

  // Normalize whitespace: collapse multiple spaces/newlines into single space
  const normalized = notes.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLen) {
    return normalized;
  }

  // Truncate and add ellipsis
  return normalized.slice(0, maxLen).trim() + '…';
}

/**
 * Extracts a display-friendly label from a URL (hostname)
 */
export function formatUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    // If URL parsing fails, return truncated version
    if (url.length > 50) {
      return url.slice(0, 47) + '...';
    }
    return url;
  }
}

/**
 * Validates if a string is a valid URL with http/https protocol
 */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Converts PaginationMeta DTO to PaginationVM
 */
export function toPaginationVM(meta: PaginationMeta): CookbookListPaginationVM {
  return {
    page: meta.page,
    limit: meta.limit,
    totalItems: meta.total_items,
    totalPages: meta.total_pages,
  };
}

/**
 * Converts CookbookEntryDTO to list item ViewModel
 */
export function toListItemVM(dto: CookbookEntryDTO): CookbookEntryListItemVM {
  return {
    id: dto.id,
    title: dto.title,
    url: dto.url,
    urlLabel: formatUrlLabel(dto.url),
    notesPreview: makeNotesPreview(dto.notes),
    createdAtLabel: formatDateLabel(dto.created_at),
  };
}

/**
 * Converts CookbookEntryDTO to detail ViewModel
 */
export function toDetailVM(dto: CookbookEntryDTO): CookbookEntryDetailVM {
  return {
    id: dto.id,
    title: dto.title,
    url: dto.url,
    notes: dto.notes ?? '',
    createdAtLabel: formatDateLabel(dto.created_at),
    updatedAtLabel: formatDateLabel(dto.updated_at),
  };
}

/**
 * Converts list response DTO to list ViewModel
 */
export function toListVM(dto: ListCookbookEntriesResponseDTO): CookbookListVM {
  return {
    entries: dto.entries.map(toListItemVM),
    pagination: toPaginationVM(dto.pagination),
  };
}

/**
 * Creates an initial empty form state
 */
export function createEmptyForm(): CookbookEntryFormVM {
  return {
    url: '',
    title: '',
    notes: '',
  };
}

/**
 * Creates form state from detail ViewModel
 */
export function createFormFromDetail(detail: CookbookEntryDetailVM): CookbookEntryFormVM {
  return {
    url: detail.url,
    title: detail.title,
    notes: detail.notes,
  };
}

/**
 * Checks if two form states are equal (for dirty checking)
 */
export function areFormsEqual(a: CookbookEntryFormVM, b: CookbookEntryFormVM): boolean {
  return a.url === b.url && a.title === b.title && a.notes === b.notes;
}
