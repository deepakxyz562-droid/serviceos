import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Phone,
  MessageSquare,
  Globe,
  Sliders,
  Users,
  Mic,
  Smile,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'AI Agent Builder — Create Custom Multimodal AI Agents for Business | Fieseros',
  description:
    'Design, customize, and deploy multimodal AI business agents in minutes. Curated 36+ realistic avatars, natural voice synthesis, 11 multichannel integrations, and live device simulator.',
  alternates: { canonical: '/ai-agent-builder' },
  openGraph: {
    title: 'AI Agent Builder — 36+ Realistic Avatars & 11 Channels | Fieseros',
    description:
      'The modern AI Agent studio. Customize avatars, voice accents, proactive greetings, and test in a real-time simulator before deploying to web, phone, WhatsApp, and CRM.',
    type: 'website',
  },
};

export default function AiAgentBuilderPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Fieseros AI Agent Builder Studio',
    applicationCategory: 'BusinessApplication',
    description:
      'Multimodal AI agent designer with 36+ realistic avatar gallery, voice synthesis, 11 multi-channel deployment targets, and live testing simulator.',
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
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-purple-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Bot className="size-3.5" />
            Multimodal AI Agent Studio
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Create Custom AI Agents with{' '}
            <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              Realistic Avatars &amp; Voice
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Deploy an intelligent face and voice for your business. Choose from 36+ realistic avatars, customize conversational style, and preview in real-time across 11 communication channels.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-base shadow-lg shadow-purple-600/25" asChild>
              <Link href="/forms/new">
                Open AI Agent Studio <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold text-base" asChild>
              <Link href="/ai-business-agent">
                See How It Automates CRM
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Everything in the AI Agent Studio
            </h2>
            <p className="mt-3 text-muted-foreground text-base">
              A complete visual suite designed for rapid creation and testing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                <Smile className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">36+ Curated Realistic Avatars</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose professional, friendly avatars across various demographics or generate custom avatars from text prompts.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <Phone className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">11 Multi-Channel Targets</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your AI agent to website chat widgets, standalone links, WhatsApp, SMS, 24/7 Phone, Instagram, and Gmail.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Mic className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Live Device Simulator</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Test chat, voice wave visualizer, form data extraction, and screen sharing in real-time before going live.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Launch Your Custom AI Agent in Minutes
          </h2>
          <p className="text-purple-100 text-base max-w-xl mx-auto">
            Design, preview, and deploy without writing code.
          </p>
          <Button size="lg" className="h-12 px-8 bg-white text-purple-800 hover:bg-purple-50 font-bold shadow-lg" asChild>
            <Link href="/forms/new">
              Start Designing Free
            </Link>
          </Button>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
