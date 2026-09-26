import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ThermometerSun,
  Flame,
  Fan,
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CreditCard,
  Phone,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  ChevronDown,
  Wrench,
  Check,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'AI Chatbot for HVAC Contractors — 24/7 AC & Furnace Lead Booking | Fieseros',
  description:
    'Turn website visitors and late-night emergency calls into scheduled HVAC jobs. Instant SEER2 quotes, emergency dispatch, live calendar booking, and 0% fee deposit collection.',
  keywords: [
    'HVAC AI chatbot',
    'AI receptionist for HVAC',
    'HVAC lead generation bot',
    'heating and cooling chatbot',
    'emergency AC repair booking bot',
    'HVAC dispatch automation',
    'Fieseros AI HVAC',
  ],
  alternates: {
    canonical: 'https://fieseros.com/ai-chatbot-for-hvac',
  },
  openGraph: {
    title: 'AI Chatbot for HVAC Contractors — 24/7 Lead Booking | Fieseros',
    description:
      'Never miss another emergency AC breakdown. Automated intake, SEER2 rebate quotes, and live technician scheduling 24/7.',
    url: 'https://fieseros.com/ai-chatbot-for-hvac',
    type: 'website',
  },
};

export default function AiChatbotForHvacPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Fieseros AI Chatbot for HVAC Contractors',
        applicationCategory: 'BusinessApplication',
        description:
          'Specialized conversational AI chatbot and 24/7 phone receptionist for heating, ventilation, and air conditioning contractors.',
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
            name: 'Can the HVAC AI chatbot distinguish between emergencies and routine tune-ups?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. The chatbot uses HVAC-specific triage logic. If outdoor temperatures are extreme and a home has elderly residents or infants with no cooling or heating, it flags the job as critical emergency priority and immediately alerts your on-call technician.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can the chatbot give accurate estimates for system replacements?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. By taking the home square footage, ceiling height, and zip code, it calculates tonnage requirements and quotes tiered good/better/best system options including local utility rebates.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can it also answer our shop phone line when we are in the field?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Fieseros AI includes an AI Voice Receptionist that shares the exact same knowledge base as your website chatbot, answering calls 24/7 with human-grade natural speech.',
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
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-cyan-500/5 via-teal-500/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <ThermometerSun className="size-3.5" />
            Engineered for Heating &amp; Cooling Contractors
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            The 24/7 AI Chatbot for{' '}
            <span className="bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
              HVAC Contractors
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            When an AC unit fails on a 100°F Saturday afternoon, homeowners call the first company that answers. Fieseros AI qualifies emergency repair leads, quotes system replacements, and books slots directly into your dispatch schedule 24/7.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-base shadow-xl shadow-cyan-600/25 rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/dashboard/chatbot-builder?prompt=HVAC%20emergency%20intake%20and%20tune-up%20booking%20bot">
                Build Free HVAC Chatbot <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 font-semibold text-base rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/chatbot">
                See All Chatbot Features
              </Link>
            </Button>
          </div>

          <div className="mt-12 pt-8 border-t border-border/60 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">24/7</p>
              <p className="text-xs text-muted-foreground mt-0.5">Emergency Triage</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-cyan-600">SEER2</p>
              <p className="text-xs text-muted-foreground mt-0.5">Automated Rebate Math</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">0%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Platform Diagnostic Fees</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">Web + Phone</p>
              <p className="text-xs text-muted-foreground mt-0.5">Omnichannel Intake</p>
            </div>
          </div>
        </div>
      </section>

      {/* HVAC Chatbot in Action Demo */}
      <section className="py-20 border-b border-border bg-muted/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 bg-cyan-500/10 mb-3">
              HVAC Workflow Simulation
            </Badge>
            <h2 className="text-3xl font-extrabold text-foreground">
              Emergency Dispatch &amp; Deposit Collection in 90 Seconds
            </h2>
          </div>

          <div className="bg-background rounded-3xl border border-border shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="size-10 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold">
                <Fan className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">CoolBreeze HVAC 24/7 Dispatch</h4>
                <p className="text-xs text-emerald-600 font-medium">● Connected to live technician board</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-sm">
              <div className="bg-muted/40 p-3.5 rounded-2xl rounded-tl-sm max-w-[85%] border border-border">
                Hello! Welcome to CoolBreeze HVAC. Do you need emergency AC repair or are you scheduling an annual system check?
              </div>
              <div className="bg-cyan-600 text-white p-3.5 rounded-2xl rounded-tr-sm max-w-[80%] ml-auto">
                Emergency! Our upstairs unit stopped cooling and temperature is already 86 degrees inside.
              </div>
              <div className="bg-muted/40 p-3.5 rounded-2xl rounded-tl-sm max-w-[85%] border border-border space-y-2">
                <p className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="size-4 shrink-0" /> High-Priority Heat Warning Flagged
                </p>
                <p>
                  We have on-call technician Ryan M. 15 minutes away from your area. Diagnostic visit is $89 (credited toward any repairs).
                </p>
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-foreground">Technician Arrival Window: Today, 3:30 PM - 5:00 PM</div>
                  <div className="text-muted-foreground">Address: 742 Evergreen Terr • Contact: (512) 555-0198</div>
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <span>Action: Technician Ryan dispatched • Job #HVAC-4412 created</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core HVAC Features */}
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center">
                <Flame className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">After-Hours Emergency Triage</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Automatically detects dangerous temperature spikes, elderly occupants, or water leaks from frozen coils to prioritize urgent dispatches.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <DollarSign className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Automated System Replacement Quotes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Calculates square footage tonnage, compares 14 vs 16 SEER2 efficiency ratings, and calculates federal Inflation Reduction Act tax credits.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <Phone className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Phone + Web Synchronization</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Technicians on roofs can&apos;t answer the phone. The AI voice receptionist answers 100% of calls, booking appointments directly into your dispatch board.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center bg-gradient-to-br from-cyan-600 via-teal-700 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Stop Losing HVAC Emergency Calls to Competitors
          </h2>
          <p className="text-cyan-100 text-base max-w-xl mx-auto">
            Deploy your custom HVAC AI Chatbot and Phone Receptionist in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button size="lg" className="h-12 px-8 bg-white text-cyan-900 hover:bg-slate-100 font-bold shadow-lg rounded-xl cursor-pointer" asChild>
              <Link href="/dashboard/chatbot-builder?prompt=HVAC%20emergency%20intake%20and%20tune-up%20booking%20bot">
                Build Free HVAC Bot <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-white/40 text-white hover:bg-white/10 font-bold rounded-xl cursor-pointer" asChild>
              <Link href="/hvac-software">
                View Full HVAC Service OS
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
