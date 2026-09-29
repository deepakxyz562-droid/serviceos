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
  Clock,
  Zap,
  Languages,
  DollarSign,
  TrendingUp,
  Headphones,
  Sliders,
  Award,
  Wrench,
  Flame,
  Home,
} from 'lucide-react';
import { CornerstoneHero, ContentSection } from '@/components/seo/cornerstone-layout';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { CtaSection } from '@/components/seo/cta-section';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { getSoftwareApplicationSchema, getFaqSchema } from '@/lib/seo/schemas';
import { CallSimulator } from '@/app/ai-employee/call-simulator';

export const metadata: Metadata = {
  title: 'AI Receptionist for Small Business & Contractors | Fieseros',
  description:
    '24/7 AI phone receptionist for small businesses & contractors. Answers on the 1st ring, qualifies leads, quotes prices & books appointments into your calendar.',
  keywords: [
    'AI receptionist for small business',
    'AI receptionist for service businesses',
    'AI phone answering service for small business',
    'AI receptionist for contractors',
    'automated phone answering for service businesses',
    'virtual receptionist for contractors',
    'AI voice agent for small business',
    '24/7 contractor phone answering',
    'plumbing AI receptionist',
    'HVAC AI receptionist',
  ],
  alternates: {
    canonical: 'https://fieseros.com/ai-receptionist',
  },
  openGraph: {
    title: 'AI Receptionist for Small Business & Contractors | Fieseros',
    description:
      'Never miss another customer call. Fieseros 24/7 AI Receptionist answers on the first ring, qualifies leads, and books jobs directly into your team calendar.',
    url: 'https://fieseros.com/ai-receptionist',
    siteName: 'Fieseros',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Receptionist for Small Business & Contractors | Fieseros',
    description:
      'Turn missed calls into booked revenue. 24/7 AI voice phone agent for small businesses, plumbers, HVAC pros, electricians, and contractors.',
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
      'Picks up every incoming phone call in under 1 second. No voicemail, no busy tones, and no lost revenue during peak job hours, weekends, or late-night emergencies.',
  },
  {
    icon: CalendarCheck,
    title: 'Live Calendar Booking & Dispatch',
    description:
      'Checks real-time technician availability, respects service zones and driving buffers, quotes time windows, and locks confirmed appointments directly into your calendar.',
  },
  {
    icon: PhoneForwarded,
    title: 'Emergency Triage & Warm Call Transfers',
    description:
      'Detects critical emergencies (burst pipes, gas leaks, AC failures in extreme heat) and instantly warm-transfers the customer to your on-call technician.',
  },
  {
    icon: UserCheck,
    title: 'Thorough Lead Qualification & CRM Entry',
    description:
      'Collects caller name, verified service address, job scope, timeline, and budget before automatically creating an enriched customer record in your CRM.',
  },
  {
    icon: Languages,
    title: 'Fluent in 30+ Languages with Zero Lag',
    description:
      'Seamlessly converses in English, Spanish, French, and over 30 languages. Automatically detects caller language and speaks naturally with human-like intonation.',
  },
  {
    icon: Zap,
    title: 'Full CRM & Audio Transcript Sync',
    description:
      'Every call is recorded, transcribed, and summarized with key action items. You get an SMS notification and instant job card in Fieseros CRM.',
  },
];

const tradePillars = [
  {
    title: 'Plumbing Contractors',
    icon: Wrench,
    desc: 'Triages active leaks, schedules water heater replacements, and warm-transfers nighttime sewer backups to on-call techs.',
    link: '/plumbing-software',
  },
  {
    title: 'HVAC Businesses',
    icon: Flame,
    desc: 'Handles seasonal heatwave & winter freeze call surges, confirms furnace filter sizes, and books seasonal tune-ups.',
    link: '/hvac-software',
  },
  {
    title: 'Electrical Contractors',
    icon: Zap,
    desc: 'Qualifies panel upgrades, EV charger installations, and rewiring projects while you are on job sites with tools in hand.',
    link: '/electrical-contractor-software',
  },
  {
    title: 'Handyman & Home Services',
    icon: Home,
    desc: 'Quotes punch-list repairs, confirms material supplies, and schedules morning/afternoon service windows automatically.',
    link: '/handyman-software',
  },
];

