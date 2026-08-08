// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Self-service profile schemas.
 *
 * Distinct from the admin healthcare-user schemas: these carry no user id and no
 * roles. The subject always comes from the caller's validated token.
 */

import { t } from 'elysia'

export const ProfileResponse = t.Object({
  id: t.String(),
  username: t.String(),
  email: t.Optional(t.String()),
  firstName: t.Optional(t.String()),
  lastName: t.Optional(t.String()),
  emailVerified: t.Boolean(),
  /** SMART `fhirUser` claim, when the account is mapped to a FHIR resource. */
  fhirUser: t.Optional(t.String()),
  organization: t.Optional(t.String()),
  /** True when the account signs in through a brokered identity provider. */
  federated: t.Boolean(),
})

export const UpdateProfileRequest = t.Object({
  firstName: t.Optional(t.String({ maxLength: 255 })),
  lastName: t.Optional(t.String({ maxLength: 255 })),
  email: t.Optional(t.String({ format: 'email', maxLength: 255 })),
})

export const ChangePasswordRequest = t.Object({
  newPassword: t.String({ minLength: 8, maxLength: 256 }),
})

export const ProfileErrorResponse = t.Object({
  error: t.String(),
  message: t.Optional(t.String()),
})

export type ProfileResponseType = typeof ProfileResponse.static
export type UpdateProfileRequestType = typeof UpdateProfileRequest.static
export type ChangePasswordRequestType = typeof ChangePasswordRequest.static
