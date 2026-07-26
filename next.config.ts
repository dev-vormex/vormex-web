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

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: process.cwd(),
  },
  // Proxy API requests to backend (avoids CORS, fixes "Network Error" when backend is on different origin)
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ];
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
