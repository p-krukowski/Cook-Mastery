import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineFieldError } from "./InlineFieldError";
import { LevelSelector } from "./LevelSelector";
import type { ApiErrorResponse, DifficultyLevel } from "@/types";

interface SignupFormData {
  email: string;
  username: string;
  password: string;
  selected_level: DifficultyLevel | null;
}

interface SignupFormErrors {
  email?: string;
  username?: string;
  password?: string;
  selected_level?: string;
  general?: string;
}

/**
 * Signup form component with client-side validation
 * Submits to POST /api/auth/signup and handles errors
 * Includes email, username, password, and level selector
 * Links to /login for existing users
 */
export function AuthFormSignup() {
  const [formData, setFormData] = React.useState<SignupFormData>({
    email: "",
    username: "",
    password: "",
    selected_level: null,
  });
  const [errors, setErrors] = React.useState<SignupFormErrors>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: SignupFormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address.";
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = "Username is required.";
    } else if (formData.username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters.";
    } else if (formData.username.trim().length > 20) {
      newErrors.username = "Username must be at most 20 characters.";
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores.";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters.";
    }

    // Level validation
    if (!formData.selected_level) {
      newErrors.selected_level = "Select a starting level.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password,
          selected_level: formData.selected_level,
        }),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();

        if (response.status === 409) {
          // Conflict - duplicate email or username
          // Server should provide field-specific error in details
          if (errorData.error.details) {
            setErrors(errorData.error.details as SignupFormErrors);
          } else {
            setErrors({ general: errorData.error.message });
          }
        } else if (response.status === 400 && errorData.error.details) {
          // Field-specific validation errors
          setErrors(errorData.error.details as SignupFormErrors);
        } else {
          // Other errors
          setErrors({ general: errorData.error.message });
        }
        return;
      }

      // Success - redirect to home
      window.location.href = "/";
    } catch {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SignupFormData, value: string | DifficultyLevel) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Enter your information to get started with Cook Mastery</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* General error message */}
          {errors.general && (
            <div
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive"
              role="alert"
              aria-live="polite"
            >
              {errors.general}
            </div>
          )}

          {/* Email field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && <InlineFieldError error={errors.email} id="email-error" />}
          </div>

          {/* Username field */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="your_username"
              value={formData.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!errors.username}
              aria-describedby={errors.username ? "username-error" : undefined}
            />
            {errors.username && <InlineFieldError error={errors.username} id="username-error" />}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            {errors.password && <InlineFieldError error={errors.password} id="password-error" />}
          </div>

          {/* Level selector */}
          <div className="space-y-2">
            <LevelSelector
              value={formData.selected_level}
              onChange={(level) => handleInputChange("selected_level", level)}
              error={errors.selected_level}
              disabled={isSubmitting}
            />
            {errors.selected_level && <InlineFieldError error={errors.selected_level} />}
          </div>

          {/* Submit button */}
          <Button type="submit" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>

          {/* Link to login */}
          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a href="/login" className="text-primary hover:underline focus:outline-none focus:underline">
              Log in
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
