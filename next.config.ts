import type { NextConfig } from "next";

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
