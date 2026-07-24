/**
 * App-store icon/logo resolution — single source of truth shared by the public
 * `/apps.json` feed and the admin `/admin/app-store` listing so both surfaces
 * render the same thing for a given app.
 *
 * An app's visual is resolved in this order:
 *   1. its logo image — the SMART client `logo_uri` (an http(s) URL, OIDC
 *      standard). When present this is the app's own brand logo and wins.
 *   2. a curated icon key chosen in the publish dialog (e.g. "scan").
 *   3. a sensible default derived from the app's category.
 *   4. the generic "app-window" glyph.
 *
 * A stored value may therefore be EITHER a URL (case 1) or an icon key
 * (case 2); {@link resolveAppIcon} disambiguates. The category keys below must
 * stay in sync with the SVG set in `@proxy-smart/app-store` (public/index.html)
 * and the Lucide ICON_MAP in the admin UI (AppStoreManagement.tsx).
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

/** True when the value is an http(s) URL (a real logo image, not an icon key). */
export function isLogoUrl(value: string | undefined | null): boolean {
  return !!value && /^https?:\/\//i.test(value)
}

/** The category's default icon key, or the generic glyph. */
function categoryIcon(category: string | undefined | null): string {
  return CATEGORY_DEFAULT_ICON[category ?? ''] ?? 'app-window'
}

export interface ResolvedAppIcon {
  /** Curated icon key to render as an SVG fallback (never a URL). */
  icon: string
  /** Logo image URL to render as an <img>, when the app has its own logo. */
  logoUri?: string
}

/**
 * Resolve an app's stored logo/icon value (which may be a URL or an icon key)
 * plus its category into a renderable pair: a logo image URL when the app has
 * one, and always an icon key to fall back to.
 */
export function resolveAppIcon(stored: string | undefined | null, category: string | undefined | null): ResolvedAppIcon {
  if (stored && isLogoUrl(stored)) return { icon: categoryIcon(category), logoUri: stored }
  return { icon: stored && stored.length > 0 ? stored : categoryIcon(category) }
}
