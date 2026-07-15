import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_COOKIES_TO_CLEAR,
  AUTH_PRESENT_COOKIE,
  REFRESH_TOKEN_COOKIE,
  getProxyRedirectPath,
  hasOrphanedHttpOnlyAuthCookies,
  hasProxySession,
} from '@/lib/routing/authProxy';

function clearAuthCookies(response: NextResponse): void {
  for (const cookieName of AUTH_COOKIES_TO_CLEAR) {
    response.cookies.delete(cookieName);
  }
}

const PRIVATE_INDEX_PREFIXES = [
  '/feed', '/messages', '/notifications', '/settings', '/dashboard', '/profile/edit',
  '/onboarding', '/upload', '/more/saved', '/reels/drafts', '/reels/analytics',
  '/login', '/register', '/forgot-password', '/reset-password', '/verify-email', '/vormex-delete-account',
];

function isPrivateIndexPath(pathname: string): boolean {
  return PRIVATE_INDEX_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const cookieState = {
    authPresent: request.cookies.get(AUTH_PRESENT_COOKIE)?.value,
    accessToken: request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
  };

  const hasSession = hasProxySession(cookieState);
  const shouldClearOrphanedAuth = hasOrphanedHttpOnlyAuthCookies(cookieState);

  const redirectPath = getProxyRedirectPath({
    pathname: request.nextUrl.pathname,
    hasToken: hasSession,
    onboardingCompleted: request.cookies.get('onboardingCompleted')?.value === 'true',
  });

  let response: NextResponse;
  if (!redirectPath) {
    response = NextResponse.next();
  } else {
    const destination = new URL(redirectPath, request.url);
    response = NextResponse.redirect(destination);
  }

  if (shouldClearOrphanedAuth) {
    clearAuthCookies(response);
  }

  if (process.env.PUBLIC_SEO_ENABLED === 'false' || process.env.NEXT_PUBLIC_SEO_ENABLED === 'false') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  } else if (isPrivateIndexPath(request.nextUrl.pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
