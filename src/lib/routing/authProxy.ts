export interface ProxyAuthState {
  pathname: string;
  hasToken: boolean;
  onboardingCompleted: boolean;
}

const protectedRoutes = ['/', '/profile', '/settings', '/feed'] as const;
const authRoutes = ['/login', '/register'] as const;
const publicRoutes = ['/forgot-password', '/verify-email', '/auth/google/callback'] as const;
const onboardingAllowedRoutes = ['/onboarding', '/api', '/login', '/register'] as const;

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
