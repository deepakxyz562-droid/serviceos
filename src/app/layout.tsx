import type { Metadata, Viewport } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export const metadata: Metadata = {
  title: "ServiceOS - The Operating System for Service Businesses",
  description: "ServiceOS — The Operating System for service businesses. Replace WhatsApp chaos, Excel trackers, and paper forms. Leads, dispatch, invoicing, WhatsApp-first operations.",
  applicationName: "ServiceOS",
  keywords: ["ServiceOS", "field service", "SaaS", "job management", "WhatsApp", "invoicing", "workflow automation", "service business"],
  authors: [{ name: "ServiceOS Team" }],
  manifest: "/manifest.json",
  formatDetection: { telephone: false },
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
    title: "ServiceOS",
  },
  openGraph: {
    title: "ServiceOS - The Operating System for Service Businesses",
    description: "Replace WhatsApp chaos, Excel trackers, and paper forms with one powerful platform",
    type: "website",
    siteName: "ServiceOS",
  },
  twitter: {
    card: "summary_large_image",
    title: "ServiceOS - The Operating System for Service Businesses",
    description: "Replace WhatsApp chaos, Excel trackers, and paper forms with one powerful platform",
  },
};

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
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icon-167.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
      </head>
      <body
        className={`${poppins.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <QueryProvider>
          {children}
          <Toaster position="top-center" />
          <PwaProvider />
        </QueryProvider>
      </body>
    </html>
  );
}
