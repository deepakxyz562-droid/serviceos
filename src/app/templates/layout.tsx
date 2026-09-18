import { ReactNode } from 'react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';

export default function TemplatesLayout({ children }: { children: ReactNode }) {
  return <AiMarketingLayout>{children}</AiMarketingLayout>;
}
