import type { AuthSession, AuthUser, LogoutResult } from '@tj-edu/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'tj-edu-platform-access-token';

interface ApiErrorPayload {
  message?: string | string[];
}

export function getStoredToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    const message = Array.isArray(payload.message) ? payload.message[0] : payload.message;
    throw new Error(message ?? '请求失败，请稍后重试。');
  }

  return response.json() as Promise<T>;
}

export function login(identifier: string, password: string) {
  return request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password })
  });
}

export function getCurrentUser(token: string) {
  return request<AuthUser>('/auth/me', {}, token);
}

export function logout(token: string) {
  return request<LogoutResult>('/auth/logout', { method: 'POST' }, token);
}
