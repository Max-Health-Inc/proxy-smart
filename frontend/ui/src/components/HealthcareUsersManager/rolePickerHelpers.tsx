import type { RoleResponse } from '@/lib/api-client';

export type RolesMeta = Record<string, RoleResponse>;

/**
 * Build the tooltip/subtitle text for a role in the user role picker.
 * Shows the description and the typical scopes the role represents (descriptive
 * label only, never an access grant).
 */
export function roleSubtitle(role: RoleResponse | undefined, noScopesLabel: string): string {
  if (!role) return '';
  const parts: string[] = [];
  if (role.description) parts.push(role.description);
  const scopes = role.representedScopes ?? [];
  if (scopes.length > 0) {
    parts.push(`Typical scopes: ${scopes.join(', ')}`);
  } else {
    parts.push(noScopesLabel);
  }
  return parts.join(' — ');
}

/**
 * Names of plumbing roles that should never appear in the user role picker.
 */
export function isPlumbingRoleName(name: string): boolean {
  return (
    name.startsWith('default-roles-') ||
    name === 'offline_access' ||
    name === 'uma_authorization'
  );
}
