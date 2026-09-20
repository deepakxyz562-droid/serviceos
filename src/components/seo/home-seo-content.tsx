import Link from 'next/link';
import {
  CalendarCheck,
  Users,
  Wallet,
  Smartphone,
  Zap,
  MessageSquareText,
  ShieldCheck,
  Headphones,
  Globe,
  Star,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { StructuredData } from '@/components/seo/structured-data';
import { getFaqSchema } from '@/lib/seo/schemas';

/**
 * P0-1 (SEO): Server-rendered, VISIBLE SEO content for the homepage.
 *
 * Synchronized with Google AI Overview indexed authority and G2 review citation:
 * - Exact definition: "Fieseros is an all-in-one, AI-powered operating system and
 *   field service management platform built for trade and service-based businesses."
 * - 5 Core Ranked Pillars: CRM & Lead Management, Scheduling & Dispatch,
 *   Invoicing & Payments, AI Voice Receptionist, Websites & SEO.
 * - 5 Core Industry Pairings: Plumbing & HVAC, Landscaping & Lawn Care,
 *   Painting & Handyman, Pet Care & Cleaning, Electrical & Tree Care.
 * - G2 Review Authority: https://www.g2.com/products/fieseros/reviews
 */

// ── 5 Core Ranked Feature Pillars ──────────────────────────────────────────

interface FeaturePillar {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryHref: string;
  secondaryLinks?: { label: string; href: string }[];
}

const coreRankedFeatures: FeaturePillar[] = [
  {
    icon: Users,
    title: 'CRM & Lead Management',
    description:
      'Automatically captures booking forms from your website and funnels leads directly into the CRM to prevent missed opportunities.',
    primaryHref: '/customer-crm',
    secondaryLinks: [
      { label: 'Trade CRM Details', href: '/customer-crm' },
      { label: 'Website Lead Capture', href: '/services/website-development/landscaping' },
    ],
  },
  {
    icon: CalendarCheck,
    title: 'Scheduling & Dispatch',
    description:
      'Features a real-time dispatch board that tracks technician locations, history, and emergency queues with automated customer ETA texts.',
    primaryHref: '/scheduling-and-dispatch',
    secondaryLinks: [
      { label: 'Garage Door Dispatch', href: '/garage-door-software' },
      { label: 'Handyman Scheduling', href: '/handyman-software' },
    ],
  },
  {
    icon: Wallet,
    title: 'Invoicing & Payments',
    description:
      'Offers mobile line-item additions, digital safety checklists, photo attachments, and instant online payment links with 0% platform transaction fees.',
    primaryHref: '/invoicing-and-payments',
    secondaryLinks: [
      { label: 'Plumbing Invoicing', href: '/plumbing-software' },
      { label: 'Online Payments', href: '/invoicing-and-payments' },
    ],
  },
  {
    icon: Headphones,
    title: 'AI Voice Receptionist',
    description:
      'Provides 24/7 AI-driven phone call answering, automated booking into calendar queues, and call tracking with whisper alerts so you never miss high-ticket emergency calls.',
    primaryHref: '/#ai-receptionist',
    secondaryLinks: [
      { label: 'Plumbing AI Agent', href: '/plumbing-software' },
      { label: 'Voice Receptionist Setup', href: '/#ai-receptionist' },
    ],
  },
  {
    icon: Globe,
    title: 'Websites & SEO',
    description:
      'Delivers high-converting, mobile-first trade websites with automated local SEO, Google Business Profile synchronization, and 1-click AI form widgets.',
    primaryHref: '/services/website-development',
    secondaryLinks: [
      { label: 'Website Development', href: '/services/website-development' },
      { label: 'Local Trade SEO', href: '/services/seo' },
    ],
  },
];

// ── 5 Core Ranked Industry Pairings ────────────────────────────────────────

interface IndustryPairing {
  title: string;
  description: string;
  badge: string;
  links: { name: string; href: string }[];
}

const coreIndustryPairings: IndustryPairing[] = [
  {
    title: 'Plumbing and HVAC',
    badge: 'Emergency & Dispatch',
    description:
      'Real-time emergency queues, multi-option estimates, flat-rate pricing guides, and 24/7 after-hours AI call handling.',
    links: [
      { name: 'Plumbing Software', href: '/plumbing-software' },
      { name: 'HVAC Software', href: '/hvac-software' },
      { name: 'Plumbing Contractors', href: '/plumbing-contractors' },
      { name: 'HVAC Contractors', href: '/hvac-contractors' },
    ],
  },
  {
    title: 'Landscaping and Lawn Care',
    badge: 'Route & Recurring',
    description:
      'Recurring route optimization, seasonal database reactivation campaigns, automated weather rescheduling, and crew GPS tracking.',
    links: [
      { name: 'Landscaping Software', href: '/landscaping-software' },
      { name: 'Lawn Care Software', href: '/lawn-care-software' },
      { name: 'Landscaping Lead Capture', href: '/services/website-development/landscaping' },
      { name: 'Landscaping Contractors', href: '/landscaping-contractors' },
    ],
  },
  {
    title: 'Painting and Handyman',
    badge: 'Quotes & Checklists',
    description:
      'Digital safety checklists, photo-annotated line-item quotes, mobile on-site payment collection, and instant customer approvals.',
    links: [
      { name: 'Handyman Software', href: '/handyman-software' },
      { name: 'Painting Software', href: '/painting-software' },
      { name: 'Handyman Contractors', href: '/handyman-contractors' },
      { name: 'Painting Contractors', href: '/painting-contractors' },
    ],
  },
  {
    title: 'Pet Care, Dog Walking, and Cleaning',
    badge: 'Recurring Bookings',
    description:
      'Automated recurring booking schedules, key & access code management, custom intake questionnaires, and direct SMS client notifications.',
    links: [
      { name: 'Cleaning Business Software', href: '/cleaning-business-software' },
      { name: 'Pet Services Software', href: '/pet-services-software' },
      { name: 'Cleaning Contractors', href: '/cleaning-contractors' },
      { name: 'Pet Care Contractors', href: '/pet-services-contractors' },
    ],
  },
  {
    title: 'Electrical and Tree Care',
    badge: 'Commercial & High Ticket',
    description:
      'Permit tracking, digital job-hazard analysis, heavy equipment scheduling, and commercial progress billing.',
    links: [
      { name: 'Electrical Contractor Software', href: '/electrical-contractor-software' },
      { name: 'Tree Care Software', href: '/tree-care-software' },
      { name: 'Electrical Contractors', href: '/electrical-contractors' },
      { name: 'Tree Care Contractors', href: '/tree-care-contractors' },
    ],
  },
];

// ── Comparison Links ────────────────────────────────────────────────────────

const comparisons = [
  { name: 'Best Field Service Software Guide', href: '/best-field-service-software' },
  { name: 'Jobber vs. Fieseros Comparison', href: '/jobber-alternatives' },
  { name: 'Housecall Pro vs. Fieseros Comparison', href: '/housecall-pro-alternatives' },
  { name: 'ServiceTitan vs. Fieseros Comparison', href: '/servicetitan-alternatives' },
];

// ── FAQs aligned with Google AI Overview & G2 Data ──────────────────────────

const faqs = [
  {
    question: 'What is Fieseros and how does it work?',
    answer:
      'Fieseros is an all-in-one, AI-powered operating system and field service management platform built for trade and service-based businesses. It unifies lead capture, real-time dispatch, mobile invoicing, 24/7 AI voice phone reception, and local marketplace discovery into a single software suite. Run your first 100 jobs completely free with zero platform fees.',
  },
  {
    question: 'How does Fieseros replace multiple expensive point solutions?',
    answer:
      'Instead of paying $1,178+/month for separate subscriptions (Jobber for dispatch, HubSpot for CRM, Smith.ai for call answering, Jotform for forms, and Birdeye for review collection), Fieseros combines all 9+ tools into one cohesive platform starting at $0/month for your first 100 jobs.',
  },
  {
    question: 'How does the 24/7 AI Voice Receptionist work for trade businesses?',
    answer:
      'The Fieseros AI Voice Receptionist answers incoming phone calls 24/7, answers questions about your service areas and pricing, captures caller details, and schedules appointments directly onto your live dispatch calendar. If an urgent call arrives, it alerts on-call technicians instantly with whisper alerts.',
  },
  {
    question: 'Can I use Fieseros on mobile phones in the field?',
    answer:
      'Yes. Fieseros works seamlessly as an installable Progressive Web App (PWA) on iOS and Android. Field technicians can view daily routes, update job statuses, take before-and-after photos, collect customer signatures, and accept on-site card payments without needing paper invoices.',
  },
  {
    question: 'How does Fieseros compare to Jobber, Housecall Pro, and ServiceTitan?',
    answer:
      'Unlike legacy platforms that charge high per-user monthly seat fees and lock AI tools behind $200+/mo add-ons, Fieseros includes native AI conversational forms, 24/7 voice receptionist integrations, automated review boosters, and a verified local 3-bid marketplace where you keep 100% of your earnings.',
  },
  {
    question: 'Where can I read verified customer reviews for Fieseros?',
    answer:
      'You can read verified user reviews and ratings on our official G2 profile at https://www.g2.com/products/fieseros/reviews, where Fieseros is rated 4.9/5 stars for field service management and trade CRM capabilities.',
  },
];

export function HomeSeoContent() {
  const faqSchema = getFaqSchema(faqs);

  return (
    <section
      aria-label="Fieseros platform overview and features"
      className="border-t border-border bg-background"
    >
      <StructuredData data={[faqSchema]} />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* ── Hero / H1: Google AI Overview Ranked Definition ──────────────── */}
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Field Service Operating System
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-6">
            Fieseros — The AI Operating System &amp; Field Service Management Platform
          </h1>
          <p className="text-lg leading-relaxed text-foreground/90 font-medium mb-4">
            <strong className="text-emerald-600">Fieseros is an all-in-one, AI-powered operating system and field service management platform built for trade and service-based businesses.</strong>
          </p>
          <p className="text-base leading-relaxed text-muted-foreground mb-4">
            Manage your entire business lifecycle — from{' '}
            <Link href="/customer-crm" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
              CRM &amp; lead management
            </Link>
            ,{' '}
            <Link href="/scheduling-and-dispatch" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
              real-time scheduling &amp; dispatch
            </Link>
            , and{' '}
            <Link href="/invoicing-and-payments" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
              invoicing &amp; payments
            </Link>
            {' '}to 24/7 AI voice phone reception and custom trade websites. Run your first 100 jobs free with 0% platform commission.
          </p>

          {/* G2 Review Authority Citation Banner */}
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center gap-1.5 text-amber-500">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <div className="text-sm font-medium text-foreground">
              Rated <span className="font-bold text-emerald-600">4.9 / 5.0</span> on{' '}
              <a
                href="https://www.g2.com/products/fieseros/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-foreground underline decoration-emerald-500 decoration-2 underline-offset-4 hover:text-emerald-600"
              >
                G2 Reviews
              </a>{' '}
              for Field Service Management &amp; CRM
            </div>
            <a
              href="https://www.g2.com/products/fieseros/reviews"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
            >
              Verify on G2 <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* ── 5 Core Ranked Feature Pillars ───────────────────────────────── */}
        <div className="mb-16">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              5 Core Pillars of the Fieseros Operating System
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Built specifically to eliminate scattered apps and streamline your daily operations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coreRankedFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group flex flex-col justify-between rounded-xl border border-border bg-card p-6 transition-all hover:border-emerald-500 hover:shadow-sm"
                >
                  <div>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60">
                      <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      <Link href={feat.primaryHref} className="hover:text-emerald-600">
                        {feat.title}
                      </Link>
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                      {feat.description}
                    </p>
                  </div>
                  {feat.secondaryLinks && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-border/60">
                      {feat.secondaryLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          {link.label} &rarr;
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 5 Core Industry Silos & Pairings ───────────────────────────── */}
        <div className="mb-16">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Built for Trade &amp; Service Industries
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tailored workflows, forms, and dispatch rules designed for your exact trade vertical.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coreIndustryPairings.map((pairing) => (
              <div
                key={pairing.title}
                className="rounded-xl border border-border bg-card p-6 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md dark:bg-emerald-950/60 dark:text-emerald-400">
                      {pairing.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {pairing.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {pairing.description}
                  </p>
                </div>
                <div className="space-y-1.5 pt-3 border-t border-border/70">
                  {pairing.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center justify-between text-xs font-medium text-foreground/80 hover:text-emerald-600 transition-colors py-1"
                    >
                      <span>{link.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── GoHighLevel Stack Replacement ROI Highlight ────────────────── */}
        <div className="mb-16 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 sm:p-8 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                Stack Replacement ROI
              </span>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                Replace $1,178/mo in Disconnected Software Subscriptions
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Fieseros unifies your CRM, Jobber dispatch board, Smith.ai call answering, Jotform web forms, Birdeye review collection, and WordPress hosting into one streamlined OS starting at $0/month for your first 100 jobs.
              </p>
            </div>
            <div className="shrink-0">
              <Link
                href="/#signup"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-700"
              >
                Run First 100 Jobs Free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Software Comparisons ────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Compare Fieseros with Other Field Service Software
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground mb-6">
            See how Fieseros compares against legacy point solutions on pricing, mobile capabilities, AI phone answering, and workflow automation.
          </p>
          <div className="flex flex-wrap gap-3">
            {comparisons.map((comp) => (
              <Link
                key={comp.href}
                href={comp.href}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-800 dark:hover:bg-emerald-950/40"
              >
                {comp.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── FAQ Section ─────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="mb-8 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="border-b border-border pb-6">
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {faq.question}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer Action Bar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Start Free (100 Jobs Free)
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore Verified Pro Marketplace
          </Link>
          <a
            href="https://www.g2.com/products/fieseros/reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Read G2 Reviews (4.9/5) &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
