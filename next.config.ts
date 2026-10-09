import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// Bundle analyzer — wraps the Next.js config to add @next/bundle-analyzer
// when ANALYZE=true is set. Produces an interactive treemap of the production
// JS bundle so we can identify heavy dependencies and code-split opportunities.
//
// Usage:
//   ANALYZE=true bun run build
//   # Opens .next/analyze/client.html in your browser
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Fieseros demo - trigger dev server restart
const nextConfig: NextConfig = {
  output: "standalone",
  compress: true, // Enable gzip compression — critical for sitemaps (Google prefers compressed responses)
  typescript: {
    // Next.js build runs typechecking in the same worker process which causes
    // V8 heap exhaustion on large codebases. Type checking is handled locally
    // and via CI instead of inside Docker production builds.
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["bcryptjs", "jsonwebtoken"],
  images: {
    // P1-6 (SEO): Enable next/image optimization for AVIF + WebP output.
    // AVIF is ~50% smaller than JPEG, WebP ~30% smaller — both cut LCP
    // image payload significantly. Browsers that support AVIF get it, others
    // fall back to WebP, then to the original format.
    //
    // The marketplace's SafeImage component intentionally bypasses next/image
    // and uses Supabase's built-in image transform API (see safe-image.tsx).
    // This config applies to the landing page's static local PNGs in
    // /images/landing/ and any <Image> usage across the site.
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // A3: Pre-register Supabase Storage remote patterns so that IF we later
    // switch SafeImage to next/image, the URLs will be allowed. This is
    // preparatory — currently no next/image usage points at Supabase.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/**' },
      { protocol: 'https', hostname: '*.supabase.in', pathname: '/storage/v1/**' },
    ],
  },
  experimental: {
    // Raise the clonable-body limit (default 10MB) to 15MB so large photo
    // uploads (up to 10MB raw → ~13.3MB as base64 JSON) don't get silently
    // truncated mid-string, which causes "Unterminated string in JSON" errors.
    proxyClientMaxBodySize: 15 * 1024 * 1024,
    // Enable scroll restoration so back/forward navigation preserves the
    // user's scroll position on the marketplace page. Without this, clicking
    // a provider detail and coming back lands the user at the top of the
    // page — they then have to scroll back down to find their place, which
    // feels slow even if the page rendered instantly.
    scrollRestoration: true,
    // Disable Webpack worker threads to prevent OOM kills on memory-constrained servers
    webpackBuildWorker: false,
    cpus: 1,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'date-fns',
      'framer-motion',
      'recharts',
      'googleapis',
      '@aws-sdk/client-s3',
      '@aws-sdk/client-sesv2',
    ],
  },
  productionBrowserSourceMaps: false,
  webpack: (config, { dev }) => {
    config.devtool = false;
    if (!dev) {
      config.cache = false; // Disable heavy Webpack memory cache during production build
      if (config.optimization && Array.isArray(config.optimization.minimizer)) {
        config.optimization.minimizer.forEach((minimizer: any) => {
          if (minimizer?.options?.parallel) {
            minimizer.options.parallel = 1;
          }
        });
      }
    }
    return config;
  },
  allowedDevOrigins: [
    "21.0.11.123",
    "21.0.19.13",
    "21.0.10.43",
    "space-z.ai",
    ".space-z.ai",
    "fieseros.com",
    ".fieseros.com",
    "0.0.0.0",
    "127.0.0.1",
    "localhost",
  ],
  async redirects() {
    return [
      {
        source: '/ai-forms',
        destination: '/gptform',
        permanent: true,
      },
      {
        source: '/ai-receptionist',
        destination: '/ai-employee',
        permanent: true,
      },
      {
        source: '/gptsite',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/app',
        destination: '/',
      },
      {
        source: '/phone-cleaner/privacy',
        destination: '/phone-cleaner/privacy.html',
      },
      {
        source: '/phone-cleaner/terms',
        destination: '/phone-cleaner/terms.html',
      },
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
  // the deployment (e.g. fieseros.com) that might strip or re-label
  // Content-Type — which is the second half of the Lighthouse error.
  async headers() {
    return [
      {
        // ─── A3 (Image Cache): User-uploaded images served from /uploads/*
        // (provider logos, cover photos, gallery images). These are immutable
        // — once uploaded, the file at a given path never changes (new uploads
        // get new filenames via UUID). 1-year cache + immutable eliminates
        // revalidation on repeat visits. On a provider detail page with 10-20
        // gallery images, this saves 10-20 conditional GETs per page load.
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // ─── A3 (Image Cache): Static landing page images in /images/*
        // (hero-dashboard.png, persona-*.png, etc.). These are build-time
        // assets — they only change when the repo ships a new deploy. The
        // filenames are stable (not content-hashed), so we use a 1-day cache
        // + must-revalidate to pick up changes on next deploy without
        // serving stale content for too long.
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, must-revalidate' },
        ],
      },
      {
        // ─── Security headers applied to standard internal / app routes ───────────
        // Strict CSP and SAMEORIGIN frame protection for admin, dashboard, billing, settings
        source: '/:path((?!f(?:/|$)|form(?:/|$)|agent(?:/|$)|chat(?:/|$)|api/public(?:/|$)).*)',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), interest-cohort=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval' blob: https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com https://js.stripe.com https://www.paypal.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com; worker-src 'self' blob:; child-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: ws: wss: data: blob: https://maps.googleapis.com https://*.googleapis.com https://*.google.com https://cloudflareinsights.com; frame-src 'self' https://js.stripe.com https://www.paypal.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'" },
        ],
      },
      {
        // ─── Security headers for PUBLIC EMBED routes (/f/*, /form/*, /agent/*, /chat/*) ──
        // Allows embedding on third-party websites (WordPress, Shopify, Webflow, React apps, local test files)
        // by omitting frame-ancestors and X-Frame-Options restrictions.
        source: '/:prefix(f|form|agent|chat)/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=*, microphone=*, geolocation=(self)' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval' blob: https://maps.googleapis.com https://*.googleapis.com https://maps.gstatic.com https://js.stripe.com https://www.paypal.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com; worker-src 'self' blob:; child-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://maps.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https: ws: wss: data: blob: https://maps.googleapis.com https://*.googleapis.com https://*.google.com https://cloudflareinsights.com; frame-src 'self' https://js.stripe.com https://www.paypal.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com; object-src 'none'; base-uri 'self'; form-action 'self'" },
        ],
      },
      {
        // ─── Headers for public embed script and API routes ───────────────────────
        source: '/api/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
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
        // ── Marketplace browse page HTML cache ──────────────────────────────
        // The page is `force-dynamic` (fresh SSR on every request) but the
        // underlying DB query is cached 30s via unstable_cache. Setting
        // `max-age=30, stale-while-revalidate=60` on the HTML response means:
        //   • Browser reuses cached HTML on back-navigation (instant).
        //   • After 30s, browser serves stale HTML + fetches fresh in
        //     background (stale-while-revalidate=60).
        // This closes the "slow back-nav" UX issue where every back button
        // press re-requested full SSR HTML + re-rendered the page.
        source: '/marketplace',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=30, stale-while-revalidate=60' },
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

export default withBundleAnalyzer(nextConfig);
