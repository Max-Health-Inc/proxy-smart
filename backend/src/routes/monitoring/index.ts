// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/** Monitoring modules — one per event source, all built on ./factory. */

export { adminAuditMonitoringRoutes } from './admin-audit'
export { authMonitoringRoutes } from './auth'
export { consentMonitoringRoutes } from './consent'
export { emailMonitoringRoutes } from './email'
export { fhirMonitoringRoutes } from './fhir'
export { fhirProxyMonitoringRoutes } from './fhir-proxy'
export { oauthMonitoringRoutes } from './oauth'
