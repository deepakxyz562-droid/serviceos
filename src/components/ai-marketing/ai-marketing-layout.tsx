import { ReactNode } from 'react';
import { AiMarketingHeader } from './ai-marketing-header';
import { AiMarketingFooter } from './ai-marketing-footer';

export function AiMarketingLayout({
  children,
  activePath,
}: {
  children: ReactNode;
  activePath?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-700">
      <AiMarketingHeader activePath={activePath} />
      <main className="flex-1">{children}</main>
      <AiMarketingFooter />
    </div>
  );
}
