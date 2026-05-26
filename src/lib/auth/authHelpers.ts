const TOKEN_KEY = 'authToken';
const PENDING_USER_KEY = 'auth_user_pending';

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
