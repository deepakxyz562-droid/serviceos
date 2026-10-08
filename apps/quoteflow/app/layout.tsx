import type { Metadata } from 'next';
import './globals.css';
import { ProductSessionShell } from '@/components/products/product-session-shell';

export const metadata: Metadata = {
  title: 'QuoteFlow — AI Quote & Invoice Platform',
  description: 'Describe it. We create it. Professional quotes and invoices in seconds.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="h-screen w-screen overflow-hidden bg-stone-50 font-sans antialiased text-stone-900">
        <ProductSessionShell>{children}</ProductSessionShell>
      </body>
    </html>
  );
}
