import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Phone,
  MessageSquare,
  Users,
  Calendar,
  CreditCard,
  Zap,
  ShieldCheck,
  Globe,
  Sliders,
  Play,
  Layers,
  Star,
  ChevronRight,
  TrendingUp,
  FileText,
  Clock,
  Workflow,
} from 'lucide-react';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'AI Business Agent — Autonomous CRM, Smart Forms & Job Dispatch | Fieseros',
  description:
    'The all-in-one AI Business Agent that talks to website visitors, answers phone calls 24/7, captures smart forms, populates CRM, and dispatches jobs automatically.',
  alternates: { canonical: '/ai-business-agent' },
  openGraph: {
    title: 'Fieseros AI Business Agent — Autonomous CRM, Forms & Field Dispatch',
    description:
      'Deploy 24/7 multimodal AI agents that converse, fill smart forms, update customer CRM timelines, schedule appointments, and dispatch field technicians.',
    type: 'website',
  },
};

export default function AiBusinessAgentPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Fieseros AI Business Agent',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      'Autonomous multimodal AI agent platform combining 24/7 phone and chat reception, intelligent form capture, CRM automation, and instant field service dispatch.',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1240',
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the Fieseros AI Business Agent?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Fieseros AI Business Agent is an autonomous 24/7 assistant that handles customer inquiries across 11 channels (web chat, phone calls, WhatsApp, SMS, Instagram), extracts structured form data, updates your CRM with zero manual data entry, and schedules service jobs.',
        },
      },
      {
        '@type': 'Question',
        name: 'How does it compare to Jotform, Typeform, and HubSpot?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Unlike traditional standalone form builders (Jotform/Typeform) or heavy CRMs (HubSpot), Fieseros unifies visual smart forms, multimodal conversational AI agents, and complete job dispatch CRM in one seamless platform at a fraction of the cost.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I connect existing form templates to the AI Agent?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! You can choose from over 20,000+ pre-built industry templates and turn any static form into an interactive voice/chat AI agent with a single click.',
        },
      },
    ],
  };

  return (
    <AiMarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-border bg-gradient-to-b from-emerald-500/5 via-background to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles className="size-3.5" />
              Autonomous Front-Office AI Engine
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              The AI Business Agent That{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Talks, Captures, &amp; Dispatches
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Replace fragmented tools. Deploy intelligent AI agents that greet visitors 24/7, answer phone calls, extract verified form data, update your CRM, and book appointments automatically.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg shadow-emerald-600/25" asChild>
                <Link href="/forms/new">
                  Build Your AI Agent Free <ArrowRight className="size-4 ml-2" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 font-semibold text-base" asChild>
                <Link href="/templates">
                  Explore 20,000+ Free Templates
                </Link>
              </Button>
            </div>

            {/* Social Proof Stats */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-border/60 text-center">
              <div>
                <p className="text-3xl font-black text-foreground">24/7</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">Zero Missed Leads</p>
              </div>
              <div>
                <p className="text-3xl font-black text-emerald-600">3.8x</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">Higher Form Conversion</p>
              </div>
              <div>
                <p className="text-3xl font-black text-foreground">20,000+</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">Pre-Built Form Schemas</p>
              </div>
              <div>
                <p className="text-3xl font-black text-teal-600">0 min</p>
                <p className="text-xs text-muted-foreground font-medium mt-1">Manual CRM Data Entry</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Loop Walkthrough: The 4-Step Autonomous Workflow */}
      <section className="py-20 bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 mb-3">
              End-to-End Automation
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              How the AI Business Agent Works
            </h2>
            <p className="mt-3 text-muted-foreground text-base">
              From first website touch or phone call to paid invoice — fully synchronized without manual busywork.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="bg-background rounded-2xl p-6 border border-border/80 shadow-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <h3 className="text-lg font-bold text-foreground">Omnichannel Greeting</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Engages customers instantly via web chat, SMS, WhatsApp, or conversational 24/7 AI phone answering.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-[11px] font-semibold text-emerald-600 flex items-center gap-1.5">
                <Phone className="size-3.5" /> 11 Multi-Channel Integrations
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-background rounded-2xl p-6 border border-border/80 shadow-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <h3 className="text-lg font-bold text-foreground">Intelligent Form Capture</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Extracts symptoms, equipment model, address, and uploaded photos directly from conversational speech into structured fields.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-[11px] font-semibold text-teal-600 flex items-center gap-1.5">
                <FileText className="size-3.5" /> 200+ Smart Field Widgets
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-background rounded-2xl p-6 border border-border/80 shadow-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="size-10 rounded-xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <h3 className="text-lg font-bold text-foreground">Zero-Entry CRM Sync</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically builds the customer record, timeline notes, urgency score, and tags directly in your CRM.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-[11px] font-semibold text-cyan-600 flex items-center gap-1.5">
                <Users className="size-3.5" /> Real-Time Customer Timeline
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-background rounded-2xl p-6 border border-border/80 shadow-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                  04
                </div>
                <h3 className="text-lg font-bold text-foreground">Dispatch &amp; Payment</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Locks calendar time slot, assigns available technicians, generates quotes, and accepts 0%-fee payments.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border text-[11px] font-semibold text-purple-600 flex items-center gap-1.5">
                <CreditCard className="size-3.5" /> 33 Payment Gateways
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Matrix: Fieseros vs Legacy Software */}
      <section className="py-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Why Forward-Thinking Businesses Choose Fieseros
            </h2>
            <p className="mt-3 text-muted-foreground text-base">
              Stop stitching together 5 different subscriptions for forms, chatbots, CRMs, and dispatch tools.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-background rounded-2xl border border-border shadow-sm text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 font-bold text-foreground">Core Capability</th>
                  <th className="p-4 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">
                    Fieseros AI Engine
                  </th>
                  <th className="p-4 font-semibold text-muted-foreground">Jotform / Typeform</th>
                  <th className="p-4 font-semibold text-muted-foreground">HubSpot CRM</th>
                  <th className="p-4 font-semibold text-muted-foreground">GoHighLevel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-4 font-medium text-foreground">24/7 AI Phone &amp; Chat Receptionist</td>
                  <td className="p-4 font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10">✅ Included Native</td>
                  <td className="p-4 text-muted-foreground">❌ Forms only</td>
                  <td className="p-4 text-muted-foreground">❌ Expensive Add-on</td>
                  <td className="p-4 text-muted-foreground">⚠️ Third-party Bot</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Elementor-Style Visual Form Builder</td>
                  <td className="p-4 font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10">✅ 200+ Smart Widgets</td>
                  <td className="p-4 text-foreground">✅ Good Form Studio</td>
                  <td className="p-4 text-muted-foreground">⚠️ Basic Fields</td>
                  <td className="p-4 text-muted-foreground">⚠️ Standard Forms</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Pre-Built Form Template Catalog</td>
                  <td className="p-4 font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10">✅ 20,000+ Free Schemas</td>
                  <td className="p-4 text-foreground">✅ 10,000+ Templates</td>
                  <td className="p-4 text-muted-foreground">❌ Minimal</td>
                  <td className="p-4 text-muted-foreground">❌ Community Only</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Integrated Field Service CRM &amp; Dispatch</td>
                  <td className="p-4 font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10">✅ Full Jobs &amp; Invoicing</td>
                  <td className="p-4 text-muted-foreground">❌ Requires Zapier</td>
                  <td className="p-4 text-muted-foreground">❌ No Field Tech App</td>
                  <td className="p-4 text-muted-foreground">⚠️ Limited Tech App</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Multimodal Realistic Avatars &amp; Voice</td>
                  <td className="p-4 font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10">✅ 36+ Avatars + Voice AI</td>
                  <td className="p-4 text-muted-foreground">❌ None</td>
                  <td className="p-4 text-muted-foreground">❌ None</td>
                  <td className="p-4 text-muted-foreground">❌ None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
            Launch Your 24/7 AI Business Agent Today
          </h2>
          <p className="text-emerald-100 text-base md:text-lg max-w-2xl mx-auto">
            Choose from 20,000+ form templates or let AI synthesize your custom workflow in 60 seconds.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 bg-white text-emerald-800 hover:bg-emerald-50 font-bold shadow-xl" asChild>
              <Link href="/forms/new">
                Start Building Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-white border-white/40 hover:bg-white/10 font-semibold" asChild>
              <Link href="/templates">
                Browse 20,000+ Templates
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
