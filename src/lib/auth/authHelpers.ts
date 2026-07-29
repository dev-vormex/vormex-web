const TOKEN_KEY = 'authToken';
const PENDING_USER_KEY = 'auth_user_pending';
const CACHED_USER_KEY = 'vx_user_snapshot';

const CACHED_USER_FIELDS = [
  'id',
  'username',
  'name',
  'profileImage',
  'isVerified',
  'isPremium',
  'profileBadgeStyle',
  'profileRing',
  'onboardingCompleted',
] as const;

function browserSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function removeLegacyUserSnapshot(): void {
  try {
    window.localStorage.removeItem(CACHED_USER_KEY);
  } catch (_) {}
}

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

// Keep only shell-safe identity fields for the current tab. Sensitive profile
// fields (email, bio, college, balances) are fetched again after revalidation.
export function writeCachedUser(user: object): void {
  if (typeof window === 'undefined') return;
  try {
    const source = user as Record<string, unknown>;
    const snapshot = Object.fromEntries(
      CACHED_USER_FIELDS.flatMap((field) => field in source ? [[field, source[field]]] : [])
    );
    browserSessionStorage()?.setItem(CACHED_USER_KEY, JSON.stringify(snapshot));
    removeLegacyUserSnapshot();
  } catch (_) {}
}

export function readCachedUser(): object | null {
  if (typeof window === 'undefined') return null;
  try {
    removeLegacyUserSnapshot();
    const raw = browserSessionStorage()?.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearCachedUser(): void {
  if (typeof window === 'undefined') return;
  try {
    browserSessionStorage()?.removeItem(CACHED_USER_KEY);
    removeLegacyUserSnapshot();
  } catch (_) {}
}
