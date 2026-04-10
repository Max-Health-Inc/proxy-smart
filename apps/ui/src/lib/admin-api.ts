import { config } from '@/config';
import { getItem } from '@/lib/storage';

export async function getAdminToken(): Promise<string | null> {
  try {
    const tokens = await getItem<{ access_token: string }>('openid_tokens');
    return tokens?.access_token || null;
  } catch {
    return null;
  }
}

export async function adminApiCall<T>(path: string, method: 'GET' | 'PUT' = 'GET', body?: unknown): Promise<T> {
  const token = await getAdminToken();
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
