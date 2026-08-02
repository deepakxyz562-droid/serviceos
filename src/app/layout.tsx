import type { Metadata, Viewport } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { CookieConsentBanner } from "@/components/legal/cookie-consent-banner";
import { StructuredData } from "@/components/seo/structured-data";
import { WebVitalsReporter } from "@/components/seo/web-vitals-reporter";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/seo/schemas";
import { BRAND } from "@/lib/brand";

// P5 (Font CLS fix): Poppins with `display: "swap"` causes a FOUT (flash of
// unstyled text) where the fallback (Arial) is shown first, then swapped for
// Poppins when it loads — the metrics differ, causing a ~0.31 CLS score.
//
// Fix: `adjustFontFallback: true` tells Next.js to emit a `size-adjust` +
// metric override on the Arial fallback @font-face so it has the SAME advance
// width as Poppins. The swap becomes metric-invisible. This is the
// recommended Next.js pattern for CLS reduction with Google Fonts.
//
// All 6 weights are kept because the codebase uses font-light (300) through
// font-extrabold (800); removing any would cause faux-rendering (browser
// synthetically stretches the nearest available weight, which looks worse
// than the original CLS). With size-adjust the swap is CLS-free so keeping
// all weights has no CLS cost.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  // P0-3 (SEO): metadataBase makes all relative metadata URLs (canonical,
  // openGraph.url, openGraph.images, alternates) resolve to absolute
  // https://fieseros.com/... URLs. Without this, social scrapers and Google
  // see relative paths like "/og/og-default.png" which they can't resolve —
  // resulting in broken OG cards and canonical warnings in Search Console.
  metadataBase: new URL(BRAND.url),
  title: `${BRAND.name} - ${BRAND.tagline}`,
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: [BRAND.name, "field service", "SaaS", "job management", "email notifications", "SMS notifications", "push notifications", "invoicing", "workflow automation", "service business"],
  authors: [{ name: `${BRAND.name} Team` }],
  creator: BRAND.name,
  publisher: BRAND.name,
  manifest: '/manifest.json',
  formatDetection: { telephone: false },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/logo.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    // iOS requires a PNG apple-touch-icon (it does NOT render SVG). Ship a
    // real 180×180 PNG so "Add to Home Screen" shows our logo on iPhone.
    apple: [
      { url: "/icon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/icon-167.png", sizes: "167x167", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: BRAND.name,
  },
  openGraph: {
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: 'Replace scattered texts, emails, and spreadsheets with one powerful platform',
    type: 'website',
    siteName: BRAND.name,
    url: '/',
    locale: 'en_US',
    images: [
      {
        url: '/og/og-default.png',
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${BRAND.name} - ${BRAND.tagline}`,
    description: 'Replace scattered texts, emails, and spreadsheets with one powerful platform',
    images: ['/og/og-default.png'],
  },
};

// Whether to register the SW with ?dev=1 (dev mode bypasses caching so
// Next.js HMR works; production uses the plain /sw.js URL with full caching).
const IS_DEV = process.env.NODE_ENV !== 'production';
const SW_URL = IS_DEV ? '/sw.js?dev=1' : '/sw.js';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#10b981" />
        {/*
          PERF-2: Removed unused Google Fonts preconnect/dns-prefetch hints.
          next/font/google SELF-HOSTS Poppins + Geist Mono — the font files
          are served from /_next/static/media/*, never from fonts.googleapis.com
          or fonts.gstatic.com. Lighthouse flagged all 4 hints as "unused
          preconnect" because the browser set up DNS+TLS connections to Google
          that were never used, wasting ~100ms of connection setup.
        */}
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
        {/*
          Synchronous service worker registration.
          ------------------------------------------
          PWABuilder / Lighthouse / Android APK generators check whether a
          service worker is registered within ~3 seconds of the first page
          load. Registering inside a React useEffect (in PwaProvider) is
          too late — by the time React hydrates and the effect runs, the
          audit has already finished and reports "no service worker".

          By putting the registration in an inline <script> in <head>, the
          browser runs it synchronously during HTML parsing, BEFORE any
          JS bundle is fetched. PWABuilder immediately detects the SW and
          unblocks APK packaging.

          The register() call itself is async (returns a Promise) but the
          network request for /sw.js is fired synchronously, which is what
          the audit looks for. The SW then installs + activates
          (clients.claim() takes control of the page) on its own schedule.

          Calling register() multiple times is safe — browsers dedupe by
          URL. The PwaProvider component keeps its own register() call
          (harmless duplicate) plus renders the install/update prompts.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.register('${SW_URL}',{scope:'/'}).catch(function(){})}`,
          }}
        />
      </head>
      <body
        className={`${poppins.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        {/* Site-wide structured data: Organization + WebSite schema.
            Injected on every page so Google can understand the entity. */}
        <StructuredData
          data={[getOrganizationSchema(), getWebsiteSchema()]}
        />
        <QueryProvider>
          {children}
          <Toaster position="top-center" />
          <PwaProvider />
          <CookieConsentBanner />
          {/* P3-1 (SEO): Core Web Vitals RUM — reports field CLS/INP/LCP/FCP/TTFB
              to /api/vitals for production performance monitoring. */}
          <WebVitalsReporter />
        </QueryProvider>
      </body>
    </html>
  );
}
