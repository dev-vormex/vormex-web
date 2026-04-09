import { NextRequest, NextResponse } from 'next/server';
import { getProxyRedirectPath } from '@/lib/routing/authProxy';

export function proxy(request: NextRequest) {
  const token =
    request.cookies.get('authToken')?.value ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  const redirectPath = getProxyRedirectPath({
    pathname: request.nextUrl.pathname,
    hasToken: Boolean(token),
    onboardingCompleted: request.cookies.get('onboardingCompleted')?.value === 'true',
  });

  if (!redirectPath) {
    return NextResponse.next();
  }

  const destination = new URL(redirectPath, request.url);
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
