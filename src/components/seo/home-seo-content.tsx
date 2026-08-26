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
  Wrench,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { StructuredData } from '@/components/seo/structured-data';
import { getFaqSchema } from '@/lib/seo/schemas';

/**
 * P0-1 (SEO): Server-rendered, VISIBLE SEO content for the homepage.
 *
 * This is the single most important SEO asset on the site. The interactive
 * DualAudienceLanding loads with `ssr: false` (it's a 2,290-line component
 * too heavy for Turbopack to SSR), which means its content is NOT in the
 * initial HTML Googlebot receives. This component fills that gap.
 *
 * WHAT CHANGED (SEO overhaul):
 *   Previously this was `sr-only` (visually hidden) with ~460 words. Google
 *   saw a thin page → rankings stuck at position 50-80. Now it's VISIBLE,
 *   positioned below the interactive landing, with ~1,500 words of rich HTML
 *   content and 25+ internal links to key pages.
 *
 * WHY IT'S VISIBLE NOW:
 *   The component is positioned in page.tsx AFTER <HomePageClient/>, so users
 *   see the visual interactive landing first, then this rich text section
 *   below (like a "Learn More" section). This is NOT duplicate content — the
 *   interactive landing is hero/cards/images, while this is text-heavy with
 *   internal links. They complement each other.
 *
 * INTERNAL LINKING:
 *   Every key page is linked from here — 5 feature pages, 8 industry pages,
 *   4 comparison pages, /features hub, /industries hub, /marketplace, /blog,
 *   /invoice-generator. This gives Google clear sitelink candidates and
 *   strong topical context about what Fieseros is.
 *
 * FAQ SCHEMA:
 *   The FAQ section includes matching FAQPage JSON-LD schema for rich result
 *   eligibility in Google search.
 */

// ── Feature data ────────────────────────────────────────────────────────────

interface FeatureLink {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}

const features: FeatureLink[] = [
  {
    icon: CalendarCheck,
    title: 'Scheduling & Dispatch',
    description:
      'Drag-and-drop calendar, live technician tracking on a map, and automated ETA notifications sent to customers via SMS and Email. Optimize routes and reduce drive time between jobs.',
    href: '/scheduling-and-dispatch',
  },
  {
    icon: Users,
    title: 'Customer CRM',
    description:
      'A complete CRM built for service businesses. Track every customer interaction, job history, communication log, and payment record in one searchable database.',
    href: '/customer-crm',
  },
  {
    icon: Wallet,
    title: 'Invoicing & Payments',
    description:
      'Send professional invoices by Email and SMS. Accept card payments, bank transfers, and digital wallets. Get paid 2x faster with automatic payment reminders.',
    href: '/invoicing-and-payments',
  },
  {
    icon: Smartphone,
    title: 'Technician App',
    description:
      'A dedicated mobile app for field technicians. View daily routes, update job status, capture photos and signatures, and collect payments on-site — all from their phone.',
    href: '/technician-app',
  },
  {
    icon: Zap,
    title: 'Workflow Automations',
    description:
      'Build no-code automations that trigger SMS reminders, status updates, follow-up emails, and review requests. Save hours of manual work every week.',
    href: '/automations',
  },
  {
    icon: Headphones,
    title: 'AI Receptionist',
    description:
      'A 24/7 AI voice agent that answers calls, books appointments, captures leads, and routes urgent requests — even after hours. Never miss a customer call again.',
    href: '/field-service-software',
  },
];

// ── Industry data ───────────────────────────────────────────────────────────

interface IndustryLink {
  name: string;
  href: string;
}

const industries: IndustryLink[] = [
  { name: 'HVAC Software', href: '/hvac-software' },
  { name: 'Plumbing Software', href: '/plumbing-software' },
  { name: 'Electrical Contractor Software', href: '/electrical-contractor-software' },
  { name: 'Cleaning Business Software', href: '/cleaning-business-software' },
  { name: 'Landscaping Software', href: '/landscaping-software' },
  { name: 'Pest Control Software', href: '/pest-control-software' },
  { name: 'Roofing Software', href: '/roofing-software' },
  { name: 'Solar Software', href: '/solar-software' },
];

// ── Comparison data ─────────────────────────────────────────────────────────

