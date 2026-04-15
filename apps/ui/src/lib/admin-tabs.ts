/** Single source of truth for admin UI tab IDs */
export const ADMIN_TABS = [
  'dashboard',
  'smart-apps',
  'users',
  'fhir-servers',
  'ai-tools',
  'idp',
  'smart-config',
  'oauth-monitoring',
  'door-management',
  'branding',
  'organizations',
] as const

export type AdminTab = (typeof ADMIN_TABS)[number]
