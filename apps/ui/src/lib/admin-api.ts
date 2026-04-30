import { config } from '@/config';
import { getStoredToken } from '@/lib/apiClient';

/** @deprecated Use `getStoredToken` from `@/lib/apiClient` directly. */
export const getAdminToken = getStoredToken;

export async function adminApiCall<T>(path: string, method: 'GET' | 'PUT' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const token = await getStoredToken();
  const res = await fetch(`${config.api.baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${res.status}`);
  return res.json();
}
