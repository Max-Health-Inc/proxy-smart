// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Linking a broker identity to an existing user.
 *
 * THE DEFECT THIS PINS. The route takes the LOCAL Keycloak user as a path parameter and the REMOTE
 * subject in the body, and both were called `userId`. Any client that flattens path and body into one
 * argument list — the generated MCP tool surface does — collapses them and drops one, so the endpoint
 * could not be called at all.
 *
 * That is not cosmetic. A user created out-of-band has no broker link, and Keycloak's first-broker
 * login then demands proof of ownership it cannot get from a passwordless account. Writing the link is
 * the repair, and it was unreachable — the account had to be deleted and recreated instead.
 */
import { describe, it, expect } from 'bun:test'
import { LinkFederatedIdentityRequest } from '../src/schemas/admin/users'

/** The property names a client sees, which is where the collision happened. */
function fields(schema: { properties?: unknown }): string[] {
  return Object.keys((schema.properties ?? {}) as Record<string, unknown>)
}

describe('LinkFederatedIdentityRequest', () => {
  it('does not name any field `userId`', () => {
    // `userId` is taken by the path parameter naming the LOCAL user; reusing it here is the bug.
    expect(fields(LinkFederatedIdentityRequest)).not.toContain('userId')
  })

  it('carries the provider-side subject and username under distinct names', () => {
    expect(fields(LinkFederatedIdentityRequest).sort()).toEqual(['providerUserId', 'providerUserName'])
  })

  it('requires both, since a link missing either matches nothing at login', () => {
    const schema = LinkFederatedIdentityRequest as unknown as { required?: string[] }
    expect(schema.required?.sort()).toEqual(['providerUserId', 'providerUserName'])
  })
})
