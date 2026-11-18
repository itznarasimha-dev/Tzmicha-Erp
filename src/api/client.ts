export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const TOKEN_SESSION_KEY = 'apexflow_auth_token';

export function getAuthToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem('apex_erp_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_SESSION_KEY, token);
      localStorage.setItem('apex_erp_token', token);
    } else {
      sessionStorage.removeItem(TOKEN_SESSION_KEY);
      localStorage.removeItem('apex_erp_token');
    }
  } catch {
    // Ignore storage restrictions
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`/api${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch (err) {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      err instanceof Error ? `Unable to reach backend API server: ${err.message}` : 'Unable to reach backend API server.'
    );
  }

  let payload: { ok?: boolean; data?: T; error?: { code?: string; message?: string; details?: unknown } } | null = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response
  }

  if (!response.ok || payload?.ok === false) {
    const code = payload?.error?.code || `HTTP_${response.status}`;
    const message = payload?.error?.message || response.statusText || 'API request failed.';
    throw new ApiError(response.status, code, message, payload?.error?.details);
  }

  return (payload?.data ?? payload) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
