import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: '/bgos/favicon.ico?v=20261123', sizes: 'any' },
      { url: '/bgos/icon.svg?v=20261123', type: 'image/svg+xml' },
      { url: '/bgos/icon-192.png?v=20261123', sizes: '192x192', type: 'image/png' },
      { url: '/bgos/icon-512.png?v=20261123', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/bgos/apple-touch-icon.png?v=20261123', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/bgos/favicon.ico?v=20261123',
  },
  manifest: '/bgos/manifest.webmanifest',
  title: 'BGOS — Business Growth Operating System',
  description: 'Find customers, engage with AI agents, capture leads with forms, and convert into revenue.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        {children}
      </body>
    </html>
  );
}
