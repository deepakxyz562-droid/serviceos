import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  X,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Bot,
  CreditCard,
  DollarSign,
  Phone,
  Layers,
  Scale,
  Calendar,
  Workflow,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Fieseros vs ChatBot.com (2026 Comparison) — Autonomous Actions vs Static Text',
  description:
    'Compare Fieseros AI Chatbot vs ChatBot.com. See why businesses prefer Fieseros for real business actions: live calendar booking, CRM dispatch, native form integration, and 0% payment transaction fees.',
  keywords: [
    'Fieseros vs ChatBot.com',
    'ChatBot.com alternative',
    'ChatBot.com comparison',
    'autonomous AI chatbot',
    'best AI chatbot for business',
    'chatbot that books appointments',
    'ChatBot.com pricing alternative',
  ],
  alternates: {
    canonical: 'https://fieseros.com/fieseros-vs-chatbot-com',
  },
  openGraph: {
    title: 'Fieseros vs ChatBot.com (2026 Comparison) | Fieseros',
    description:
      'Compare Fieseros vs ChatBot.com. Real operational actions (CRM, calendar, payments) vs text-only bots.',
    url: 'https://fieseros.com/fieseros-vs-chatbot-com',
    type: 'article',
  },
};

const comparisonMatrix = [
  { feature: 'Autonomous Operational Actions', fieseros: true, chatbotcom: false, note: 'Create CRM leads, schedule jobs, process credit cards' },
  { feature: 'Live Calendar Dispatch Booking', fieseros: true, chatbotcom: false, note: 'Checks technician routes and locks in time slots' },
  { feature: 'Native Credit Card Payments (0% Fee)', fieseros: true, chatbotcom: false, note: 'ChatBot.com requires external redirect links' },
  { feature: 'AI Voice Phone Receptionist', fieseros: true, chatbotcom: false, note: 'Answers incoming phone calls with natural voice' },
  { feature: 'Built-in Form Studio (GPTForm)', fieseros: true, chatbotcom: false, note: 'Full visual form builder with Jotform parity' },
  { feature: '16 Multichannel Deployment Targets', fieseros: true, chatbotcom: false, note: 'Website, WhatsApp, SMS, Instagram, Canva, Phone' },
  { feature: '60-Second Document & URL Training', fieseros: true, chatbotcom: true, note: 'Crawl websites and ingest PDFs/Docs' },
  { feature: 'Human Handoff with Full Transcript', fieseros: true, chatbotcom: true, note: 'Smooth transition to live human agents' },
  { feature: 'Free Forever Tier Available', fieseros: true, chatbotcom: false, note: 'ChatBot.com starts at $52/mo for only 1,000 chats' },
  { feature: 'Native CRM & Dispatch Management', fieseros: true, chatbotcom: false, note: 'Complete field service OS included' },
];

export default function FieserosVsChatbotComPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: 'Fieseros vs ChatBot.com: 2026 Detailed Comparison',
        description: 'Comprehensive comparison between Fieseros autonomous AI chatbots and ChatBot.com static chatbots.',
        author: { '@type': 'Organization', name: 'Fieseros' },
        publisher: { '@type': 'Organization', name: 'Fieseros', url: 'https://fieseros.com' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Why choose Fieseros over ChatBot.com?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'ChatBot.com charges $52/month for basic text FAQs that stop at conversation. Fieseros AI Chatbots perform real operational work: qualifying leads, checking live calendars, scheduling technicians, generating estimates, and taking credit card payments with 0% platform transaction fees.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can Fieseros replace our phone answering service too?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! Unlike ChatBot.com which is text-only, Fieseros includes an AI Voice Phone Receptionist that answers your business phone 24/7 with human-grade speech synthesis.',
            },
          },
        ],
      },
    ],
  };

  return (
    <AiMarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-teal-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Scale className="size-3.5" />
            2026 Head-to-Head Comparison
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Fieseros vs ChatBot.com:{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              Text Bots vs Real Work
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            ChatBot.com costs $52/month for a text bot that answers questions but cannot schedule jobs or take card payments. Fieseros AI Chatbots actually execute operational work: live calendar bookings, customer CRM creation, and in-chat checkout with 0% platform fees.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-xl shadow-teal-600/25 rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/dashboard/chatbot-builder">
                Build Your Chatbot Free <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 font-semibold text-base rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/chatbot">
                See Chatbot Capabilities
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Comparison Matrix */}
      <section className="py-20 border-b border-border bg-muted/15">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground">
              Feature Comparison: Fieseros vs ChatBot.com
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Compare autonomous business execution against text-only bot platforms.
            </p>
          </div>

          <div className="bg-background rounded-3xl border border-border shadow-2xl overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/60 p-4 border-b border-border text-xs sm:text-sm font-bold">
              <div className="col-span-6 text-muted-foreground">Capabilities</div>
              <div className="col-span-3 text-center text-teal-600 font-extrabold">Fieseros AI Studio</div>
              <div className="col-span-3 text-center text-muted-foreground">ChatBot.com</div>
            </div>

            <div className="divide-y divide-border text-xs sm:text-sm">
              {comparisonMatrix.map((row, i) => (
                <div key={i} className="grid grid-cols-12 p-4 items-center hover:bg-muted/10 transition">
                  <div className="col-span-6">
                    <p className="font-semibold text-foreground">{row.feature}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{row.note}</p>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    {row.fieseros ? (
                      <span className="inline-flex items-center gap-1 text-teal-600 font-bold bg-teal-50 dark:bg-teal-950/40 px-2.5 py-1 rounded-full text-xs">
                        <Check className="size-3.5" /> Included
                      </span>
                    ) : (
                      <X className="size-4 text-red-500" />
                    )}
                  </div>
                  <div className="col-span-3 flex justify-center">
                    {row.chatbotcom ? (
                      <Check className="size-4 text-muted-foreground" />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 font-medium text-xs">
                        <X className="size-3.5" /> Not available
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-foreground">
              Why Businesses Switch from ChatBot.com
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <Workflow className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Real Business Actions</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ChatBot.com stops at text. Fieseros triggers 12+ real actions: creating CRM leads, reserving calendar slots, calculating dynamic prices, and taking payments.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <DollarSign className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">No Expensive Chat Limits</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ChatBot.com charges $52/mo for only 1,000 chats, with steep penalties for overages. Fieseros offers a free forever plan with 0% platform transaction fees.
              </p>
            </div>

            <div className="p-6 rounded-2xl border border-border bg-background shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Phone className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Web + Phone AI Receptionist</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ChatBot.com only exists on your website. Fieseros extends your AI agent to incoming phone calls, WhatsApp Business, SMS, and Canva.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-br from-teal-600 via-emerald-700 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Build an AI Chatbot That Actually Does Something
          </h2>
          <p className="text-teal-100 text-base max-w-xl mx-auto">
            Get started in 60 seconds with our free tier. 0% platform transaction fees.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button size="lg" className="h-12 px-8 bg-white text-teal-900 hover:bg-slate-100 font-bold shadow-lg rounded-xl cursor-pointer" asChild>
              <Link href="/dashboard/chatbot-builder">
                Start Building Free <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-white/40 text-white hover:bg-white/10 font-bold rounded-xl cursor-pointer" asChild>
              <Link href="/chatbot">
                See Live Chatbot Demo
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
