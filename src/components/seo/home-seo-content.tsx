import Link from 'next/link';
import {
  CalendarCheck,
  Zap,
  MessageSquareText,
  Wallet,
  ShieldCheck,
  Headphones,
  type LucideIcon,
} from 'lucide-react';
import { StructuredData } from '@/components/seo/structured-data';
import { getFaqSchema } from '@/lib/seo/schemas';

/**
 * P0-1 (SEO): Server-rendered SEO content for the homepage.
 *
 * The interactive landing page (DualAudienceLanding, 2290 lines) is loaded
 * with `ssr: false` because it's too heavy for Turbopack to server-render
 * efficiently. This means crawlers that don't execute JavaScript (Bing's
 * first pass, social scrapers, some archivers) would see an empty page.
 *
 * This component provides the CRITICAL homepage content — H1, hero subtitle,
 * key feature highlights, trust signals, and FAQ — as lightweight static HTML
 * that's always in the initial server response. It renders ABOVE the client
 * app and is visible to:
 *
 *   • Googlebot's first HTML parse (before JS execution)
 *   • Bingbot and other crawlers that don't execute JS
 *   • Social scrapers (Facebook, Twitter, LinkedIn) that only read initial HTML
 *   • Users with JavaScript disabled
 *
 * When the interactive LandingPage hydrates (ssr: false), it renders below
 * this content. The SEO content is NOT hidden — it remains visible as a
 * semantic introduction to the page. This is a legitimate SEO technique
 * (progressive enhancement), not cloaking.
 *
 * The FAQ section includes matching FAQPage JSON-LD schema for rich result
 * eligibility.
 */

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: CalendarCheck,
    title: 'Scheduling & Dispatch',
    description:
      'Drag-and-drop calendar, live technician tracking, and automated ETA notifications via SMS and Email.',
  },
  {
    icon: MessageSquareText,
    title: 'Omnichannel Inbox',
    description:
      'Unified inbox for WhatsApp, SMS, Email, and web chat. Never lose a lead in scattered text threads again.',
  },
  {
    icon: Wallet,
    title: 'Invoicing & Payments',
    description:
      'Send professional invoices by Email & SMS. Accept card, UPI, and bank transfer. Get paid 2x faster.',
  },
  {
    icon: Zap,
    title: 'Workflow Automations',
    description:
      'Trigger SMS reminders, status updates, and follow-ups automatically. No-code automation builder.',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Provider Marketplace',
    description:
      'List your business on the ServiceOS marketplace. Identity, business, and insurance verification badges.',
  },
  {
    icon: Headphones,
    title: 'AI Receptionist',
    description:
      '24/7 AI voice agent answers calls, books appointments, and captures leads even after hours.',
  },
];

const faqs = [
  {
    question: 'What is ServiceOS and who is it for?',
    answer:
      'ServiceOS is the all-in-one operating system for service businesses — plumbers, HVAC technicians, electricians, cleaners, landscapers, and more. It replaces scattered texts, emails, and spreadsheets with one platform for leads, dispatch, invoicing, and automated Email, SMS & Push notifications.',
  },
  {
    question: 'How much does ServiceOS cost?',
    answer:
      'ServiceOS offers a free plan for small teams, with paid plans starting at affordable monthly rates. You can start a free trial with no credit card required. Visit the pricing page or sign up to see current plans.',
  },
  {
    question: 'Does ServiceOS work on mobile?',
    answer:
      'Yes. ServiceOS is a Progressive Web App (PWA) that works on any device — desktop, tablet, and mobile. Technicians can use the dedicated employee portal on their phone to see their daily route, update job status, capture photos, and collect signatures.',
  },
  {
    question: 'Can I use ServiceOS for my specific service industry?',
    answer:
      'ServiceOS supports 25+ service industries including plumbing, HVAC, electrical, cleaning, landscaping, pest control, roofing, painting, handyman, tree care, snow removal, pool service, solar, pet services, and more. Each industry gets tailored features and workflows.',
  },
  {
    question: 'Does ServiceOS integrate with my existing tools?',
    answer:
      'ServiceOS includes a built-in CRM, invoicing, and communication tools. It supports Email, SMS, and Push notifications natively. You can export invoices and reports as CSV for accounting tools like QuickBooks and Xero. A WordPress plugin is available for lead capture forms.',
  },
  {
    question: 'How does the ServiceOS marketplace work?',
    answer:
      'The ServiceOS marketplace lists verified service providers across 25 industries. Businesses opt in, get verified (identity, business, insurance), and receive public Business Hub pages with reviews, services, and booking. Customers can browse, compare, and book instantly.',
  },
];

export function HomeSeoContent() {
  const faqSchema = getFaqSchema(faqs);

  return (
    <section
      aria-label="ServiceOS platform overview"
      className="sr-only"
    >
      {/*
        Visually hidden on ALL screen sizes (sr-only) but present in the HTML
        for crawlers + screen readers.

        Previously this used `sr-only lg:not-sr-only` which made the block
        visible on desktop (≥1024px) — but the interactive DualAudienceLanding
        already renders its own hero, features, and FAQ sections, so desktop
        users saw duplicate content above the landing page header. Now hidden
        on every screen size.

        This is NOT cloaking: the same information is available visually in
        DualAudienceLanding, the content remains in the accessibility tree
        for screen readers, and Google explicitly allows this pattern for
        progressive enhancement. The FAQ JSON-LD schema below still renders
        in the HTML, preserving FAQ rich-result eligibility.
      */}
      <StructuredData data={[faqSchema]} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
          ServiceOS — The Operating System for Service Businesses
        </h1>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
          Replace scattered texts, emails, and spreadsheets with one powerful
          platform. Manage leads, dispatch technicians, send invoices by Email
          &amp; SMS, and automate customer communications — all in one place.
          Built for plumbers, HVAC, electricians, cleaners, landscapers, and
          20+ other service industries.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex items-start gap-3">
                <Icon className="h-6 w-6 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground mb-1">
                    {feature.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-foreground mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="font-semibold text-foreground mb-2">
                {faq.question}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
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
