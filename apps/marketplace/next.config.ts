import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      { source: '/', destination: 'https://fieseros.com/marketplace', permanent: true },
      ...['login', 'register', 'app', 'dashboard'].map(path => ({
        source: `/${path}`, destination: 'https://fieseros.com/marketplace/dashboard', permanent: true,
      })),
    ];
  },
  async rewrites() {
    const core = (process.env.CORE_API_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
    return {
      beforeFiles: [{ source: "/api/:path*", destination: `${core}/api/:path*` }],
      // Published forms, callbacks, uploads and shared assets still live in core.
      // Local product pages and Next assets take precedence over this fallback.
      fallback: [{ source: "/:path*", destination: `${core}/:path*` }],
    };
  },
};

export default nextConfig;
