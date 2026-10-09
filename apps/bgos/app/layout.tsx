import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
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
