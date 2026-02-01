import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { LevelSelector } from "../auth/LevelSelector";
import { ProgressPanel } from "./ProgressPanel";
import { useUserProgress } from "./useUserProgress";
import type { ProfileDTO, DifficultyLevel, UpdateProfileCommand, ApiErrorResponse } from "../../types";

interface ProfileViewProps {
  user: {
    id: string;
    email: string;
  };
  profile: ProfileDTO;
  enableProgress?: boolean;
}

/**
 * ProfileView component
 * Displays user profile information, level settings, and logout functionality
 */
export default function ProfileView({ user, profile, enableProgress = true }: ProfileViewProps) {
  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Level settings state
  const [savedLevel, setSavedLevel] = useState<DifficultyLevel>(profile.selected_level);
  const [draftLevel, setDraftLevel] = useState<DifficultyLevel>(profile.selected_level);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derived state
  const isDirty = draftLevel !== savedLevel;

  // Progress tracking state
  const {
    data: progressData,
    isLoading: isLoadingProgress,
    error: progressError,
    retry: retryProgress,
  } = useUserProgress({ enabled: enableProgress });

  /**
   * Handle level selection change
   */
  const handleLevelChange = useCallback((level: DifficultyLevel) => {
    setDraftLevel(level);
    setSaveError(null); // Clear any existing errors
  }, []);

  /**
   * Handle save level action
   * Calls PATCH /api/profile and updates local state on success
   */
  const handleSaveLevel = useCallback(async () => {
    // Guard: should not happen due to disabled state, but defensive check
    if (!isDirty || isSaving) {
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const command: UpdateProfileCommand = {
        selected_level: draftLevel,
      };

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      // Handle 401 - session expired
      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      // Handle validation errors (400)
      if (response.status === 400) {
        const errorData = (await response.json()) as ApiErrorResponse;

        // Check for field-specific error
        if (errorData.error.details?.selected_level) {
          setSaveError(errorData.error.details.selected_level);
        } else if (errorData.error.details?.general) {
          setSaveError(errorData.error.details.general);
        } else {
          setSaveError(errorData.error.message);
        }
        return;
      }

      // Handle other client/server errors with toast
      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;

        // Rate limit or server errors get toast
        if (response.status === 429) {
          toast.error("Too many requests. Please try again in a moment.");
        } else {
          toast.error(errorData.error.message || "Failed to update level");
        }
        return;
      }

      // Success - update local state
      const updatedProfile = (await response.json()) as ProfileDTO;
      setSavedLevel(updatedProfile.selected_level);
      setDraftLevel(updatedProfile.selected_level);
      setSaveError(null);
      toast.success("Level updated");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // Network error
      toast.error("Couldn't update level. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  }, [draftLevel, isDirty, isSaving]);

  /**
   * Handle logout action
   * Calls the logout API endpoint and redirects to login on success
   */
  const handleLogout = useCallback(async () => {
    // Reset error state
    setLogoutError(null);
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Failed to log out");
      }

      // Redirect to login page on successful logout
      window.location.href = "/login";
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      setLogoutError("Failed to log out");
      setIsLoggingOut(false);
    }
  }, []);

  // Format the difficulty level for display
  const formatLevel = (level: string): string => {
    return level.charAt(0) + level.slice(1).toLowerCase();
  };

  // Client-side date formatting state
  const [formattedDate, setFormattedDate] = useState<string>("");

  // Format date on client-side to avoid hydration mismatch
  useEffect(() => {
    setFormattedDate(
      new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, [profile.created_at]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-3xl font-bold">Profile</h1>

      <div className="space-y-6">
        {/* Profile Information Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Account Information</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Username</p>
              <p className="text-base">{profile.username}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-base">{user.email}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Level</p>
              <p className="text-base">{formatLevel(savedLevel)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="text-base">{formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Progress Panel */}
        {enableProgress && (
          <ProgressPanel
            isLoading={isLoadingProgress}
            error={progressError || undefined}
            progress={progressData || undefined}
            onRetry={retryProgress}
          />
        )}

        {/* Level Settings Card */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Learning Level</h2>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Changing your level will change recommendations on the home page.
            </p>

            {/* Level Selector */}
            <LevelSelector
              value={draftLevel}
              onChange={handleLevelChange}
              disabled={isSaving}
              error={saveError || undefined}
            />

            {/* Inline error display */}
            {saveError && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>}

            {/* Save button */}
            <Button onClick={handleSaveLevel} disabled={!isDirty || isSaving} className="w-full sm:w-auto">
              {isSaving ? "Saving..." : "Save level"}
            </Button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Session</h2>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Log out of your account to end your current session.</p>

            {logoutError && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{logoutError}</div>
            )}

            <Button variant="destructive" onClick={handleLogout} disabled={isLoggingOut} className="w-full sm:w-auto">
              {isLoggingOut ? "Logging out..." : "Log out"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
