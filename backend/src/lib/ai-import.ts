// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * Bridge to the clinical narrative importer.
 *
 * The extraction pipeline itself lives in `@max-health-inc/connect-engine`, a
 * proprietary package, and is declared here as an OPTIONAL dependency. This repo
 * is public: a clone without a GitHub Packages token installs without it, and
 * every AI route then reports itself unconfigured instead of failing to build.
 * That is why the package is reached through a runtime import behind a shape
 * guard rather than a static one.
 *
 * What stays on this side is the part that cannot move: PDF text extraction
 * wants Java and a filesystem (see `@/lib/pdf-extract-opendataloader`), and the
 * routes own SMART token validation and the response schemas.
 */
import { openai } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

import { config } from '@/config'
import { logger } from '@/lib/logger'
import { requestServiceAccountToken } from '@/lib/service-account'

const CLINICAL_NARRATIVE_MODULE = '@max-health-inc/connect-engine/clinical-narrative'
const MODEL_MODULE = '@max-health-inc/connect-engine/model'

// ---------------------------------------------------------------------------
// The slice of the engine's surface this bridge uses
// ---------------------------------------------------------------------------

export interface ImportedResourceShape {
  resourceType: string
  resource: Record<string, unknown>
  retriesNeeded: number
  warnings: string[]
}

export interface FailedResourceShape {
  resourceType: string
  errors: string[]
  warnings: string[]
  retriesAttempted: number
}

export interface NarrativeImportResult {
  resources: ImportedResourceShape[]
  failed: FailedResourceShape[]
  documentReference?: Record<string, unknown>
  processingTimeMs: number
}

export interface NarrativeImporter {
  importDocument(
    markdown: string,
    options: {
      patientId: string
      fileName: string
      pdfBase64?: string
      pagesProcessed?: number
      language?: string
    },
  ): Promise<NarrativeImportResult>
  importText(
    text: string,
    options: { patientId: string; language?: string },
  ): Promise<NarrativeImportResult>
}

interface ClinicalNarrativeModule {
  ClinicalNarrativeImporter: new (config: {
    model: LanguageModel
    maxRetries?: number
    log?: {
      info?(message: string, detail?: Record<string, unknown>): void
      warn?(message: string, detail?: Record<string, unknown>): void
      error?(message: string, detail?: Record<string, unknown>): void
    }
  }) => NarrativeImporter
}

interface ModelModule {
  resolveImportModel(config: {
    gatewayUrl?: string | null
    accessToken?: string | null
    model: string
    fallback?: LanguageModel | null
  }): LanguageModel
}

function isClinicalNarrativeModule(value: unknown): value is ClinicalNarrativeModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'ClinicalNarrativeImporter') === 'function'
  )
}

function isModelModule(value: unknown): value is ModelModule {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'resolveImportModel') === 'function'
  )
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

interface Engine {
  narrative: ClinicalNarrativeModule
  model: ModelModule
}

let engine: Engine | null = null
let engineMissing = false

/**
 * Load the optional engine once.
 *
 * A miss is remembered: the package is either installed for the life of the
 * process or it is not, and retrying the import on every request would turn one
 * missing dependency into a per-request cost.
 */
async function loadEngine(): Promise<Engine | null> {
  if (engine) return engine
  if (engineMissing) return null

  try {
    const narrative: unknown = await import(CLINICAL_NARRATIVE_MODULE)
    const model: unknown = await import(MODEL_MODULE)

    if (!isClinicalNarrativeModule(narrative) || !isModelModule(model)) {
      logger.server.error('connect-engine loaded but does not expose the expected exports')
      engineMissing = true
      return null
    }

    engine = { narrative, model }
    return engine
  } catch (err) {
    logger.server.info('connect-engine is not installed — AI import routes will report unconfigured', {
      error: err instanceof Error ? err.message : String(err),
    })
    engineMissing = true
    return null
  }
}

/** Why an importer could not be built. */
export type ImporterUnavailable =
  | { reason: 'engine-missing'; detail: string }
  | { reason: 'model-unconfigured'; detail: string }

export type ImporterResult =
  | { ok: true; importer: NarrativeImporter }
  | ({ ok: false } & ImporterUnavailable)

/**
 * Resolve the model to run on: the LLM Gateway when configured, the direct
 * provider key otherwise.
 *
 * A gateway token that cannot be minted is not fatal — the deployment may also
 * hold a provider key — so the failure is logged and the direct model is used.
 */
async function buildModel(model: ModelModule): Promise<LanguageModel> {
  const fallback = config.ai.openaiApiKey ? openai(config.ai.model) : null

  let accessToken: string | null = null
  if (config.ai.gateway.isConfigured) {
    try {
      accessToken = await requestServiceAccountToken({
        clientId: config.ai.gateway.clientId,
        clientSecret: config.ai.gateway.clientSecret,
        scope: config.ai.gateway.scope,
      })
    } catch (err) {
      logger.server.warn('Could not mint an LLM Gateway service-account token', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return model.resolveImportModel({
    gatewayUrl: config.ai.gateway.url,
    accessToken,
    model: config.ai.model,
    fallback,
  })
}

/**
 * Build an importer, or say why one is not available.
 *
 * Callers turn a failure into 503: neither cause is something a retry or a
 * different request body would fix.
 */
export async function createNarrativeImporter(): Promise<ImporterResult> {
  const loaded = await loadEngine()
  if (!loaded) {
    return {
      ok: false,
      reason: 'engine-missing',
      detail: 'Document import requires @max-health-inc/connect-engine, which is not installed',
    }
  }

  try {
    const model = await buildModel(loaded.model)
    const importer = new loaded.narrative.ClinicalNarrativeImporter({
      model,
      log: {
        info: (message, detail) => logger.server.info(message, detail),
        warn: (message, detail) => logger.server.warn(message, detail),
        error: (message, detail) => logger.server.error(message, detail),
      },
    })
    return { ok: true, importer }
  } catch (err) {
    return {
      ok: false,
      reason: 'model-unconfigured',
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}
