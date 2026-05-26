export interface ProxyAuthState {
  pathname: string;
  hasToken: boolean;
  onboardingCompleted: boolean;
}

export interface ProxyAuthCookieState {
  authPresent?: string;
  accessToken?: string;
  refreshToken?: string;
}

export const AUTH_PRESENT_COOKIE = 'vx_auth_present';
export const ACCESS_TOKEN_COOKIE = 'vx_access';
export const REFRESH_TOKEN_COOKIE = 'vx_refresh';
export const AUTH_COOKIES_TO_CLEAR = [
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  'vx_csrf',
  AUTH_PRESENT_COOKIE,
  'authToken',
  'onboardingCompleted',
  'admin_token',
] as const;

const protectedRoutes = ['/', '/profile', '/settings', '/feed'] as const;
const authRoutes = ['/login', '/register'] as const;
const publicRoutes = ['/forgot-password', '/verify-email', '/auth/google/callback'] as const;
const onboardingAllowedRoutes = ['/onboarding', '/api', '/login', '/register'] as const;

export function hasProxySession({ authPresent }: ProxyAuthCookieState): boolean {
  return authPresent === 'true';
}

export function hasOrphanedHttpOnlyAuthCookies({
  authPresent,
  accessToken,
  refreshToken,
}: ProxyAuthCookieState): boolean {
  return authPresent !== 'true' && (Boolean(accessToken) || Boolean(refreshToken));
}

function matchesRoute(pathname: string, route: string): boolean {
  return route === '/' ? pathname === '/' : pathname.startsWith(route);
}

export function getProxyRedirectPath({
  pathname,
  hasToken,
  onboardingCompleted,
}: ProxyAuthState): string | null {
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) => matchesRoute(pathname, route));

  if (isProtectedRoute && !hasToken) {
    return '/login';
  }

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  if (isAuthRoute && hasToken && !isPublicRoute) {
    return '/';
  }

  const isOnboardingAllowed = onboardingAllowedRoutes.some((route) => pathname.startsWith(route));
  if (hasToken && !onboardingCompleted && isProtectedRoute && !isOnboardingAllowed && !isPublicRoute) {
    return '/onboarding';
  }

  return null;
}
