// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Email Events Logger — Unit Tests
 *
 * The shared BaseEventsLogger machinery is covered once, in the shared suite.
 * What is specific to email is its Keycloak mapping and its polled event types.
 */

import { EMAIL_EVENT_TYPES, mapEmailEvent } from '../src/lib/email-events-logger'
import { runKeycloakMapperSuite } from './helpers/events-logger-suite'

runKeycloakMapperSuite({
  name: 'Email Events Logger',
  mapEvent: mapEmailEvent,
  successType: 'SEND_RESET_PASSWORD',
  errorType: 'SEND_RESET_PASSWORD_ERROR',
  eventTypes: EMAIL_EVENT_TYPES,
})
