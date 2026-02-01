import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { supabaseAdminClient } from "../../../db/supabase.admin.ts";
import { createJsonResponse, formatZodError, createErrorResponse, logError } from "../../../lib/utils/error-handler.ts";
import type { SignUpResponseDTO, DifficultyLevel } from "../../../types.ts";

/**
 * Disable prerendering for this API route
 */
export const prerender = false;

/**
 * Zod schema for signup request validation
 */
const SignUpBodySchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  selected_level: z.enum(["BEGINNER", "INTERMEDIATE", "EXPERIENCED"], {
    errorMap: () => ({ message: "Select a valid starting level" }),
  }),
});

/**
 * POST /api/auth/signup
 *
 * Creates a new user account with:
 * - Supabase Auth user (email + password)
 * - Profile record (username + selected_level)
 *
 * Returns user and profile information
 * Session is established via HttpOnly cookies
 *
 * Security:
 * - Validates all input fields
 * - Checks for duplicate username (case-sensitive)
 * - Handles duplicate email via Supabase Auth error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = SignUpBodySchema.safeParse(body);

    if (!validation.success) {
      return createJsonResponse(formatZodError(validation.error), 400);
    }

    const { email, username, password, selected_level } = validation.data;

    // Create request-scoped Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Check for duplicate username (case-sensitive)
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("username")
      .eq("username", username)
      .maybeSingle();

    if (profileCheckError) {
      logError("POST /api/auth/signup - check username", profileCheckError, { username });
      return createJsonResponse(
        createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to check username availability"),
        500
      );
    }

    if (existingProfile) {
      return createJsonResponse(
        createErrorResponse("CONFLICT", "Username is already taken", { username: "This username is already taken" }),
        409
      );
    }

    // Create auth user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Handle duplicate email error
      if (authError?.message?.includes("already registered")) {
        return createJsonResponse(
          createErrorResponse("CONFLICT", "Email is already registered", { email: "This email is already registered" }),
          409
        );
      }

      logError("POST /api/auth/signup - signUp", authError, { email });
      return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to create account"), 500);
    }

    // Create profile record
    // Note: We use admin client here because the user was just created
    // and may not have proper session tokens yet for RLS policies
    const { data: profile, error: profileError } = await supabaseAdminClient
      .from("profiles")
      .insert({
        id: authData.user.id,
        username,
        selected_level: selected_level as DifficultyLevel,
      })
      .select("id, username, selected_level, created_at, updated_at")
      .single();

    if (profileError || !profile) {
      // Profile creation failed - clean up auth user
      logError("POST /api/auth/signup - create profile", profileError, { userId: authData.user.id });

      // Attempt to delete the auth user to avoid orphaned accounts
      await supabaseAdminClient.auth.admin.deleteUser(authData.user.id);

      return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to create user profile"), 500);
    }

    // Return success response (session is in HttpOnly cookies)
    const response: SignUpResponseDTO = {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? "",
      },
      profile: {
        id: profile.id,
        username: profile.username,
        selected_level: profile.selected_level,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      },
    };

    return createJsonResponse(response, 201);
  } catch (error) {
    logError("POST /api/auth/signup", error);
    return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred"), 500);
  }
};
