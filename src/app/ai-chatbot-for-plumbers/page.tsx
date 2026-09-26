import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Wrench,
  Droplets,
  ShieldCheck,
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CreditCard,
  Phone,
  Zap,
  Clock,
  AlertCircle,
  FileCheck2,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'AI Chatbot for Plumbing Contractors — 24/7 Emergency Booking & Water Heater Quotes | Fieseros',
  description:
    'Capture every burst pipe, water heater failure, and drain clearing lead 24/7. Instant triage, shut-off valve guidance, live calendar dispatch, and 0% fee card deposits.',
  keywords: [
    'plumber AI chatbot',
    'AI receptionist for plumbers',
    'plumbing lead generation bot',
    'emergency plumbing booking bot',
    'water heater quote calculator',
    'plumber dispatch automation',
    'Fieseros AI Plumber',
  ],
  alternates: {
    canonical: 'https://fieseros.com/ai-chatbot-for-plumbers',
  },
  openGraph: {
    title: 'AI Chatbot for Plumbers — 24/7 Emergency Booking | Fieseros',
    description:
      'Never lose another plumbing emergency call. Instant shut-off valve guidance, live technician scheduling, and card deposits.',
    url: 'https://fieseros.com/ai-chatbot-for-plumbers',
    type: 'website',
  },
};

export default function AiChatbotForPlumbersPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Fieseros AI Chatbot for Plumbing Contractors',
        applicationCategory: 'BusinessApplication',
        description:
          'Specialized conversational AI chatbot and 24/7 phone receptionist for residential and commercial plumbing contractors.',
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
            name: 'Can the chatbot give homeowners emergency water shut-off instructions?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! While dispatching an on-call plumber, the chatbot immediately instructs the homeowner on how to locate and shut off the main water valve to prevent catastrophic flooding.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can customers upload photos of their leaks or water heater labels?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Customers can attach photos directly in the chat widget. Images are attached directly to the dispatch job for your plumber to review before arriving.',
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
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-blue-500/5 via-sky-500/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Droplets className="size-3.5" />
            Built for Residential &amp; Commercial Plumbers
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
            The 24/7 AI Chatbot for{' '}
            <span className="bg-gradient-to-r from-blue-600 via-sky-600 to-teal-600 bg-clip-text text-transparent">
              Plumbing Contractors
            </span>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Burst pipes and backed-up drains don&apos;t wait for Monday morning. Fieseros AI triages water emergencies, guides homeowners to shut-off valves, schedules on-call plumbers, and collects diagnostic deposits 24/7.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-xl shadow-blue-600/25 rounded-xl cursor-pointer"
              asChild
            >
              <Link href="/dashboard/chatbot-builder?prompt=Plumbing%20emergency%20intake%20and%20water%20heater%20quote%20bot">
                Build Free Plumbing Chatbot <ArrowRight className="size-4 ml-2" />
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
              <p className="text-xs text-muted-foreground mt-0.5">Emergency Water Intake</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-blue-600">Valve Help</p>
              <p className="text-xs text-muted-foreground mt-0.5">Instant Flood Mitigation</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">0%</p>
              <p className="text-xs text-muted-foreground mt-0.5">Platform Deposit Fees</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-foreground">Web + Phone</p>
              <p className="text-xs text-muted-foreground mt-0.5">Voice &amp; Chat Sync</p>
            </div>
          </div>
        </div>
      </section>

      {/* Plumbing Chatbot in Action Demo */}
      <section className="py-20 border-b border-border bg-muted/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10 mb-3">
              Plumbing Simulation
            </Badge>
            <h2 className="text-3xl font-extrabold text-foreground">
              Emergency Pipe Burst Handled in Under 60 Seconds
            </h2>
          </div>

          <div className="bg-background rounded-3xl border border-border shadow-2xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="size-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                <Wrench className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Cascade Plumbing 24/7 Emergency Line</h4>
                <p className="text-xs text-emerald-600 font-medium">● Connected to Master Plumber on call</p>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-sm">
              <div className="bg-muted/40 p-3.5 rounded-2xl rounded-tl-sm max-w-[85%] border border-border">
                Hello! This is Cascade Plumbing. Do you have active water leaking right now or are you planning a future installation?
              </div>
              <div className="bg-blue-600 text-white p-3.5 rounded-2xl rounded-tr-sm max-w-[80%] ml-auto">
                Water is gushing out from under my laundry room wall! I don&apos;t know what to do!
              </div>
              <div className="bg-muted/40 p-3.5 rounded-2xl rounded-tl-sm max-w-[85%] border border-border space-y-2">
                <p className="text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
                  <AlertCircle className="size-4 shrink-0" /> Immediate Step: Turn Off Main Water Valve
                </p>
                <p className="text-xs leading-relaxed">
                  Your main shut-off valve is typically located near your front water meter or where the main water line enters the garage/basement. Turn the lever clockwise a quarter turn.
                </p>
                <p className="text-xs font-semibold text-foreground pt-1">
                  I have notified Master Plumber Kevin S. who is in your subdivision right now. He will arrive within 25 minutes.
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                <span>Action: Emergency dispatch confirmed • GPS route: 18 mins</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Plumbing Features */}
      <section className="py-20 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                <AlertTriangle className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Emergency Water Triage</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Immediately separates dangerous burst pipe scenarios from routine faucet drips, providing immediate shutoff instructions while dispatching technicians.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center">
                <DollarSign className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Water Heater &amp; Repipe Estimator</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Asks for household bathroom count, gas vs electric supply, and tank vs tankless preference to calculate binding price estimates.
              </p>
            </div>

            <div className="bg-background p-6 rounded-2xl border border-border shadow-sm space-y-3">
              <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                <CreditCard className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">0% Fee Emergency Deposits</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Securely collect after-hours diagnostic fees or repair deposits right inside the chat window with Apple Pay, Google Pay, or credit card.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 text-center bg-gradient-to-br from-blue-700 via-sky-700 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Capture Every Emergency Plumbing Call
          </h2>
          <p className="text-blue-100 text-base max-w-xl mx-auto">
            Deploy your plumbing AI chatbot and phone receptionist in 5 minutes. 0% platform transaction fees.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button size="lg" className="h-12 px-8 bg-white text-blue-900 hover:bg-slate-100 font-bold shadow-lg rounded-xl cursor-pointer" asChild>
              <Link href="/dashboard/chatbot-builder?prompt=Plumbing%20emergency%20intake%20and%20water%20heater%20quote%20bot">
                Build Free Plumbing Bot <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 border-white/40 text-white hover:bg-white/10 font-bold rounded-xl cursor-pointer" asChild>
              <Link href="/chatbot">
                Explore Chatbot Features
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
