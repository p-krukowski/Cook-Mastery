/**
 * Data Transfer Objects (DTOs) and Command Models for Cook Mastery API
 * 
 * This file contains all type definitions for API requests and responses.
 * All types are derived from database entity definitions in database.types.ts
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from './db/database.types';

// ============================================================================
// Base Entity Types (Re-exported from database types)
// ============================================================================

export type ArticleEntity = Tables<'articles'>;
export type TutorialEntity = Tables<'tutorials'>;
export type ProfileEntity = Tables<'profiles'>;
export type CookbookEntryEntity = Tables<'cookbook_entries'>;
export type UserArticleEntity = Tables<'user_articles'>;
export type UserTutorialEntity = Tables<'user_tutorials'>;
export type UserLevelProgressEntity = Tables<'user_level_progress'>;

export type DifficultyLevel = Enums<'difficulty_level'>;
export type TutorialCategory = Enums<'tutorial_category'>;

// ============================================================================
// Tutorial Step Type
// ============================================================================

/**
 * Represents a single step within a tutorial.
 * Extracted from the JSONB steps column in tutorials table.
 */
export interface TutorialStep {
  title: string;
  content: string;
  order: number;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Standard pagination metadata returned with all list endpoints
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
}

/**
 * Query parameters for paginated endpoints
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ============================================================================
// Tutorial DTOs
// ============================================================================

/**
 * Tutorial list item DTO - used in GET /api/tutorials
 * Includes completion status when user is authenticated
 */
export interface TutorialListItemDTO
  extends Pick<
    TutorialEntity,
    'id' | 'title' | 'category' | 'level' | 'difficulty_weight' | 'summary' | 'created_at'
  > {
  is_completed: boolean;
}

/**
 * Tutorial detail DTO - used in GET /api/tutorials/:id
 * Includes full content and completion information
 */
export interface TutorialDetailDTO
  extends Pick<
    TutorialEntity,
    | 'id'
    | 'title'
    | 'category'
    | 'level'
    | 'difficulty_weight'
    | 'summary'
    | 'content'
    | 'practice_recommendations'
    | 'key_takeaways'
    | 'created_at'
    | 'updated_at'
  > {
  steps: TutorialStep[];
  is_completed: boolean;
  completed_at: string | null;
}

/**
 * Query parameters for GET /api/tutorials
 */
export interface ListTutorialsParams extends PaginationParams {
  level?: DifficultyLevel;
  category?: TutorialCategory;
  sort?: 'difficulty_asc' | 'newest';
  include_completed?: boolean;
}

/**
 * Response DTO for GET /api/tutorials
 */
export interface ListTutorialsResponseDTO {
  tutorials: TutorialListItemDTO[];
  pagination: PaginationMeta;
}

/**
 * Response DTO for GET /api/tutorials/:id
 */
export type GetTutorialDetailResponseDTO = TutorialDetailDTO;

// ============================================================================
// Article DTOs
// ============================================================================

/**
 * Article list item DTO - used in GET /api/articles
 * Includes completion status when user is authenticated
 */
export interface ArticleListItemDTO
  extends Pick<
    ArticleEntity,
    'id' | 'title' | 'level' | 'difficulty_weight' | 'summary' | 'created_at'
  > {
  is_completed: boolean;
  completed_at: string | null;
}

/**
 * Article detail DTO - used in GET /api/articles/:id
 * Includes full content and completion information
 */
export interface ArticleDetailDTO
  extends Pick<
    ArticleEntity,
    | 'id'
    | 'title'
    | 'level'
    | 'difficulty_weight'
    | 'summary'
    | 'content'
    | 'key_takeaways'
    | 'created_at'
    | 'updated_at'
  > {
  is_completed: boolean;
  completed_at: string | null;
}

/**
 * Query parameters for GET /api/articles
 */
export interface ListArticlesParams extends PaginationParams {
  level?: DifficultyLevel;
  sort?: 'difficulty_asc' | 'newest';
  include_completed?: boolean;
}

/**
 * Response DTO for GET /api/articles
 */
export interface ListArticlesResponseDTO {
  articles: ArticleListItemDTO[];
  pagination: PaginationMeta;
}

/**
 * Response DTO for GET /api/articles/:id
 */
export type GetArticleDetailResponseDTO = ArticleDetailDTO;

// ============================================================================
// Cookbook Entry DTOs
// ============================================================================

/**
 * Cookbook entry DTO - used for all cookbook endpoints
 * Represents a saved recipe link with optional notes
 */
export type CookbookEntryDTO = Pick<
  CookbookEntryEntity,
  'id' | 'user_id' | 'url' | 'title' | 'notes' | 'created_at' | 'updated_at'
>;

/**
 * Query parameters for GET /api/cookbook
 */
export interface ListCookbookEntriesParams extends PaginationParams {
  sort?: 'newest' | 'oldest' | 'title_asc';
}

/**
 * Response DTO for GET /api/cookbook
 */
