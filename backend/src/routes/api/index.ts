/**
 * Patient-facing API routes (/api/*)
 *
 * These endpoints are accessible with SMART access tokens (unlike /admin/*
 * which requires Keycloak admin tokens). Each route validates the Bearer
 * token independently.
 */

import { Elysia } from 'elysia'
import { patientDocumentImportRoutes } from './document-import'
import { patientScribeRoutes } from './patient-scribe'
import { shlRoutes } from './shl'

export const apiRoutes = new Elysia({ prefix: '/api' })
  .use(patientDocumentImportRoutes)
  .use(patientScribeRoutes)
  .use(shlRoutes)
