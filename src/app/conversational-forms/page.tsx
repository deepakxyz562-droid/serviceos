import type { Metadata } from 'next';
import Link from 'next/link';
import {
  MessageSquare,
  Sparkles,
  ArrowRight,
  Zap,
  CheckCircle2,
  TrendingUp,
  Smartphone,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Conversational Form Builder — 1-Question-at-a-Time AI Forms | Fieseros',
  description:
    'Turn static questionnaires into engaging 1-question-at-a-time conversational chat experiences. Boost form completion rates by up to 3.8x with AI conversational logic.',
  alternates: { canonical: '/conversational-forms' },
  openGraph: {
    title: 'Conversational Forms & Typeform Alternative | Fieseros',
    description:
      'The modern conversational form builder. 1-question-at-a-time interactive chat and speech flow with integrated CRM and job dispatch.',
    type: 'website',
  },
};

export default function ConversationalFormsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Fieseros Conversational Form Builder',
    applicationCategory: 'BusinessApplication',
    description:
      'High-converting 1-question-at-a-time conversational form builder powered by adaptive AI logic, speech input, and automated CRM synchronization.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <AiMarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-indigo-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <MessageSquare className="size-3.5" />
            3.8x Higher Completion Rates
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Forms That Feel Like a{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Natural Conversation
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Replace boring, intimidating walls of input fields. Guide respondents one question at a time with smooth transitions, voice support, and intelligent branching logic.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg shadow-indigo-600/25" asChild>
              <Link href="/forms/new">
                Create Conversational Form <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold text-base" asChild>
              <Link href="/templates">
                Explore 20,000+ Templates
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Zero Form Fatigue</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By presenting one question at a time, visitors stay engaged from start to finish with dramatically lower bounce rates.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Smartphone className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Mobile-First Experience</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Optimized with single-tap answer buttons, speech-to-text voice input, and buttery smooth touch gestures.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Zap className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Instant CRM Synchronization</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Answers populate directly into contact profiles, triggering automated follow-up sequences and technician dispatches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Upgrade to Conversational Forms Today
          </h2>
          <p className="text-indigo-100 text-base max-w-xl mx-auto">
            Build your first conversational flow in under 2 minutes.
          </p>
          <Button size="lg" className="h-12 px-8 bg-white text-indigo-800 hover:bg-indigo-50 font-bold shadow-lg" asChild>
            <Link href="/forms/new">
              Build Free Now
            </Link>
          </Button>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
