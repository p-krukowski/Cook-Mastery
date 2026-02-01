/**
 * Article Service
 *
 * Handles business logic for article-related operations including
 * listing articles with filters, sorting, pagination, and completion status.
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  ListArticlesParams,
  ListArticlesResponseDTO,
  ArticleListItemDTO,
  PaginationMeta,
  GetArticleDetailResponseDTO,
  CompleteArticleResponseDTO,
} from "../../types";

/**
 * Lists articles with optional filtering, sorting, and pagination
 *
 * @param supabase - Supabase client instance
 * @param params - Query parameters for filtering and pagination
 * @param userId - Optional authenticated user ID for completion status
 * @returns Promise resolving to articles list with pagination metadata
 * @throws Error if database query fails
 */
export async function listArticles(
  supabase: SupabaseClient,
  params: ListArticlesParams,
  userId?: string
): Promise<ListArticlesResponseDTO> {
  const { level, sort = "difficulty_asc", page = 1, limit = 20, include_completed = true } = params;

  // Build base query for articles
  let query = supabase
    .from("articles")
    .select("id, title, level, difficulty_weight, summary, created_at", { count: "exact" });

  // Apply level filter if provided
  if (level) {
    query = query.eq("level", level);
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
  const { data: articles, error, count } = await query;

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching articles:", error);
    throw new Error("Failed to fetch articles from database");
  }

  if (!articles) {
    throw new Error("No data returned from articles query");
  }

  // Fetch completion status if user is authenticated and requested
  const completionMap = new Map<string, string>();

  if (userId && include_completed && articles.length > 0) {
    // Query completions only for the current page's article IDs
    const articleIds = articles.map((article) => article.id);

    const { data: completions, error: completionError } = await supabase
      .from("user_articles")
      .select("article_id, completed_at")
      .eq("user_id", userId)
      .in("article_id", articleIds);

    if (completionError) {
      // Log error but don't fail the request - graceful degradation
      // eslint-disable-next-line no-console
      console.error("Error fetching completion status:", completionError);
    } else if (completions) {
      // Build lookup map: articleId -> completed_at
      completions.forEach((completion) => {
        completionMap.set(completion.article_id, completion.completed_at);
      });
    }
  }

  // Map articles to DTOs with completion status
  const articleDTOs: ArticleListItemDTO[] = articles.map((article) => ({
    id: article.id,
    title: article.title,
    level: article.level,
    difficulty_weight: article.difficulty_weight,
    summary: article.summary,
    created_at: article.created_at,
    is_completed: completionMap.has(article.id),
    completed_at: completionMap.get(article.id) ?? null,
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
    articles: articleDTOs,
    pagination: paginationMeta,
  };
}

/**
 * Retrieves detailed information for a single article by ID
 *
 * @param supabase - Supabase client instance
 * @param articleId - UUID of the article to retrieve
 * @param userId - Optional authenticated user ID for completion status
 * @returns Promise resolving to article detail or null if not found
 * @throws Error if database query fails
 */
export async function getArticleDetail(
  supabase: SupabaseClient,
  articleId: string,
  userId?: string
): Promise<GetArticleDetailResponseDTO | null> {
  // Fetch article data
  const { data: article, error } = await supabase
    .from("articles")
    .select(
      `
      id,
      title,
      level,
      difficulty_weight,
      summary,
      content,
      key_takeaways,
      created_at,
      updated_at
    `
    )
    .eq("id", articleId)
    .single();

  if (error || !article) {
    return null;
  }

  // Fetch completion status if user is authenticated
  let completionData = null;
  if (userId) {
    const { data: completion } = await supabase
      .from("user_articles")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("article_id", articleId)
      .maybeSingle();

    completionData = completion;
  }

  // Construct and return response DTO
  return {
    id: article.id,
    title: article.title,
    level: article.level,
    difficulty_weight: article.difficulty_weight,
    summary: article.summary,
    content: article.content,
    key_takeaways: article.key_takeaways,
    created_at: article.created_at,
    updated_at: article.updated_at,
    is_completed: !!completionData,
    completed_at: completionData?.completed_at || null,
  };
}

/**
 * Records article completion for a user (idempotent)
 *
 * @param supabase - Supabase client instance
 * @param articleId - UUID of the article to mark as completed
 * @param userId - UUID of the authenticated user
 * @returns Promise resolving to completion response DTO
 * @throws Error if article doesn't exist or database operation fails
 */
export async function completeArticle(
  supabase: SupabaseClient,
  articleId: string,
  userId: string
): Promise<CompleteArticleResponseDTO> {
  // First, verify that the article exists
  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id")
    .eq("id", articleId)
    .maybeSingle();

  if (articleError) {
    throw new Error("Failed to verify article existence");
  }

  if (!article) {
    throw new Error("Article not found");
  }

  // Check if completion record already exists
  const { data: existingCompletion, error: checkError } = await supabase
    .from("user_articles")
    .select("article_id, user_id, completed_at")
    .eq("user_id", userId)
    .eq("article_id", articleId)
    .maybeSingle();

  if (checkError) {
    throw new Error("Failed to check existing completion status");
  }

  // If already completed, return existing record with status
  if (existingCompletion) {
    return {
      article_id: existingCompletion.article_id,
      user_id: existingCompletion.user_id,
      completed_at: existingCompletion.completed_at,
      status: "already_completed",
    };
  }

  // Insert new completion record
  const { data: newCompletion, error: insertError } = await supabase
    .from("user_articles")
    .insert({
      user_id: userId,
      article_id: articleId,
    })
    .select("article_id, user_id, completed_at")
    .single();

  if (insertError || !newCompletion) {
    throw new Error("Failed to record article completion");
  }

  return {
    article_id: newCompletion.article_id,
    user_id: newCompletion.user_id,
    completed_at: newCompletion.completed_at,
    status: "created",
  };
}
