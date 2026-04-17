import { Elysia, t } from 'elysia'
import { join } from 'path'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { logger } from '@/lib/logger'
import { ErrorResponse } from '@/schemas'
import { getAppStoreConfig, hideApp, showApp } from '@/lib/app-store-config'

/**
 * Admin App Store management routes.
 * Lets admins list all discovered apps (including hidden ones) and toggle visibility.
 */

/** Discover all apps (unfiltered) — duplicates the logic from app-factory but always includes hidden */
function discoverAllApps() {
  const appsDir = join(process.cwd(), 'public', 'apps')
  if (!existsSync(appsDir)) return []

  const { hiddenAppIds } = getAppStoreConfig()

  return readdirSync(appsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => {
      const manifestPath = join(appsDir, d.name, 'smart-manifest.json')
      if (!existsSync(manifestPath)) return null
      try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        return {
          id: d.name,
          launch_url: `/apps/${d.name}/`,
          client_id: manifest.client_id ?? d.name,
          client_name: manifest.client_name ?? d.name,
          description: manifest.description ?? '',
          category: manifest.category ?? 'other',
          icon: manifest.icon ?? 'app-window',
          hidden: hiddenAppIds.includes(d.name),
        }
      } catch { return null }
    })
    .filter(Boolean) as { id: string; launch_url: string; client_id: string; client_name: string; description: string; category: string; icon: string; hidden: boolean }[]
}

const AppStoreApp = t.Object({
  id: t.String(),
  launch_url: t.String(),
  client_id: t.String(),
  client_name: t.String(),
  description: t.String(),
  category: t.String(),
  icon: t.String(),
  hidden: t.Boolean(),
})

const AppStoreListResponse = t.Object({
  apps: t.Array(AppStoreApp),
  hiddenAppIds: t.Array(t.String()),
  updatedAt: t.String(),
})

const AppStoreToggleResponse = t.Object({
  success: t.Boolean(),
  hiddenAppIds: t.Array(t.String()),
  updatedAt: t.String(),
})

export const appStoreAdminRoutes = new Elysia({ prefix: '/app-store' })
  // GET /admin/app-store — list all discovered apps with visibility status
  .get('/', () => {
    const apps = discoverAllApps()
    const config = getAppStoreConfig()
    return {
      apps,
      hiddenAppIds: config.hiddenAppIds,
      updatedAt: config.updatedAt,
    }
  }, {
    response: { 200: AppStoreListResponse },
    detail: {
      summary: 'List App Store Apps',
      description: 'List all discovered SMART apps with their visibility status in the public app store',
      tags: ['app-store'],
    },
  })
  // POST /admin/app-store/:appId/hide — hide an app from the public store
  .post('/:appId/hide', ({ params }) => {
    const config = hideApp(params.appId)
    logger.server.info(`App store: hid app "${params.appId}"`)
    return { success: true, hiddenAppIds: config.hiddenAppIds, updatedAt: config.updatedAt }
  }, {
    params: t.Object({ appId: t.String() }),
    response: { 200: AppStoreToggleResponse },
    detail: {
      summary: 'Hide App from Store',
      description: 'Hide a SMART app from the public app store page',
      tags: ['app-store'],
    },
  })
  // POST /admin/app-store/:appId/show — show an app in the public store
  .post('/:appId/show', ({ params }) => {
    const config = showApp(params.appId)
    logger.server.info(`App store: showed app "${params.appId}"`)
    return { success: true, hiddenAppIds: config.hiddenAppIds, updatedAt: config.updatedAt }
  }, {
    params: t.Object({ appId: t.String() }),
    response: { 200: AppStoreToggleResponse },
    detail: {
      summary: 'Show App in Store',
      description: 'Show a previously hidden SMART app in the public app store page',
      tags: ['app-store'],
    },
  })
