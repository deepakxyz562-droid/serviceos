import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  assetPrefix: '/bgos-site',
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [{ source: "/design-preview", destination: "/?product=bgos&auth=login", permanent: false }];
  },
  async rewrites() {
    const core = (process.env.CORE_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
    return {
      beforeFiles: [
        { source: "/api/:path*", destination: `${core}/api/:path*` },
        { source: '/bgos-site/_next/:path*', destination: '/_next/:path*' },
      ],
      // Local prefixed assets resolve first; unmatched core chunks remain proxied.
      afterFiles: [{ source: '/_next/:path*', destination: `${core}/_next/:path*` }],
      // Published forms, callbacks, uploads and shared assets still live in core.
      // Product entry routes only redirect; all application rendering lives in core.
      fallback: [{ source: "/:path*", destination: `${core}/:path*` }],
    };
  },
};

export default nextConfig;
