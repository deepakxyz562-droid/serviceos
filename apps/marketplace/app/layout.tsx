import type { Metadata } from 'next';
import './globals.css';
import { ProductSessionShell } from '@/components/products/product-session-shell';

export const metadata: Metadata = {
  title: 'Fieseros Marketplace — On-Demand Service Network',
  description: 'Book vetted trade and service professionals on demand.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900">
        <ProductSessionShell>{children}</ProductSessionShell>
      </body>
    </html>
  );
}
