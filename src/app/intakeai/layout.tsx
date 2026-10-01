import { ReactNode } from 'react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';

export default function IntakeAiLayout({ children }: { children: ReactNode }) {
  return <AiMarketingLayout activePath="/intakeai">{children}</AiMarketingLayout>;
}
