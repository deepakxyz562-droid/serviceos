import { Metadata } from 'next';
import { QuoteFlowView } from '@/components/views/quote-flow-view';

export const metadata: Metadata = {
  title: 'QuoteFlow — AI Quote & Invoice | ServiceOS',
  description: 'Describe it. We create it. AI Quote & Invoice platform.',
};

export default function QuoteFlowPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      <QuoteFlowView />
    </main>
  );
}
