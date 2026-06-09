import type { NextConfig } from "next";

if (process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/serviceos';
}

const nextConfig: NextConfig = {
  compress: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["bcryptjs", "jsonwebtoken"],
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["21.0.11.123"],
  experimental: {
    instrumentationHook: true,
  },
  async rewrites() {
    return [
      {
        source: '/webhook-test/:path*',
        destination: '/api/webhook-test/:path*',
      },
      {
        source: '/webhook/:path*',
        destination: '/api/webhook/:path*',
      },
    ];
  },
};

export default nextConfig;
