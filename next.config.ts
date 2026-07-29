import type { NextConfig } from "next";

export function resolveBackendUrl(env: Partial<NodeJS.ProcessEnv> = process.env): string {
  return (
    env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, '') ||
    env.BACKEND_URL?.replace(/\/+$/, '') ||
    env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
    (env.NODE_ENV === 'production'
      ? 'https://vormex-backend.onrender.com'
      : 'http://localhost:5000')
  );
}

const backendUrl = resolveBackendUrl();

export function buildSecurityHeaders(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const resolvedBackendUrl = resolveBackendUrl(env);
  const backendOrigin = new URL(resolvedBackendUrl).origin;
  const backendSocketOrigin = backendOrigin.replace(/^http/, 'ws');
  const isProduction = env.NODE_ENV === 'production';
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"} https://accounts.google.com https://apis.google.com https://www.gstatic.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src 'self' ${backendOrigin} ${backendSocketOrigin} https://accounts.google.com https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.b-cdn.net https://*.cloudfront.net`,
    "frame-src https://accounts.google.com https://www.youtube-nocookie.com",
    "worker-src 'self' blob:",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ];

  return [
    { key: 'Content-Security-Policy', value: directives.join('; ') },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    ...(isProduction
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
      : []),
  ];
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
  // Proxy API requests to backend (avoids CORS, fixes "Network Error" when backend is on different origin)
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ];
  },
  async headers() {
    return [{ source: '/:path*', headers: buildSecurityHeaders() }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "vormex.b-cdn.net",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "media.hackerearth.com",
      },
      {
        protocol: "https",
        hostname: "d112y698adiu2z.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "assets.devfolio.co",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'vormex.in' }],
        destination: 'https://www.vormex.in/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
