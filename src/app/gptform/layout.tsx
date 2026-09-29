import { ReactNode } from 'react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';

export default function GptFormLayout({ children }: { children: ReactNode }) {
  return <AiMarketingLayout activePath="/gptform">{children}</AiMarketingLayout>;
}
