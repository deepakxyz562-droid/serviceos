import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
  keywords: ["ServiceOS", "field service", "SaaS", "job management", "WhatsApp", "invoicing", "workflow automation", "service business"],
  authors: [{ name: "ServiceOS Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logo.svg", sizes: "any", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
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
        <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-startup-image" href="/icon-512x512.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
