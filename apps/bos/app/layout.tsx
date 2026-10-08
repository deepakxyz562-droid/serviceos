import type { Metadata } from 'next';
import './globals.css';
import { ProductSessionShell } from '@/components/products/product-session-shell';

export const metadata: Metadata = {
  title: 'BOS — Business Operating System',
  description: 'One system to run the entire business: POS, Inventory, Stock, Khata, GST Invoices, and Daybook.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 font-sans antialiased text-stone-900">
        <ProductSessionShell>{children}</ProductSessionShell>
      </body>
    </html>
  );
}