const comparisons: IndustryLink[] = [
  { name: 'Best Field Service Software', href: '/best-field-service-software' },
  { name: 'Jobber Alternative', href: '/jobber-alternatives' },
  { name: 'Housecall Pro Alternative', href: '/housecall-pro-alternatives' },
  { name: 'ServiceTitan Alternative', href: '/servicetitan-alternatives' },
];

// ── FAQ data ────────────────────────────────────────────────────────────────

const faqs = [
  {
    question: 'What is Fieseros and who is it for?',
    answer:
      'Fieseros is the all-in-one operating system for service businesses — plumbers, HVAC technicians, electricians, cleaners, landscapers, and more. It replaces scattered texts, emails, and spreadsheets with one platform for leads, dispatch, invoicing, and automated Email, SMS & Push notifications. Built for field service teams of 1 to 50+ technicians.',
  },
  {
    question: 'How much does Fieseros cost?',
    answer:
      'Fieseros offers a free plan for small teams, with paid plans starting at affordable monthly rates. You can start a free trial with no credit card required. Pricing scales based on the number of technicians and advanced features like AI Receptionist and workflow automations. Visit the pricing section on the homepage or sign up to see current plans.',
  },
  {
    question: 'Does Fieseros work on mobile?',
    answer:
      'Yes. Fieseros is a Progressive Web App (PWA) that works on any device — desktop, tablet, and mobile. Technicians can use the dedicated employee portal on their phone to see their daily route, update job status, capture photos, collect signatures, and process payments on-site.',
  },
  {
    question: 'Can I use Fieseros for my specific service industry?',
    answer:
      'Fieseros supports 25+ service industries including plumbing, HVAC, electrical, cleaning, landscaping, pest control, roofing, painting, handyman, tree care, snow removal, pool service, solar, pet services, and more. Each industry gets tailored features, workflows, and industry-specific terminology. Explore our industry pages to see how Fieseros adapts to your trade.',
  },
  {
    question: 'Does Fieseros integrate with my existing tools?',
    answer:
      'Fieseros includes a built-in CRM, invoicing, and communication tools. It supports Email, SMS, and Push notifications natively. You can export invoices and reports as CSV for accounting tools like QuickBooks and Xero. A WordPress plugin is available for lead capture forms, and a REST API is available for custom integrations.',
  },
  {
    question: 'How does the Fieseros marketplace work?',
    answer:
      'The Fieseros marketplace lists verified service providers across 25 industries. Businesses opt in, get verified (identity, business, insurance), and receive public Business Hub pages with reviews, services, and booking. Customers can browse by industry and city, compare providers, and book instantly or request quotes.',
  },
  {
    question: 'Is my data secure with Fieseros?',
    answer:
      'Yes. Fieseros uses bank-grade encryption (TLS 1.3) for all data in transit and at rest. Authentication is handled via secure HTTP-only cookies with JWT tokens. We are GDPR compliant and offer a cookie consent banner. Your customer data is never sold or shared with third parties. You can export or delete your data at any time.',
  },
  {
    question: 'Can I migrate from Jobber, Housecall Pro, or ServiceTitan?',
    answer:
      'Yes. Fieseros includes import tools for contacts, jobs, and invoices from popular field service platforms. See our comparison pages for Jobber alternatives, Housecall Pro alternatives, and ServiceTitan alternatives to understand how Fieseros compares on features and pricing. Our support team can assist with migration at no cost.',
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export function HomeSeoContent() {
  const faqSchema = getFaqSchema(faqs);

  return (
    <section
      aria-label="Fieseros platform overview and features"
      className="border-t border-border bg-background"
    >
      <StructuredData data={[faqSchema]} />

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        {/* ── Hero / H1 ─────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl mb-6">
            Build it. Grow it. Run it. — The Operating System for Service Businesses
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground mb-4">
            Fieseros is the only platform that does all three.{' '}
            <strong className="text-foreground">Build</strong> a website that
            generates leads. <strong className="text-foreground">Grow</strong> with
            SEO, Google Ads, and local marketing.{' '}
            <strong className="text-foreground">Run</strong> your entire business —{' '}
            <Link href="/scheduling-and-dispatch" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
              scheduling and dispatch
            </Link>
            ,{' '}
            <Link href="/invoicing-and-payments" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
              invoicing
            </Link>
            , CRM, and AI automation — from one dashboard. Built for plumbers,
            HVAC, electricians, cleaners, landscapers, and 20+ other service
            industries.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Whether you run a one-person operation or manage a team of 50+
            technicians, Fieseros adapts to your workflow. From the first customer
            call to the final payment, every step is tracked, automated, and
            optimized — so you can focus on the work, not the paperwork.
          </p>
        </div>

        {/* ── Build / Grow / Run positioning section ────────────────────── */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-8">
            One Partner. Three Ways to Grow.
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Build */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Build</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Get a website that actually generates leads — mobile-first, SEO-ready,
                with booking and quote forms built in.
              </p>
              <Link href="/services/website-development" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                Website Development →
              </Link>
            </div>
            {/* Grow */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
                <svg className="h-5 w-5 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Grow</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Turn traffic into customers with local SEO, Google Ads, Google
                Business Profile optimization, and lead generation.
              </p>
              <Link href="/services/seo" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                SEO &amp; Marketing →
              </Link>
            </div>
            {/* Run */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <svg className="h-5 w-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Run</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Manage everything from Fieseros CRM — leads, jobs, scheduling,
                dispatch, invoices, payments, WhatsApp, and AI Receptionist.
              </p>
              <Link href="/features" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                Explore the CRM →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Platform Features ─────────────────────────────────────────── */}
        <div className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Everything Your Service Business Needs in One Platform
            </h2>
          </div>
          <p className="text-base leading-relaxed text-muted-foreground mb-8">
            Fieseros brings together the tools every field service business needs —
            from scheduling and dispatch to invoicing, CRM, and AI-powered
            automation. No more juggling five different apps.{' '}
            <Link href="/features" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
              Explore all features →
            </Link>
          </p>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Link
                  key={feature.title}
                  href={feature.href}
                  className="group block rounded-xl border border-border bg-card p-6 transition-colors hover:border-emerald-600 hover:bg-emerald-50/50"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                    <Icon className="h-5 w-5 text-emerald-700" aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 font-semibold text-foreground group-hover:text-emerald-800">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Industries ────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Built for Your Industry
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground mb-8">
            Fieseros adapts to the specific needs of each service industry. From
            HVAC maintenance agreements to landscaping route optimization, each
            industry page details the features and workflows tailored to your
            trade.{' '}
            <Link href="/industries" className="font-medium text-emerald-700 underline-offset-4 hover:underline">
              View all industries →
            </Link>
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {industries.map((industry) => (
              <Link
                key={industry.href}
                href={industry.href}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-800"
              >
                <Wrench className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span className="truncate">{industry.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Compare Fieseros ──────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Compare Fieseros with Other Field Service Software
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground mb-6">
            See how Fieseros compares to popular field service platforms on
            features, pricing, and ease of use. Our comparison pages include
            detailed methodology, pros and cons, and transparent scoring.
          </p>
          <div className="flex flex-wrap gap-3">
            {comparisons.map((comparison) => (
              <Link
                key={comparison.href}
                href={comparison.href}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-800"
              >
                {comparison.name}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>

        {/* ── Resources ─────────────────────────────────────────────────── */}
        <div className="mb-16">
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Resources & Free Tools
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground mb-6">
            Learn how to grow your service business with our guides, or try our
            free tools — no signup required.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Link
              href="/blog"
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-colors hover:border-emerald-600 hover:bg-emerald-50/50"
            >
              <MessageSquareText className="mt-1 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <h3 className="mb-1 font-semibold text-foreground group-hover:text-emerald-800">
                  Field Service Blog
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Guides on scheduling, invoicing, CRM, automation, and growing
                  your service business. Practical advice from industry experts.
                </p>
              </div>
            </Link>
            <Link
              href="/invoice-generator"
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-6 transition-colors hover:border-emerald-600 hover:bg-emerald-50/50"
            >
              <Wallet className="mt-1 h-6 w-6 shrink-0 text-emerald-600" aria-hidden="true" />
              <div>
                <h3 className="mb-1 font-semibold text-foreground group-hover:text-emerald-800">
                  Free Invoice Generator
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Create and download professional invoices in seconds. No signup,
                  no watermark, no limits. PDF and email delivery included.
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* ── FAQ ───────────────────────────────────────────────────────── */}
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

        {/* ── CTAs ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-4">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Start Free Trial
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Browse Marketplace
          </Link>
          <Link
            href="/best-field-service-software"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Compare Software
          </Link>
        </div>
      </div>
    </section>
  );
}
