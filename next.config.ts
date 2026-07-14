import type { NextConfig } from "next";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
  // Local backend fallback kept for reference: 'http://localhost:5000'
  'https://vormex-backend.onrender.com';

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
};

export default nextConfig;
