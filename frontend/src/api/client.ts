const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || err.error || String(res.status));
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }

  return res.json();
}

export const apiGet = <T>(path: string) => api<T>(path, { method: 'GET' });
export const apiPost = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
