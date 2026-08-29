// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @max-health-inc/proxy-smart-client
 *
 * Public surface of the generated client. `src/generated/` is emitted from
 * backend/dist/openapi.json and never edited; this file decides what of it is
 * API. The generator also exports its own helpers — `mapValues`, `querystring`,
 * `canConsumeForm`, `BaseAPI` — which are plumbing, not contract, and are
 * deliberately not re-exported here.
 */

export * from './generated/apis/index'
export * from './generated/models/index'

export {
  Configuration,
  ResponseError,
  FetchError,
  RequiredError,
  BASE_PATH,
} from './generated/runtime'

export type {
  ConfigurationParameters,
  HTTPHeaders,
  HTTPQuery,
  InitOverrideFunction,
  Middleware,
  RequestContext,
  ResponseContext,
} from './generated/runtime'
