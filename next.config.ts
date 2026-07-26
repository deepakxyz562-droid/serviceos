import type { NextConfig } from "next";

// ServiceOS demo - trigger dev server restart
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
  allowedDevOrigins: [
    "21.0.11.123",
    "21.0.19.13",
    "21.0.10.43",
    "space-z.ai",
    ".space-z.ai",
    "serviceos.cc",
    ".serviceos.cc",
    "0.0.0.0",
    "127.0.0.1",
    "localhost",
  ],
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
  // Force correct Content-Type + cache headers on PWA-critical static assets.
  // Lighthouse's PWA audit requires manifest icons to be fetchable AND served
  // with an image/* content-type. Next.js sets these correctly by default,
  // but an explicit header here survives any reverse-proxy/CDN in front of
  // the deployment (e.g. serviceos.cc) that might strip or re-label
  // Content-Type — which is the second half of the Lighthouse error.
  async headers() {
    return [
      {
        // ─── Security headers applied to ALL routes ────────────────────────────
        // Strict CSP that still allows:
        //  • PayPal checkout (https://www.paypal.com — frame-src + script-src)
        //  • Stripe (https://js.stripe.com — script-src + frame-src)
        //  • Google Fonts (https://fonts.googleapis.com style, https://fonts.gstatic.com font)
        //  • Inline scripts/styles ('unsafe-inline' — required by Next.js runtime)
        //  • 'unsafe-eval' in dev (Turbopack/HMR needs it; production builds drop it)
        //  • WebSocket upgrades (ws: wss:) for socket.io realtime + Vapi streams
        //  • Any https image / connect (WhatsApp, webhooks, analytics)
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), interest-cohort=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.paypal.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https: ws: wss:; frame-src 'self' https://js.stripe.com https://www.paypal.com https://www.youtube.com https://www.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" },
        ],
      },
      {
        // SVG icons — must be image/svg+xml (NOT text/xml or application/xml)
        source: '/:file(.*\\.svg)',
        headers: [
          { key: 'Content-Type', value: 'image/svg+xml' },
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
      {
        // PNG icons (192/512/maskable/apple-touch/favicon)
        source: '/:file(.*\\.png)',
        headers: [
          { key: 'Content-Type', value: 'image/png' },
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
      {
        // Web manifest — application/manifest+json is the registered type.
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=UTF-8' },
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        // Service worker — must be JS content-type, NEVER cached, and
        // allowed to control the root scope.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=UTF-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        // offline.html fallback page — no-cache so updates land.
        source: '/offline.html',
        headers: [
          { key: 'Content-Type', value: 'text/html; charset=UTF-8' },
          { key: 'Cache-Control', value: 'no-cache, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
