// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Kisi Access Control - Module Index
 *
 * The Kisi HTTP client. Everything above it — entity mapping, Keycloak sync,
 * the overview — belongs to KisiAccessProvider in lib/access-control, which is
 * what the admin routes talk to.
 */

export { KisiClient, KisiApiError } from './client'
export type {
  KisiClientConfig,
  KisiPlace,
  KisiLock,
  KisiGroup,
  KisiMember,
  KisiGroupLock,
  KisiEvent,
  KisiCreateMemberRequest,
  KisiCreateGroupRequest,
  KisiListParams,
  KisiPaginatedResponse,
  KisiPagination,
  KisiUnlockResponse,
} from './client'
