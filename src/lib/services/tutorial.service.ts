/**
 * Tutorial Service
 *
 * Handles business logic for tutorial-related operations including
 * listing tutorials with filters, sorting, pagination, and completion status.
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  ListTutorialsParams,
  ListTutorialsResponseDTO,
  TutorialListItemDTO,
  PaginationMeta,
  GetTutorialDetailResponseDTO,
  TutorialStep,
  CompleteTutorialResponseDTO,
} from "../../types";

/**
 * Lists tutorials with optional filtering, sorting, and pagination
 *
 * @param supabase - Supabase client instance
 * @param params - Query parameters for filtering and pagination
 * @param userId - Optional authenticated user ID for completion status
 * @returns Promise resolving to tutorials list with pagination metadata
 * @throws Error if database query fails
 */
export async function listTutorials(
  supabase: SupabaseClient,
  params: ListTutorialsParams,
  userId?: string
): Promise<ListTutorialsResponseDTO> {
  const { level, category, sort = "difficulty_asc", page = 1, limit = 20, include_completed = true } = params;

  // Build base query for tutorials
  let query = supabase
    .from("tutorials")
    .select("id, title, category, level, difficulty_weight, summary, created_at", { count: "exact" });

  // Apply level filter if provided
  if (level) {
    query = query.eq("level", level);
  }

  // Apply category filter if provided
  if (category) {
    query = query.eq("category", category);
  }

  // Apply sorting
  if (sort === "difficulty_asc") {
    // Sort by difficulty weight ascending, then by creation date descending
    query = query.order("difficulty_weight", { ascending: true }).order("created_at", { ascending: false });
  } else if (sort === "newest") {
    // Sort by creation date descending
    query = query.order("created_at", { ascending: false });
  }

  // Apply pagination
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  // Execute main query
  const { data: tutorials, error, count } = await query;

  if (error) {
    console.error("Error fetching tutorials:", error);
    throw new Error("Failed to fetch tutorials from database");
  }

  if (!tutorials) {
    throw new Error("No data returned from tutorials query");
  }

  // Fetch completion status if user is authenticated and requested
  let completedTutorialIds = new Set<string>();

  if (userId && include_completed) {
    const { data: completedTutorials, error: completionError } = await supabase
      .from("user_tutorials")
      .select("tutorial_id")
      .eq("user_id", userId);

    if (completionError) {
      // Log error but don't fail the request - graceful degradation
      console.error("Error fetching completion status:", completionError);
    } else if (completedTutorials) {
      completedTutorialIds = new Set(completedTutorials.map((t) => t.tutorial_id));
    }
  }

  // Map tutorials to DTOs with completion status
  const tutorialDTOs: TutorialListItemDTO[] = tutorials.map((tutorial) => ({
    id: tutorial.id,
    title: tutorial.title,
    category: tutorial.category,
    level: tutorial.level,
    difficulty_weight: tutorial.difficulty_weight,
    summary: tutorial.summary,
    created_at: tutorial.created_at,
    is_completed: completedTutorialIds.has(tutorial.id),
  }));

  // Calculate pagination metadata
  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / limit);

  const paginationMeta: PaginationMeta = {
    page,
    limit,
    total_items: totalItems,
    total_pages: totalPages,
  };

  return {
    tutorials: tutorialDTOs,
    pagination: paginationMeta,
  };
}

/**
 * Retrieves detailed information for a specific tutorial
 *
 * @param supabase - Supabase client instance
 * @param tutorialId - UUID of the tutorial to retrieve
 * @param userId - Optional authenticated user ID for completion status
 * @returns Promise resolving to tutorial detail DTO or null if not found
 * @throws Error if database query fails
 */
export async function getTutorialDetail(
  supabase: SupabaseClient,
  tutorialId: string,
  userId?: string
): Promise<GetTutorialDetailResponseDTO | null> {
  // Fetch tutorial data
  const { data: tutorial, error } = await supabase
    .from("tutorials")
    .select(
      `
      id,
      title,
      category,
      level,
      difficulty_weight,
      summary,
      content,
      steps,
      practice_recommendations,
      key_takeaways,
      created_at,
      updated_at
    `
    )
    .eq("id", tutorialId)
    .single();

  if (error || !tutorial) {
    return null;
  }

  // Fetch completion status if user is authenticated
  let completionData = null;
  if (userId) {
    const { data: completion } = await supabase
      .from("user_tutorials")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("tutorial_id", tutorialId)
      .maybeSingle();

    completionData = completion;
  }

  // Parse JSONB steps field with type safety
  const steps: TutorialStep[] = Array.isArray(tutorial.steps) ? (tutorial.steps as unknown as TutorialStep[]) : [];

  // Construct and return response DTO
  return {
    id: tutorial.id,
    title: tutorial.title,
    category: tutorial.category,
    level: tutorial.level,
    difficulty_weight: tutorial.difficulty_weight,
    summary: tutorial.summary,
    content: tutorial.content,
    steps,
    practice_recommendations: tutorial.practice_recommendations,
    key_takeaways: tutorial.key_takeaways,
    created_at: tutorial.created_at,
    updated_at: tutorial.updated_at,
    is_completed: !!completionData,
    completed_at: completionData?.completed_at || null,
  };
}

/**
 * Records tutorial completion for a user (idempotent)
 *
 * @param supabase - Supabase client instance
 * @param tutorialId - UUID of the tutorial to mark as completed
 * @param userId - UUID of the authenticated user
 * @returns Promise resolving to completion response DTO
 * @throws Error if tutorial doesn't exist or database operation fails
 */
export async function completeTutorial(
  supabase: SupabaseClient,
  tutorialId: string,
  userId: string
): Promise<CompleteTutorialResponseDTO> {
  // First, verify that the tutorial exists
  const { data: tutorial, error: tutorialError } = await supabase
    .from("tutorials")
    .select("id")
    .eq("id", tutorialId)
    .maybeSingle();

  if (tutorialError) {
    throw new Error("Failed to verify tutorial existence");
  }

  if (!tutorial) {
    throw new Error("Tutorial not found");
  }

  // Check if completion record already exists
  const { data: existingCompletion, error: checkError } = await supabase
    .from("user_tutorials")
    .select("tutorial_id, user_id, completed_at")
    .eq("user_id", userId)
    .eq("tutorial_id", tutorialId)
    .maybeSingle();

  if (checkError) {
    throw new Error("Failed to check existing completion status");
  }

  // If already completed, return existing record with status
  if (existingCompletion) {
    return {
      tutorial_id: existingCompletion.tutorial_id,
      user_id: existingCompletion.user_id,
      completed_at: existingCompletion.completed_at,
      status: "already_completed",
    };
  }

  // Insert new completion record
  const { data: newCompletion, error: insertError } = await supabase
    .from("user_tutorials")
    .insert({
      user_id: userId,
      tutorial_id: tutorialId,
    })
    .select("tutorial_id, user_id, completed_at")
    .single();

  if (insertError || !newCompletion) {
    throw new Error("Failed to record tutorial completion");
  }

  return {
    tutorial_id: newCompletion.tutorial_id,
    user_id: newCompletion.user_id,
    completed_at: newCompletion.completed_at,
    status: "created",
  };
}