const faqs = [
  {
    question: 'How does the AI receptionist connect to my existing business phone number?',
    answer:
      'You can easily set up conditional call forwarding (e.g. forward when busy, unanswered after 3 rings, or after-hours) from your existing carrier (AT&T, Verizon, T-Mobile, RingCentral, Vonage) to your dedicated Fieseros AI phone line. You can also provision a brand new local or toll-free number directly in Fieseros.',
  },
  {
    question: 'Why choose an AI receptionist instead of an answering service or call center?',
    answer:
      'Traditional answering services charge $1.50–$3.00 per minute, take basic messages, and often mispronounce trade terminology. Fieseros AI Receptionist costs a fraction of call centers, answers instantly on the first ring, knows your specific trade and pricing guidelines, and actually books appointments live into your calendar instead of just taking notes.',
  },
  {
    question: 'Does the AI receptionist sound robotic or like a real human?',
    answer:
      'Fieseros uses ultra-low latency voice models (under 500ms response time) with natural conversational pacing, pauses, and friendly inflection. Callers frequently mistake our AI for an in-house dispatcher.',
  },
  {
    question: 'What happens when a caller has a true emergency?',
    answer:
      'You set custom emergency detection rules (e.g. "pipe burst", "smell gas", "flooding", "no heat with infants"). When an emergency is detected, the AI gathers the urgent location details and immediately transfers the caller live to your designated on-call phone number.',
  },
  {
    question: 'Can the AI quote prices and estimate job ranges?',
    answer:
      'Yes. You can provide standard diagnostic fees, minimum service charges, and typical price ranges in your Fieseros settings. The AI explains your pricing transparently to set customer expectations before booking.',
  },
  {
    question: 'How long does setup take?',
    answer:
      'Most small businesses and contractors are up and running in under 10 minutes. Select your trade, specify your business hours and service areas, connect your calendar, and test the phone agent immediately.',
  },
];

