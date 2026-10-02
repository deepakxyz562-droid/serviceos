import { Metadata } from 'next';
import { QuoteFlowView } from '@/components/views/quote-flow-view';

export const metadata: Metadata = {
  title: 'AI Quotes & Invoices | ServiceOS',
  description: 'Create professional quotes and invoices with conversational AI, voice, and instant multichannel sharing.',
};

export default function QuotesPage() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      <QuoteFlowView />
    </main>
  );
}
