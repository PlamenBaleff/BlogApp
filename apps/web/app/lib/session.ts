/**
 * Tiny client-side auth helper. Centralises the localStorage interactions
 * so individual screens don't repeat the same `getItem`/`setItem` dance.
 *
 * The tokens themselves are validated server-side; this helper just exposes
 * the current "what does the browser think it knows about me" view.
 */

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatar?: string | null;
  theme?: 'light' | 'dark';
}

export interface Session {
  accessToken: string;
  refreshToken: string | null;
  user: SessionUser;
}

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getSession(): Session | null {
  if (!isBrowser()) return null;
  try {
    const accessToken = localStorage.getItem(ACCESS_KEY);
    const userJson = localStorage.getItem(USER_KEY);
    if (!accessToken || !userJson) return null;
    return {
      accessToken,
      refreshToken: localStorage.getItem(REFRESH_KEY),
      user: JSON.parse(userJson) as SessionUser,
    };
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function authHeader(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function saveSession(data: {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}) {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_KEY, data.accessToken);
  localStorage.setItem(REFRESH_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  // Mirror the theme into a top-level key so the inline bootstrap script
  // in <head> can apply it before React hydrates (avoids FOUC).
  if (data.user.theme === 'dark' || data.user.theme === 'light') {
    localStorage.setItem('theme', data.user.theme);
  }
  // Also drop a cookie so the middleware lets us into protected routes.
  document.cookie = `accessToken=${data.accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  window.dispatchEvent(new Event('auth-change'));
}

export async function clearSession() {
  if (!isBrowser()) return;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const accessToken = localStorage.getItem(ACCESS_KEY);
  // Best-effort server-side invalidation; ignore network errors.
  if (accessToken) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignore — local state is cleared regardless
    }
  }
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem('theme');
  document.cookie = `${ACCESS_KEY}=; Max-Age=0; path=/`;
  window.dispatchEvent(new Event('auth-change'));
}
