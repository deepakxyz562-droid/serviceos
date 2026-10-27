import type { Metadata } from 'next';
import { BOS_FAVICON_SRC, BOS_TOUCH_ICON_SRC } from '@/lib/bos-icons';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOS — Business Operating System',
  description:
    'One system to run the entire business: POS, Inventory, Stock, Khata, GST Invoices, Appointments, Online Store, and Day Book.',
  icons: {
    icon: BOS_FAVICON_SRC,
    shortcut: BOS_FAVICON_SRC,
    apple: BOS_TOUCH_ICON_SRC,
  },
  manifest: '/bos/manifest.webmanifest',
  alternates: { canonical: 'https://bos.fieseros.com/' },
  openGraph: {
    title: 'BOS — Run Your Entire Business in One Place',
    description: 'Bring sales, inventory, customers and your online store together.',
    url: 'https://bos.fieseros.com/',
    images: [{ url: 'https://bos.fieseros.com/bos/landing/owner.webp', width: 1536, height: 1024 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bos-theme">
      <body className="min-h-screen bg-[#F4F8F6] font-sans antialiased text-[#111827]">
        {children}
      </body>
    </html>
  );
}
