import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ServiceOS - The Operating System for Service Businesses",
  description: "ServiceOS — The Operating System for service businesses. Replace WhatsApp chaos, Excel trackers, and paper forms. Leads, dispatch, invoicing, WhatsApp-first operations.",
  keywords: ["ServiceOS", "field service", "SaaS", "job management", "WhatsApp", "invoicing", "workflow automation", "service business"],
  authors: [{ name: "ServiceOS Team" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "ServiceOS - The Operating System for Service Businesses",
    description: "Replace WhatsApp chaos, Excel trackers, and paper forms with one powerful platform",
    type: "website",
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
