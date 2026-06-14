#!/usr/bin/env bun
/**
 * proxy-smart — admin CLI entry point.
 *
 * Authenticates to the proxy-smart admin REST API via Keycloak OAuth (device
 * flow for humans, client_credentials for CI) and drives the admin endpoints
 * through the generated, typed API client.
 *
 * This module is both the executable (`bin`) and the package entry point, so
 * it re-exports the reusable building blocks for programmatic consumers while
 * only running the CLI when invoked directly.
 */
export * from './config'
export * from './oauth'
export * from './session'
export * from './client'
export * from './args'
export * from './cli'

import { run } from './cli'

// Only execute the CLI when run as a script, not when imported as a library.
if (import.meta.main) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code
    })
    .catch((error: unknown) => {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
      process.exitCode = 1
    })
}
