import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOS — Business Operating System',
  description:
    'One system to run the entire business: POS, Inventory, Stock, Khata, GST Invoices, Appointments, Online Store, and Day Book.',
  icons: {
    icon: '/bos/logo-mark.png',
    shortcut: '/bos/logo-mark.png',
    apple: '/bos/logo-mark.png',
  },
  manifest: '/bos/manifest.webmanifest',
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
