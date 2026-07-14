const TOKEN_KEY = 'authToken';
const PENDING_USER_KEY = 'auth_user_pending';
const CACHED_USER_KEY = 'vx_user_snapshot';

export function getToken(): string | null {
  return null;
}

export function setToken(_token?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

export function setPendingUser(user: object): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_USER_KEY, JSON.stringify(user));
  } catch (_) {}
}

export function getPendingUser(): object | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_USER_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    sessionStorage.removeItem(PENDING_USER_KEY);
    return user;
  } catch (_) {
    return null;
  }
}

// Last-known user snapshot so returning visitors can render the app shell
// immediately while the session is revalidated in the background.
export function writeCachedUser(user: object): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } catch (_) {}
}

export function readCachedUser(): object | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearCachedUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CACHED_USER_KEY);
  } catch (_) {}
}
