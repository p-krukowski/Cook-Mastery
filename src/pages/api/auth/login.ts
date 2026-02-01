import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "../../../db/supabase.client.ts";
import { supabaseAdminClient } from "../../../db/supabase.admin.ts";
import { createJsonResponse, formatZodError, createErrorResponse, logError } from "../../../lib/utils/error-handler.ts";
import type { LoginResponseDTO, ProfileDTO } from "../../../types.ts";

/**
 * Disable prerendering for this API route
 */
export const prerender = false;

/**
 * Zod schema for login request validation
 */
const LoginBodySchema = z.object({
  identifier: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * Check if string is a valid email format
 */
function isEmailFormat(identifier: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(identifier);
}

/**
 * Resolve identifier (username or email) to email address
 * If identifier is email format, return it directly
 * If identifier is username, look up user in profiles and get email via admin client
 *
 * @returns email address or null if not found
 */
async function resolveIdentifierToEmail(
  identifier: string,
  supabase: ReturnType<typeof createSupabaseServerInstance>
): Promise<string | null> {
  // If identifier looks like an email, use it directly
  if (isEmailFormat(identifier)) {
    return identifier;
  }

  // Otherwise, treat as username and look up in profiles
  // Username is case-sensitive, alphanumeric only, no whitespace
  const { data: profile, error } = await supabase.from("profiles").select("id").eq("username", identifier).single();

  if (error || !profile) {
    // Username not found - return null (don't reveal this to client)
    return null;
  }

  // Get user email from auth.users via admin client
  const { data: authUser, error: authError } = await supabaseAdminClient.auth.admin.getUserById(profile.id);

  if (authError || !authUser.user) {
    logError("POST /api/auth/login - getUserById", authError, { userId: profile.id });
    return null;
  }

  return authUser.user.email ?? null;
}

/**
 * POST /api/auth/login
 *
 * Authenticates user with email or username + password
 * Returns user and profile information
 * Session is established via HttpOnly cookies
 *
 * Security: Returns generic error for invalid credentials to prevent account enumeration
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = LoginBodySchema.safeParse(body);

    if (!validation.success) {
      return createJsonResponse(formatZodError(validation.error), 400);
    }

    const { identifier, password } = validation.data;

    // Create request-scoped Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Resolve identifier to email
    const email = await resolveIdentifierToEmail(identifier, supabase);

    if (!email) {
      // Username/email not found - return generic error
      return createJsonResponse(createErrorResponse("UNAUTHORIZED", "Invalid credentials"), 401);
    }

    // Attempt login with email and password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      // Invalid password or other auth error - return generic error
      logError("POST /api/auth/login - signInWithPassword", authError, { email });
      return createJsonResponse(createErrorResponse("UNAUTHORIZED", "Invalid credentials"), 401);
    }

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, selected_level, created_at, updated_at")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      logError("POST /api/auth/login - fetch profile", profileError, { userId: authData.user.id });
      return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "Failed to fetch user profile"), 500);
    }

    // Return success response (session is in HttpOnly cookies)
    const response: LoginResponseDTO = {
      user: {
        id: authData.user.id,
        email: authData.user.email ?? "",
      },
      profile: profile as ProfileDTO,
    };

    return createJsonResponse(response, 200);
  } catch (error) {
    logError("POST /api/auth/login", error);
    return createJsonResponse(createErrorResponse("INTERNAL_SERVER_ERROR", "An unexpected error occurred"), 500);
  }
};