export default function AiReceptionistPillarPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: 'Fieseros 24/7 AI Receptionist for Small Business & Contractors',
    description:
      'Autonomous 24/7 AI phone receptionist and virtual answering agent for small businesses, contractors, and field service companies. Answers calls on the first ring, qualifies leads, and books jobs.',
    url: 'https://fieseros.com/ai-receptionist',
    applicationCategory: 'BusinessApplication',
    offers: { price: '0', priceCurrency: 'USD' },
  });

  const faqSchema = getFaqSchema(faqs);

  return (
    <AiMarketingLayout activePath="/ai-receptionist">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero Section */}
      <CornerstoneHero
        eyebrow="24/7 Virtual Phone Answering for Small Business"
        title="Never Miss Another High-Value Job. Your 24/7 AI Phone Receptionist."
        subtitle="Over 62% of calls to small service businesses go to voicemail — and 85% of those callers call a competitor instead. Fieseros AI Receptionist answers on the 1st ring, qualifies callers, quotes prices, and books appointments straight into your schedule."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/20"
          >
            <span>Start Free Trial — No Credit Card</span>
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm px-6 py-3.5 text-base font-semibold text-slate-800 dark:text-slate-100 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            View Transparent Pricing
          </Link>
        </div>
      </CornerstoneHero>

      {/* Interactive Call Simulator Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="size-3.5" /> Interactive Demonstration
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Hear the AI Receptionist in Action
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Select a trade scenario below to test how our AI answers callers, gathers job details, quotes service fees, and handles emergency dispatch.
          </p>
        </div>

        <CallSimulator />
      </section>

      {/* ROI & Cost of Missed Calls */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900/60 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-4xl font-extrabold text-rose-500">62%</p>
              <h3 className="mt-2 font-bold text-slate-900 dark:text-white text-base">Calls Go Unanswered</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Small business owners miss calls while driving, on ladders, or meeting clients. Callers rarely leave voicemails.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-4xl font-extrabold text-amber-500">$650</p>
              <h3 className="mt-2 font-bold text-slate-900 dark:text-white text-base">Average Lost Ticket</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Just 2 missed calls per day can mean $25,000+ in lost monthly revenue handed straight to local competitors.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <p className="text-4xl font-extrabold text-emerald-500">100%</p>
              <h3 className="mt-2 font-bold text-slate-900 dark:text-white text-base">Answered on 1st Ring</h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Fieseros answers immediately, books the job, logs the notes in your CRM, and confirms appointment details.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Grid */}
      <ContentSection
        eyebrow="Built for Service Businesses"
        title="Everything Your Front Desk Needs — Automated 24/7"
        subtitle="Designed specifically for field service companies, contractors, and trades where responsiveness makes or breaks your close rate."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card
                key={idx}
                className="bg-white/70 dark:bg-slate-800/50 backdrop-blur-xs border-slate-200 dark:border-slate-700/60 hover:border-emerald-500/50 transition-all shadow-xs"
              >
                <CardHeader>
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </ContentSection>

      {/* Trade Verticals Section */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
            Trade-Specific AI Knowledge
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Pre-Trained on Real Contractor Workflows
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Fieseros understands the exact vocabulary, equipment, urgency levels, and scheduling requirements of your trade.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tradePillars.map((trade, idx) => {
            const Icon = trade.icon;
            return (
              <Link
                key={idx}
                href={trade.link}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                    {trade.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {trade.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <span>Explore {trade.title.split(' ')[0]} Software</span>
                  <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Comparison: AI Receptionist vs Human Call Center */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Fieseros AI vs. Traditional Answering Services
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Why thousands of service businesses are replacing legacy call centers with autonomous voice AI.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-900 dark:text-white font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4">Feature / Capability</th>
                  <th className="p-4 text-emerald-600 dark:text-emerald-400">Fieseros 24/7 AI Receptionist</th>
                  <th className="p-4 text-slate-500">Legacy Answering Services</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <td className="p-4 font-semibold">Answer Speed</td>
                  <td className="p-4 text-emerald-600 font-bold">First ring (&lt; 1 sec)</td>
                  <td className="p-4 text-slate-500">3–6 rings (frequent hold queues)</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Direct Calendar Booking</td>
                  <td className="p-4 text-emerald-600 font-bold">Yes, locks confirmed appointment live</td>
                  <td className="p-4 text-slate-500">No, only writes manual notes</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Pricing & Estimate Quotes</td>
                  <td className="p-4 text-emerald-600 font-bold">Yes, follows your custom rules</td>
                  <td className="p-4 text-slate-500">Rarely, cannot explain scope</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Emergency Warm Transfers</td>
                  <td className="p-4 text-emerald-600 font-bold">Instant keyword-triggered triage</td>
                  <td className="p-4 text-slate-500">Manual phone trees</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">CRM Integration</td>
                  <td className="p-4 text-emerald-600 font-bold">Instant sync with audio recording & transcript</td>
                  <td className="p-4 text-slate-500">Clunky email or third-party Zapier sync</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Monthly Cost</td>
                  <td className="p-4 text-emerald-600 font-bold">Flat software tier (0% fees)</td>
                  <td className="p-4 text-slate-500">$300–$1,200/mo ($1.75–$3.50/min)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Frequently Asked Questions
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Common questions about deploying an AI phone agent for your service business.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {faqs.map((faq, idx) => (
            <AccordionItem
              key={idx}
              value={`faq-${idx}`}
              className="border border-slate-200 dark:border-slate-800 rounded-xl px-4 bg-white dark:bg-slate-900"
            >
              <AccordionTrigger className="text-sm font-semibold text-slate-900 dark:text-white hover:no-underline text-left">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final Call to Action */}
      <CtaSection
        title="Ready to Never Miss Another Service Call?"
        subtitle="Join hundreds of service businesses and trade contractors growing revenue with Fieseros 24/7 AI Phone Receptionist. Setup takes less than 10 minutes."
        primaryCta="Start Free 14-Day Trial"
        primaryHref="/#signup"
        secondaryCta="View All Platform Features"
        secondaryHref="/features"
      />
    </AiMarketingLayout>
  );
}
