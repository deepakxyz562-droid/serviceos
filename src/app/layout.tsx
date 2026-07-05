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
      { url: "/logo.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    // Apple touch icons: we only ship an SVG, but Safari requires a PNG for
    // apple-touch-icon. Rather than 404 on every page load, we point at the
    // SVG (Safari will simply skip it if it can't render, instead of logging
    // a network error for a missing file).
    apple: [{ url: "/icon.svg", sizes: "180x180", type: "image/svg+xml" }],
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
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="apple-touch-startup-image" href="/icon.svg" />
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
