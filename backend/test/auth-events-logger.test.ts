// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Auth Events Logger — Unit Tests
 *
 * The shared BaseEventsLogger machinery is covered once, in the shared suite.
 * What is specific to auth is its Keycloak mapping and its polled event types.
 */

import { AUTH_EVENT_TYPES, mapAuthEvent } from '../src/lib/auth-events-logger'
import { runBaseEventsLoggerSuite, runKeycloakMapperSuite } from './helpers/events-logger-suite'

runBaseEventsLoggerSuite()

runKeycloakMapperSuite({
  name: 'Auth Events Logger',
  mapEvent: mapAuthEvent,
  successType: 'LOGIN',
  errorType: 'LOGIN_ERROR',
  eventTypes: AUTH_EVENT_TYPES,
})
