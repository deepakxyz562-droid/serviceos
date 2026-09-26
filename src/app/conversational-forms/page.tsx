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
  ShieldCheck,
  CreditCard,
  Bot,
  HelpCircle,
  Layers,
  ChevronDown,
  ChevronRight,
  Send,
  Star,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Conversational Form Builder — 1-Question-at-a-Time AI Forms | Fieseros',
  description:
    'Turn static questionnaires into engaging 1-question-at-a-time conversational chat experiences. Boost form completion rates by up to 3.8x with AI conversational logic, voice input, and 0% platform fee payments.',
  alternates: { canonical: 'https://fieseros.com/conversational-forms' },
  openGraph: {
    title: 'Conversational Forms & Typeform Alternative | Fieseros',
    description:
      'The modern conversational form builder. 1-question-at-a-time interactive chat and speech flow with integrated CRM and job dispatch.',
    url: 'https://fieseros.com/conversational-forms',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Conversational Form Builder — 1-Question-at-a-Time Forms | Fieseros',
    description:
      'Boost form completion rates by 3.8x. Single question flows, voice dictation, and 1-click conversion into an AI Chatbot.',
  },
};

export default function ConversationalFormsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
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
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is a conversational form?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'A conversational form presents questions one at a time like a messaging app, rather than showing a long intimidating list of inputs all at once. This significantly reduces cognitive load and bounce rates.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I turn my existing web forms into conversational flows?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! In Fieseros, you can toggle any form between Classic Document mode, Card-by-Card mode, and AI Conversational Chatbot mode with a single click.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can conversational forms collect credit card payments?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, respondents can pay via Stripe, PayPal, Apple Pay, and 33+ gateways directly within the conversational flow with 0% platform transaction fees.',
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
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-indigo-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <MessageSquare className="size-3.5" />
            3.8x Higher Completion Rates • 0% Transaction Fees
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            Forms That Become{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
              Natural Conversations
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Replace intimidating walls of input fields with human, step-by-step conversational journeys. Guide visitors one question at a time with instant validation, voice input, and seamless 1-click chatbot parity.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg shadow-indigo-600/25 rounded-xl cursor-pointer" asChild>
              <Link href="/forms/new">
                Create Conversational Form <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 font-semibold text-base rounded-xl cursor-pointer" asChild>
              <Link href="/chatbot">
                Pair with AI Chatbot
              </Link>
            </Button>
          </div>

          {/* Social Proof Stats */}
          <div className="mt-12 pt-8 border-t border-border/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">3.8x</p>
              <p className="text-xs text-muted-foreground mt-0.5">Higher Completion Rate</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">62%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Lower Drop-Off Rate</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-indigo-600">0%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Platform Payment Fees</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">1-Click</p>
              <p className="text-xs text-muted-foreground mt-0.5">Form to Chatbot Conversion</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Card-by-Card Visual Preview */}
      <section className="py-20 border-b border-border bg-muted/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-600 bg-indigo-500/10 mb-3">
              The 1-Question-at-a-Time Experience
            </Badge>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
              Zero Clutter. Total Focus.
            </h2>
            <p className="text-muted-foreground mt-3 text-base">
              Every question gets the customer&apos;s full attention. Smooth transitions and instant validation make filling out forms feel as effortless as texting a friend.
            </p>
          </div>

          <div className="max-w-2xl mx-auto bg-background rounded-3xl border border-border shadow-2xl p-6 sm:p-10 space-y-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold text-indigo-600">Question 2 of 5</span>
              <span>40% Completed</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-1.5 rounded-full w-2/5" />
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                What type of service does your HVAC system require?
              </h3>
              <p className="text-sm text-muted-foreground">
                Select the option that best matches your situation today.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-2">
              <div className="p-3.5 rounded-2xl border-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-sm font-semibold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                <span>Emergency AC / Heating Repair (System Down)</span>
                <CheckCircle2 className="size-4 text-indigo-600" />
              </div>
              <div className="p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/40 transition text-sm font-medium text-foreground flex items-center justify-between cursor-pointer">
                <span>Seasonal Preventative Tune-Up &amp; Inspection</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
              <div className="p-3.5 rounded-2xl border border-border bg-background hover:bg-muted/40 transition text-sm font-medium text-foreground flex items-center justify-between cursor-pointer">
                <span>Complete System Replacement &amp; Ductwork Estimate</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-border">
              <span className="text-xs text-muted-foreground">Press <strong>Enter ↵</strong> to continue</span>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5">
                Continue <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Pillars of Conversational Forms */}
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                <TrendingUp className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Zero Form Fatigue</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                By presenting one question at a time, visitors stay engaged from start to finish with dramatically lower bounce rates.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <Smartphone className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Mobile-First Gestures</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Optimized with single-tap answer buttons, speech-to-text voice input, and buttery smooth touch gestures.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Bot className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">1-Click Chatbot Parity</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Any conversational form can also be answered through an AI Chatbot widget, WhatsApp bot, or phone receptionist with zero reconfiguration.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-b border-border bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="space-y-4">
            <div className="bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-base text-foreground">What makes a form &ldquo;conversational&rdquo;?</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                A conversational form presents questions one by one in a step-by-step card or chat flow. This reduces visual overwhelm, guides the user with conditional logic, and leads to significantly higher completion rates than traditional forms.
              </p>
            </div>
            <div className="bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-base text-foreground">Can I collect payments in conversational forms?</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Yes! Fieseros integrates natively with Stripe, PayPal, Apple Pay, Square, and 33+ payment processors with 0% platform transaction fees.
              </p>
            </div>
            <div className="bg-background p-5 rounded-2xl border border-border">
              <h4 className="font-bold text-base text-foreground">Can I switch between traditional document and conversational view?</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Yes. In Fieseros Form Studio, you can toggle your layout between Classic Document, Card-by-Card, and AI Chatbot with a single click. Your questions and calculations stay completely in sync.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Upgrade to Conversational Forms Today
          </h2>
          <p className="text-indigo-100 text-base max-w-xl mx-auto">
            Build your first conversational flow in under 2 minutes. Free forever tier with 0% platform transaction fees.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button size="lg" className="h-12 px-8 bg-white text-indigo-800 hover:bg-slate-100 font-bold shadow-lg rounded-xl cursor-pointer" asChild>
              <Link href="/forms/new">
                Build Free Now <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-white/40 text-white hover:bg-white/10 font-bold rounded-xl cursor-pointer" asChild>
              <Link href="/chatbot">
                See AI Chatbot Builder
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
