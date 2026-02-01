/**
 * Cookbook Service
 *
 * Handles business logic for cookbook-related operations including
 * listing saved entries, CRUD operations with sorting and pagination for authenticated users.
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  ListCookbookEntriesParams,
  ListCookbookEntriesResponseDTO,
  CookbookEntryDTO,
  PaginationMeta,
  CreateCookbookEntryCommand,
  UpdateCookbookEntryCommand,
} from "../../types";

/**
 * Lists cookbook entries for a specific user with sorting and pagination
 *
 * @param supabase - Supabase client instance
 * @param params - Query parameters for sorting and pagination
 * @param userId - Authenticated user ID (required for data isolation)
 * @returns Promise resolving to cookbook entries list with pagination metadata
 * @throws Error if database query fails
 */
export async function listCookbookEntries(
  supabase: SupabaseClient,
  params: ListCookbookEntriesParams,
  userId: string
): Promise<ListCookbookEntriesResponseDTO> {
  const { sort = "newest", page = 1, limit = 20 } = params;

  // Build base query for cookbook entries
  let query = supabase
    .from("cookbook_entries")
    .select("id, user_id, url, title, notes, created_at, updated_at", { count: "exact" })
    .eq("user_id", userId); // Defense-in-depth: explicit user_id filter even with RLS

  // Apply sorting with stable tie-breakers for consistent pagination
  if (sort === "newest") {
    // Newest first: sort by created_at descending, then by id descending
    query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
  } else if (sort === "oldest") {
    // Oldest first: sort by created_at ascending, then by id ascending
    query = query.order("created_at", { ascending: true }).order("id", { ascending: true });
  } else if (sort === "title_asc") {
    // Alphabetical by title: sort by title ascending, then created_at descending, then id descending
    query = query
      .order("title", { ascending: true })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }

  // Apply pagination using range
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  // Execute query
  const { data, error, count } = await query;

  // Handle database errors
  if (error) {
    throw new Error(`Failed to fetch cookbook entries: ${error.message}`);
  }

  // Map results to DTOs (should already match the selected columns)
  const entries: CookbookEntryDTO[] = data || [];

  // Compute pagination metadata
  const total_items = count ?? 0;
  const total_pages = Math.ceil(total_items / limit);

  const pagination: PaginationMeta = {
    page,
    limit,
    total_items,
    total_pages,
  };

  return {
    entries,
    pagination,
  };
}

/**
 * Gets a single cookbook entry by ID for a specific user
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID (required for authorization)
 * @param entryId - Cookbook entry UUID
 * @returns Promise resolving to cookbook entry DTO or null if not found
 * @throws Error if database query fails
 */
export async function getCookbookEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string
): Promise<CookbookEntryDTO | null> {
  const { data, error } = await supabase
    .from("cookbook_entries")
    .select("id, user_id, url, title, notes, created_at, updated_at")
    .eq("id", entryId)
    .eq("user_id", userId) // Defense-in-depth: explicit user_id filter even with RLS
    .single();

  if (error) {
    // If error code is PGRST116, it means no rows returned (not found)
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to fetch cookbook entry: ${error.message}`);
  }

  return data as CookbookEntryDTO;
}

/**
 * Creates a new cookbook entry for a specific user
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID (required for ownership)
 * @param command - Command object containing url, title, and optional notes
 * @returns Promise resolving to created cookbook entry DTO
 * @throws Error if database insert fails
 */
export async function createCookbookEntry(
  supabase: SupabaseClient,
  userId: string,
  command: CreateCookbookEntryCommand
): Promise<CookbookEntryDTO> {
  const { data, error } = await supabase
    .from("cookbook_entries")
    .insert({
      user_id: userId,
      url: command.url,
      title: command.title,
      notes: command.notes ?? null,
    })
    .select("id, user_id, url, title, notes, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to create cookbook entry: ${error.message}`);
  }

  return data as CookbookEntryDTO;
}

/**
 * Updates an existing cookbook entry for a specific user
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID (required for authorization)
 * @param entryId - Cookbook entry UUID to update
 * @param command - Command object containing optional url, title, and/or notes
 * @returns Promise resolving to updated cookbook entry DTO or null if not found
 * @throws Error if database update fails
 */
export async function updateCookbookEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: string,
  command: UpdateCookbookEntryCommand
): Promise<CookbookEntryDTO | null> {
  // Build update object only with provided fields
  const updateData: Record<string, unknown> = {};
  if (command.url !== undefined) updateData.url = command.url;
  if (command.title !== undefined) updateData.title = command.title;
  if (command.notes !== undefined) updateData.notes = command.notes;

  const { data, error } = await supabase
    .from("cookbook_entries")
    .update(updateData)
    .eq("id", entryId)
    .eq("user_id", userId) // Defense-in-depth: explicit user_id filter even with RLS
    .select("id, user_id, url, title, notes, created_at, updated_at")
    .single();

  if (error) {
    // If error code is PGRST116, it means no rows returned (not found)
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error(`Failed to update cookbook entry: ${error.message}`);
  }

  return data as CookbookEntryDTO;
}

/**
 * Deletes a cookbook entry for a specific user
 *
 * @param supabase - Supabase client instance
 * @param userId - Authenticated user ID (required for authorization)
 * @param entryId - Cookbook entry UUID to delete
 * @returns Promise resolving to true if deleted, false if not found
 * @throws Error if database delete fails
 */
export async function deleteCookbookEntry(supabase: SupabaseClient, userId: string, entryId: string): Promise<boolean> {
  const { error, count } = await supabase
    .from("cookbook_entries")
    .delete({ count: "exact" })
    .eq("id", entryId)
    .eq("user_id", userId); // Defense-in-depth: explicit user_id filter even with RLS

  if (error) {
    throw new Error(`Failed to delete cookbook entry: ${error.message}`);
  }

  // Return true if at least one row was deleted
  return (count ?? 0) > 0;
}
