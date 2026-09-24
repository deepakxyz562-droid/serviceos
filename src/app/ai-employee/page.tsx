import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PhoneCall,
  CalendarCheck,
  UserCheck,
  PhoneForwarded,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Clock,
  Zap,
  Mic,
  Languages,
  DollarSign,
  Headphones,
  Sliders,
  FileSpreadsheet,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { CornerstoneLayout, CornerstoneHero } from '@/components/seo/cornerstone-layout';
import { CtaSection } from '@/components/seo/cta-section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { getSoftwareApplicationSchema, getFaqSchema } from '@/lib/seo/schemas';
import { CallSimulator } from './call-simulator';

export const metadata: Metadata = {
  title: '24/7 AI Voice Receptionist for Field Service & Trade Businesses | Fieseros',
  description:
    'Never miss another call, estimate, or high-value job. Fieseros 24/7 AI Voice Receptionist answers on the first ring, qualifies leads, quotes pricing, and books appointments straight into your schedule.',
  keywords: [
    'AI voice receptionist',
    'contractor answering service',
    'AI receptionist for trade businesses',
    'field service phone answering',
    '24/7 AI phone agent',
    'automated appointment booking phone agent',
    'plumbing answering service',
    'HVAC AI receptionist',
    'electrical contractor answering AI',
    'Vapi voice AI for contractors',
  ],
  alternates: {
    canonical: 'https://fieseros.com/ai-employee',
  },
  openGraph: {
    title: '24/7 AI Voice Receptionist for Field Service & Trade Businesses | Fieseros',
    description:
      'Never miss another customer call. Fieseros AI Voice Receptionist answers on the first ring, qualifies leads, and books jobs directly into your team calendar.',
    url: 'https://fieseros.com/ai-employee',
    siteName: 'Fieseros',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '24/7 AI Voice Receptionist for Field Service & Trade Businesses | Fieseros',
    description:
      'Turn missed calls into booked revenue. 24/7 AI voice phone agent for plumbers, HVAC pros, electricians, and contractors.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const capabilities = [
  {
    icon: PhoneCall,
    title: 'Instant First-Ring Answering (24/7/365)',
    description:
      'Picks up every incoming call in under 1 second. No holds, no busy tones, no missed calls during rush hours, weekends, or late-night emergencies.',
  },
  {
    icon: CalendarCheck,
    title: 'Live Calendar Booking & Dispatch',
    description:
      'Checks real-time availability across your technicians, calculates travel zones, quotes appointment windows, and confirms bookings on the spot.',
  },
  {
    icon: PhoneForwarded,
    title: 'Emergency Triage & Warm Call Transfers',
    description:
      'Identifies high-priority emergency calls (e.g. active water leaks, zero heating, gas smells) and immediately warm-transfers to your on-call technician.',
  },
  {
    icon: UserCheck,
    title: 'Accurate Lead Qualification & Capture',
    description:
      'Collects caller name, verified address, detailed issue description, timeframe, and budget before creating a structured lead in your CRM.',
  },
  {
    icon: Languages,
    title: 'Fluent in 30+ Languages',
    description:
      'Seamlessly speaks English, Spanish, French, and over 30 languages. Auto-detects caller language and responds naturally with zero awkward latency.',
  },
  {
    icon: Zap,
    title: 'Full CRM & Audio Transcript Sync',
    description:
      'Every call is recorded, transcribed, and summarized. An actionable job ticket with customer details is instantly logged in Fieseros CRM.',
  },
];

const faqs = [
  {
    question: 'How does the AI Voice Receptionist connect to my existing business phone number?',
    answer:
      'You can easily set up conditional or unconditional call forwarding from your current carrier (Verizon, AT&T, RingCentral, T-Mobile, etc.) to your Fieseros dedicated AI number. Alternatively, you can claim a new local or toll-free number directly in Fieseros.',
  },
  {
    question: 'Does the AI receptionist sound robotic or natural?',
    answer:
      'Fieseros utilizes state-of-the-art voice synthesis and ultra-low latency AI (sub-500ms response time). Callers experience natural conversation pacing, polite interruptions, and clear human-like intonation.',
  },
  {
    question: 'What happens when a caller has a true emergency?',
    answer:
      'You define custom emergency keywords (e.g. "pipe burst", "no heat", "electrical sparks", "flooding"). When detected, the AI immediately initiates a warm transfer to your on-call technician or manager phone number.',
  },
  {
    question: 'Can the AI book appointments directly into my technician calendars?',
    answer:
      'Yes. The AI voice agent integrates with your Fieseros dispatch calendar in real time. It respects technician working hours, service zones, job buffer times, and recurring rules.',
  },
  {
    question: 'How long does it take to set up and train the AI?',
    answer:
      'Most contractors are live within 10 minutes. Simply select your trade, customize your service menu and pricing guidelines, connect your calendar, and test your first call.',
  },
  {
    question: 'Can I bring my own Vapi.ai API key or Twilio numbers?',
    answer:
      'Yes! Fieseros supports custom BYO Vapi and Twilio keys if you prefer direct provider billing, or you can use Fieseros built-in telephony.',
  },
];

export default function AiEmployeePillarPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: 'Fieseros 24/7 AI Voice Receptionist',
    description:
      'Autonomous AI phone agent and virtual receptionist for contractors and field service companies. Answers 24/7, qualifies leads, quotes prices, and books appointments.',
    url: 'https://fieseros.com/ai-employee',
    applicationCategory: 'BusinessApplication',
    offers: { price: '0', priceCurrency: 'USD' },
  });

  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      activePath="/ai-employee"
      breadcrumbs={[
        { name: 'Home', url: 'https://fieseros.com' },
        { name: 'AI Voice Receptionist', url: 'https://fieseros.com/ai-employee' },
      ]}
      additionalSchema={[appSchema, faqSchema]}
      showAiReceptionist={false}
    >
      {/* Hero Section */}
      <CornerstoneHero
        eyebrow="24/7 Autonomous AI Voice Agent"
        title="Never Miss Another Call. Your 24/7 AI Voice Receptionist."
        subtitle="Every missed call is lost revenue. Fieseros AI Voice Receptionist answers on the first ring, qualifies leads, quotes pricing, books appointments live into your schedule, and logs everything to your CRM."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3.5 text-base font-semibold text-foreground hover:bg-muted transition-colors"
          >
            <span>View Pricing &amp; Plans</span>
          </Link>
        </div>
      </CornerstoneHero>

      {/* Interactive Call Simulation Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
            <Sparkles className="size-3.5" /> Live Experience
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Hear How the AI Handles Inbound Calls in Real Time
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Select a trade scenario below to see how Ava triages emergency requests, quotes availability, and books appointments in seconds.
          </p>
        </div>

        <CallSimulator />
      </section>

      {/* 6 Flagship Capabilities Grid */}
      <section className="border-t border-border/80 bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Built Specifically for the Trades
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mt-2">
              Everything Your Front Desk Needs to Run on Autopilot
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3">
              Unlike generic answering services with scripted call centers, Fieseros AI is deeply integrated with your real dispatch calendar, technician skills, and customer CRM.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.title} className="border-border/80 bg-card hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="size-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg font-bold text-foreground">{c.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {c.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Matrix: Why Contractors Choose AI Receptionist */}
      <section className="py-16 lg:py-24 border-t border-border/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Cost &amp; ROI Comparison
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mt-2">
              Compare Fieseros AI vs Traditional Front-Desk Options
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-3">
              See why contractors are saving over $3,000 every month while capturing 40% more after-hours jobs.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-foreground font-semibold">
                  <th className="p-4 sm:p-5">Feature / Capability</th>
                  <th className="p-4 sm:p-5 text-muted-foreground">In-House Staff</th>
                  <th className="p-4 sm:p-5 text-muted-foreground">Legacy Call Center</th>
                  <th className="p-4 sm:p-5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold">
                    Fieseros AI Voice Agent
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-muted-foreground">
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">Monthly Cost</td>
                  <td className="p-4 sm:p-5">$3,500 – $4,500 / mo</td>
                  <td className="p-4 sm:p-5">$600 – $1,200 / mo + per-min</td>
                  <td className="p-4 sm:p-5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    Included with Fieseros
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">24/7/365 Coverage</td>
                  <td className="p-4 sm:p-5">9 AM – 5 PM Only</td>
                  <td className="p-4 sm:p-5">Extra Charge for Nights</td>
                  <td className="p-4 sm:p-5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    100% 24/7 All Day &amp; Holidays
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">First-Ring Pickup</td>
                  <td className="p-4 sm:p-5">Misses when line is busy</td>
                  <td className="p-4 sm:p-5">Long wait times &amp; hold music</td>
                  <td className="p-4 sm:p-5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    Instant &lt; 1 sec answer
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">Live Calendar Booking</td>
                  <td className="p-4 sm:p-5">Manual data entry</td>
                  <td className="p-4 sm:p-5">Takes notes only (No booking)</td>
                  <td className="p-4 sm:p-5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    Real-Time Dispatch Calendar Sync
                  </td>
                </tr>
                <tr>
                  <td className="p-4 sm:p-5 font-medium text-foreground">Direct CRM Integration</td>
                  <td className="p-4 sm:p-5">Time-consuming</td>
                  <td className="p-4 sm:p-5">Sends raw emails</td>
                  <td className="p-4 sm:p-5 font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                    Automatic Recording, Audio &amp; Job Ticket
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4-Step Simple Onboarding */}
      <section className="py-16 lg:py-24 border-t border-border/80 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Zero Tech Headache
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground mt-2">
              Up and Running in 4 Simple Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Connect Number',
                desc: 'Forward missed/after-hours calls from your current carrier or pick a dedicated local phone number.',
              },
              {
                step: '02',
                title: 'Set Service Rules',
                desc: 'Define standard service pricing, emergency criteria, operating hours, and dispatch guidelines.',
              },
              {
                step: '03',
                title: 'Sync Dispatch Calendar',
                desc: 'Connect your technicians and zones so the AI knows real-time availability for instant scheduling.',
              },
              {
                step: '04',
                title: 'Never Miss a Lead',
                desc: 'AI answers calls, quotes jobs, books slots, and texts confirmations to both customer and technician.',
              },
            ].map((s) => (
              <div key={s.step} className="rounded-2xl border border-border bg-card p-6 relative">
                <span className="text-3xl font-extrabold text-emerald-600/30 dark:text-emerald-400/20 block mb-2">
                  {s.step}
                </span>
                <h3 className="text-base font-bold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 lg:py-24 border-t border-border/80">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Everything you need to know about Fieseros 24/7 AI Voice Receptionist.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`} className="border border-border/80 rounded-xl px-4 bg-card">
                <AccordionTrigger className="text-sm sm:text-base font-semibold text-foreground py-4 text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <CtaSection
        title="Ready to Never Miss Another Customer Call?"
        subtitle="Join hundreds of service contractors using Fieseros AI Voice Receptionist to capture after-hours revenue and deliver 5-star customer experiences."
        primaryCtaText="Start 14-Day Free Trial"
        primaryCtaHref="/#signup"
        secondaryCtaText="Explore All Features"
        secondaryCtaHref="/features"
      />
    </CornerstoneLayout>
  );
}
