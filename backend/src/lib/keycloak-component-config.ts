// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Keycloak component config helpers.
 *
 * Keycloak stores component configuration (user federation providers, LDAP
 * mappers, ...) as `{ [key]: string[] }`. The admin API exposes it as a flat
 * `{ [key]: string }` record, so every component route needs both directions.
 */

/** Convert a flat config object to Keycloak's string-array config format. */
export const toKeycloakConfig = (cfg: Record<string, unknown>): Record<string, string[]> => {
  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(cfg)) {
    if (value === undefined || value === null) continue
    result[key] = [String(value)]
  }
  return result
}

/** Flatten Keycloak's string-array config into a plain string record. */
export const fromKeycloakConfig = (cfg?: Record<string, string | string[]>): Record<string, string> => {
  if (!cfg) return {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(cfg)) {
    result[key] = Array.isArray(value) ? value[0] ?? '' : value
  }
  return result
}
