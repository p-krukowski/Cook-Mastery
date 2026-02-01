import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { InlineFieldError } from "./InlineFieldError"
import type { ApiErrorResponse } from "@/types"

interface LoginFormData {
  identifier: string
  password: string
}

interface LoginFormErrors {
  identifier?: string
  password?: string
  general?: string
}

/**
 * Login form component with client-side validation
 * Submits to POST /api/auth/login and handles errors
 * Links to /signup for new users
 */
export function AuthFormLogin() {
  const [formData, setFormData] = React.useState<LoginFormData>({
    identifier: "",
    password: "",
  })
  const [errors, setErrors] = React.useState<LoginFormErrors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Client-side validation
  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {}

    if (!formData.identifier.trim()) {
      newErrors.identifier = "Email or username is required."
    }

    if (!formData.password) {
      newErrors.password = "Password is required."
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Clear previous errors
    setErrors({})

    // Validate
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier: formData.identifier.trim(),
          password: formData.password,
        }),
      })

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json()

        if (response.status === 401) {
          // Generic invalid credentials error
          setErrors({ general: errorData.error.message })
        } else if (response.status === 400 && errorData.error.details) {
          // Field-specific validation errors
          setErrors(errorData.error.details as LoginFormErrors)
        } else {
          // Other errors
          setErrors({ general: errorData.error.message })
        }
        return
      }

      // Success - redirect to home
      window.location.href = "/"
    } catch (error) {
      setErrors({
        general: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Log in</CardTitle>
        <CardDescription>
          Enter your email or username and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate data-test-id="login-form">
          {/* General error message */}
          {errors.general && (
            <div
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive"
              role="alert"
              aria-live="polite"
              data-test-id="login-error"
            >
              {errors.general}
            </div>
          )}

          {/* Email or Username field */}
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Username</Label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com or username"
              value={formData.identifier}
              onChange={(e) => handleInputChange("identifier", e.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!errors.identifier}
              aria-describedby={
                errors.identifier ? "identifier-error" : undefined
              }
              data-test-id="login-identifier-input"
            />
            {errors.identifier && (
              <InlineFieldError
                error={errors.identifier}
                aria-id="identifier-error"
              />
            )}
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              disabled={isSubmitting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              data-test-id="login-password-input"
            />
            {errors.password && (
              <InlineFieldError error={errors.password} aria-id="password-error" />
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            data-test-id="login-submit-button"
          >
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>

          {/* Link to signup */}
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-primary hover:underline focus:outline-none focus:underline"
            >
              Sign up
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
