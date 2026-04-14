import * as React from "react"
import { Input } from "./input"
import { Label } from "./label"
import { cn } from "../lib/utils"

/** Common user profile data shared across admin UI and patient portal */
export interface UserProfileData {
  firstName: string
  lastName: string
  email: string
}

export interface UserProfileFormFieldsProps {
  values: UserProfileData
  onChange: (field: keyof UserProfileData, value: string) => void
  /** Make specific fields read-only */
  readOnly?: Partial<Record<keyof UserProfileData, boolean>>
  /** Show helper text under specific fields */
  helperText?: Partial<Record<keyof UserProfileData, string>>
  /** Labels override for i18n support */
  labels?: Partial<Record<keyof UserProfileData, string>>
  /** Wrapper class for the grid container */
  className?: string
  /** Additional fields rendered after the standard ones */
  children?: React.ReactNode
}

/** Shared user profile form fields (first name, last name, email) used across apps */
export function UserProfileFormFields({
  values,
  onChange,
  readOnly = {},
  helperText = {},
  labels = {},
  className,
  children,
}: UserProfileFormFieldsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="profile-firstName">
            {labels.firstName ?? "First Name"}
          </Label>
          <Input
            id="profile-firstName"
            placeholder="e.g., John"
            value={values.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            disabled={readOnly.firstName}
            required
          />
          {helperText.firstName && (
            <p className="text-xs text-muted-foreground">{helperText.firstName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-lastName">
            {labels.lastName ?? "Last Name"}
          </Label>
          <Input
            id="profile-lastName"
            placeholder="e.g., Smith"
            value={values.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            disabled={readOnly.lastName}
            required
          />
          {helperText.lastName && (
            <p className="text-xs text-muted-foreground">{helperText.lastName}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-email">
          {labels.email ?? "Email Address"}
        </Label>
        <Input
          id="profile-email"
          type="email"
          placeholder="john.smith@example.com"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          disabled={readOnly.email}
          required
        />
        {helperText.email && (
          <p className="text-xs text-muted-foreground">{helperText.email}</p>
        )}
      </div>

      {children}
    </div>
  )
}
