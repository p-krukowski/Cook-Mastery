import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import type { ProfileDTO } from '../../types';

interface ProfileViewProps {
  user: {
    id: string;
    email: string;
  };
  profile: ProfileDTO;
}

/**
 * ProfileView component
 * Displays user profile information and logout functionality
 */
export default function ProfileView({ user, profile }: ProfileViewProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle logout action
   * Calls the logout API endpoint and redirects to login on success
   */
  const handleLogout = useCallback(async () => {
    // Reset error state
    setError(null);
    setIsLoggingOut(true);

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to log out');
      }

      // Redirect to login page on successful logout
      window.location.href = '/login';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setIsLoggingOut(false);
    }
  }, []);

  // Format the difficulty level for display
  const formatLevel = (level: string): string => {
    return level.charAt(0) + level.slice(1).toLowerCase();
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
              <p className="text-sm font-medium text-muted-foreground">Selected Level</p>
              <p className="text-base">{formatLevel(profile.selected_level)}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Member Since</p>
              <p className="text-base">{formatDate(profile.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Logout Section */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Session</h2>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Log out of your account to end your current session.
            </p>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto"
            >
              {isLoggingOut ? 'Logging out...' : 'Log out'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