export interface ListCookbookEntriesResponseDTO {
  entries: CookbookEntryDTO[];
  pagination: PaginationMeta;
}

/**
 * Response DTO for GET /api/cookbook/:id
 */
export type GetCookbookEntryResponseDTO = CookbookEntryDTO;

/**
 * Command model for POST /api/cookbook
 * Creates a new cookbook entry for the authenticated user
 */
export interface CreateCookbookEntryCommand
  extends Pick<TablesInsert<'cookbook_entries'>, 'url' | 'title' | 'notes'> {}

/**
 * Command model for PATCH /api/cookbook/:id
 * Updates an existing cookbook entry (all fields optional)
 */
export interface UpdateCookbookEntryCommand
  extends Partial<Pick<TablesUpdate<'cookbook_entries'>, 'url' | 'title' | 'notes'>> {}

/**
 * Response DTO for POST /api/cookbook
 */
export type CreateCookbookEntryResponseDTO = CookbookEntryDTO;

/**
 * Response DTO for PATCH /api/cookbook/:id
 */
export type UpdateCookbookEntryResponseDTO = CookbookEntryDTO;

/**
 * Response DTO for DELETE /api/cookbook/:id
 */
export interface DeleteCookbookEntryResponseDTO {
  message: string;
}

// ============================================================================
// Profile DTOs
// ============================================================================

/**
 * Profile DTO - represents user profile information
 */
export type ProfileDTO = Pick<
  ProfileEntity,
  'id' | 'username' | 'selected_level' | 'created_at' | 'updated_at'
>;

/**
 * Command model for updating user profile
 * All fields are optional to support partial updates
 */
export interface UpdateProfileCommand
  extends Partial<Pick<TablesUpdate<'profiles'>, 'username' | 'selected_level'>> {}

// ============================================================================
// User Progress DTOs
// ============================================================================

/**
 * Level progress DTO - represents completion progress for a specific difficulty level
 * Derived from user_level_progress view
 */
export interface LevelProgressDTO {
  level: DifficultyLevel;
  total_count: number;
  completed_count: number;
  completion_percent: number;
  is_up_to_date: boolean;
}

/**
 * User progress summary DTO - aggregates progress across all levels
 */
export interface UserProgressSummaryDTO {
  user_id: string;
  selected_level: DifficultyLevel;
  level_progress: LevelProgressDTO[];
  can_advance: boolean; // true if completion_percent >= 85% and selected_level != 'EXPERIENCED'
}

/**
 * Command model for POST /api/tutorials/:id/complete
 * Records tutorial completion for the authenticated user
 */
export type CompleteTutorialCommand = Pick<TablesInsert<'user_tutorials'>, 'tutorial_id'>;

/**
 * Response DTO for POST /api/tutorials/:id/complete
 */
export interface CompleteTutorialResponseDTO {
  tutorial_id: string;
  user_id: string;
  completed_at: string;
  status: 'created' | 'already_completed';
}

/**
 * Command model for POST /api/articles/:id/complete
 * Records article completion for the authenticated user
 */
export type CompleteArticleCommand = Pick<TablesInsert<'user_articles'>, 'article_id'>;

/**
 * Response DTO for POST /api/articles/:id/complete
 */
export interface CompleteArticleResponseDTO {
  article_id: string;
  user_id: string;
  completed_at: string;
  status: 'created' | 'already_completed';
}

// ============================================================================
// Authentication DTOs
// ============================================================================

/**
 * Command model for user signup
 * Combines Supabase Auth requirements with profile creation
 */
export interface SignUpCommand {
  email: string;
  password: string;
  username: string;
  selected_level: DifficultyLevel;
}

/**
 * Response DTO for successful signup
 * Returns user profile and session information
 */
export interface SignUpResponseDTO {
  user: {
    id: string;
    email: string;
  };
  profile: ProfileDTO;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Command model for user login
 * Accepts either email or username as identifier
 */
export interface LoginCommand {
  identifier: string; // email or username
  password: string;
}

/**
 * Response DTO for successful login
 */
export interface LoginResponseDTO {
  user: {
    id: string;
    email: string;
  };
  profile: ProfileDTO;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}

/**
 * Response DTO for logout
 */
export interface LogoutResponseDTO {
  message: string;
}

/**
 * Response DTO for GET /api/auth/session
 * Returns current user session information
 */
export interface GetSessionResponseDTO {
  user: {
    id: string;
    email: string;
  };
  profile: ProfileDTO;
}

// ============================================================================
// Error Response DTOs
// ============================================================================

/**
 * Standard error response structure for all API endpoints
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

/**
 * Common error codes used across the API
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR';

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Extract user ID from authenticated request context
 */
export type AuthenticatedUserId = string;

/**
 * Sort order types used across multiple endpoints
 */
export type SortOrder = 'asc' | 'desc';

/**
 * Common success message response
 */
export interface SuccessMessageResponse {
  message: string;
}
