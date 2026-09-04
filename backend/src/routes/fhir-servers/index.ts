// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * FHIR server routes, split by who may call them: public discovery, and
 * administration mounted inside `adminRoutes`.
 *
 * The mTLS library that used to live alongside them is lib/mtls — the modules
 * that need it are libraries themselves and should not import out of a route.
 */

export { serverDiscoveryRoutes } from './discovery'
export { fhirServersAdminRoutes } from './admin'
