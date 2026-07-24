/**
 * App-store icon resolution — single source of truth shared by the public
 * `/apps.json` feed and the admin `/admin/app-store` listing so both render the
 * same icon for a given app.
 *
 * An app's icon is, in order of preference:
 *   1. its explicitly chosen icon (SMART client logo_uri / manifest.icon), else
 *   2. a sensible default derived from its category, else
 *   3. the generic "app-window" glyph.
 *
 * The keys below must stay in sync with the SVG set in
 * `@proxy-smart/app-store` (public/index.html) and the Lucide ICON_MAP in the
 * admin UI (AppStoreManagement.tsx). The public store previously had no category
 * fallback, so a published app with no logo_uri (e.g. an imaging viewer) showed
 * the generic box even though the admin UI showed the category icon.
 */
const CATEGORY_DEFAULT_ICON: Record<string, string> = {
  clinical: 'heart-pulse',
  genomics: 'dna',
  imaging: 'scan',
  patient: 'user',
  admin: 'settings',
  administrative: 'settings',
  consent: 'clipboard-list',
}

/** Resolve the icon key to render for an app. Never returns an empty string. */
export function resolveStoreIcon(icon: string | undefined | null, category: string | undefined | null): string {
  if (icon) return icon
  return CATEGORY_DEFAULT_ICON[category ?? ''] ?? 'app-window'
}
