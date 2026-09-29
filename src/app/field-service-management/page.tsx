import type { Metadata } from "next";
import Link from "next/link";
import {
  Wrench,
  CalendarClock,
  Users,
  Receipt,
  Smartphone,
  Zap,
  Route,
  Bot,
  PhoneCall,
  MapPin,
  FileText,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  Clock,
  DollarSign,
  Star,
  Layers,
} from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
  ContentSection,
} from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import {
  getSoftwareApplicationSchema,
  getFaqSchema,
  type FaqItem,
} from "@/lib/seo/schemas";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Field Service Management (FSM) — Complete 2026 Guide & Software | Fieseros",
  description:
    "What is field service management? The complete 2026 guide: definition, components, benefits, software features, and how to choose an FSM platform. Includes scheduling, dispatch, CRM, invoicing, and 24/7 AI receptionist. Start free.",
  keywords: [
    "field service management",
    "FSM software",
    "field service management software",
    "field service operations",
    "field service platform",
    "what is field service management",
    "field service management guide",
  ],
  alternates: { canonical: "https://fieseros.com/field-service-management" },
  openGraph: {
    title: "Field Service Management (FSM) — Complete 2026 Guide & Software | Fieseros",
    description:
      "What is field service management? The complete 2026 guide: definition, components, benefits, and how to choose FSM software. Start free.",
    url: "https://fieseros.com/field-service-management",
    siteName: "Fieseros",
    type: "article",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Field Service Management", href: "/field-service-management" },
];

// ─── The 7 core components of field service management ────────────────────────
const fsmComponents: Feature[] = [
  {
    icon: Users,
    badge: "Component 1",
    title: "Customer &amp; Asset CRM",
    description:
      "A central database of every customer, their properties, and the equipment you service — water heaters, furnaces, AC units, panels. Full service history per asset so techs arrive prepared.",
  },
  {
    icon: CalendarClock,
    badge: "Component 2",
    title: "Scheduling &amp; Appointment Booking",
    description:
      "A real-time dispatch calendar that lets customers self-book, technicians see their daily route, and dispatchers reassign jobs in seconds when emergencies hit.",
  },
  {
    icon: Route,
    badge: "Component 3",
    title: "Dispatch &amp; Route Optimization",
    description:
      "Smart assignment of each job to the best technician based on skill, territory, and availability — then route optimization to minimize drive time and fit more jobs per day.",
  },
  {
    icon: Smartphone,
    badge: "Component 4",
    title: "Mobile Field Technician App",
    description:
      "A mobile app (PWA, iOS, Android) that gives techs their route, job details, customer history, photo capture, signatures, and on-site payment — working offline in dead zones.",
  },
  {
    icon: Receipt,
    badge: "Component 5",
    title: "Invoicing &amp; Payment Collection",
    description:
      "Line-item invoice generation in the field, branded SMS + email delivery with one-tap pay links, deposit collection, and automatic reconciliation across 33+ payment gateways.",
  },
  {
    icon: PhoneCall,
    badge: "Component 6",
    title: "24/7 AI Voice &amp; Chat Reception",
    description:
      "An AI agent that answers every phone call and website chat 24/7, captures lead details, books appointments, and pages on-call techs for emergencies — never missing a job to voicemail.",
  },
  {
    icon: Zap,
    badge: "Component 7",
    title: "Automations &amp; Customer Communication",
    description:
      "Automated appointment reminders, follow-up sequences, recurring maintenance scheduling, review requests, and re-engagement campaigns — across SMS, email, and push, no Zapier required.",
  },
];

const benefits = [
  {
    icon: TrendingUp,
    title: "Capture more leads, 24/7",
    stat: "+38%",
    description:
      "An AI receptionist answers every call and chat — capturing after-hours leads that previously went to voicemail and a competitor.",
  },
  {
    icon: Clock,
    title: "Save hours of admin time",
    stat: "7+ hrs/week",
    description:
      "Automated scheduling, invoicing, and reminders eliminate the paperwork that eats evenings and weekends.",
  },
  {
    icon: DollarSign,
    title: "Get paid dramatically faster",
    stat: "-63% DSO",
    description:
      "Branded SMS invoices with one-tap pay links cut days-sales-outstanding from 47 to 17 days — without a single collection call.",
  },
  {
    icon: Route,
    title: "Fit more jobs per technician",
    stat: "+5 jobs/wk",
    description:
      "Route optimization re-orders the day's stops to minimize drive time — fitting 5 more billable jobs per tech per week in the same hours.",
  },
  {
    icon: Star,
    title: "Climb local search rankings",
    stat: "4.2x reviews",
    description:
      "Automated review requests fire the moment a job completes — collecting 4.2x more Google reviews and boosting your local SEO.",
  },
  {
    icon: ShieldCheck,
    title: "Eliminate double entry",
    stat: "1 platform",
    description:
      "Replace CRM + scheduling + forms + payments + reviews + Zapier with one connected platform — typically for less than the sum of the parts.",
  },
];

const withoutVsWith = {
  without: [
    "Jobs scheduled across 5 different text-message threads, with no shared view of who's where",
    "Customer history scattered across paper notebooks, phones, and a tech's memory",
    "After-hours calls go to voicemail — and the customer books with whoever calls back first",
    "Techs drive 3+ hours a day between jobs because routes aren't optimized",
    "Invoices created manually in Word, sent by email, and chased for 30-60 days",
    "Five separate subscriptions (CRM, scheduling, forms, payments, reviews) stitched with Zapier",
  ],
  with: [
    "One shared dispatch calendar with live technician GPS, job status, and ETA to customer",
    "A central CRM with every customer's full service history, assets, and conversation log",
    "24/7 AI receptionist answers every call, captures the lead, and books the appointment instantly",
    "Route optimization re-orders stops — 5 more jobs per tech per week in the same hours",
    "Branded SMS invoices with one-tap pay links get paid in an average of 2 days, not 47",
    "One connected platform replaces the entire stack — no Zapier, no per-seat fees, no integration glue",
  ],
};

const faqs: FaqItem[] = [
  {
    question: "What is field service management (FSM)?",
    answer:
      "Field service management (FSM) is the discipline and software platform that coordinates a business's field operations — the technicians, installers, and service crews who travel to customer locations to deliver work. FSM covers scheduling and dispatch, customer and asset management, mobile field apps, invoicing and payment collection, and customer communication. The goal of FSM software is to replace scattered tools (paper, spreadsheets, separate apps) with one connected platform that runs the entire service lifecycle from first call to final payment.",
  },
  {
    question: "What does field service management software do?",
    answer:
      "FSM software manages the full lifecycle of a field service job: capturing the lead (phone, web chat, form), scheduling the appointment, dispatching the right technician, routing them efficiently, providing customer and asset history on a mobile app, generating the invoice on-site, collecting payment, and requesting a Google review. Modern FSM platforms like Fieseros add 24/7 AI voice and chat reception, route optimization, and automation sequences that legacy tools don't have.",
  },
  {
    question: "Who uses field service management software?",
    answer:
      "Any business that sends technicians to customer locations: plumbers, HVAC, electricians, landscapers, cleaners, roofers, pest control, handymen, painters, tree care, snow removal, pool service, window cleaning, garage door, solar, medical equipment servicers, telecom installers, and appliance repair. FSM software serves both residential (home services) and commercial field service businesses.",
  },
  {
    question: "How much does field service management software cost?",
    answer:
      "Costs vary widely. Enterprise platforms like ServiceTitan start at $300+/month with annual contracts. Mid-market tools like Jobber and Housecall Pro charge $49-$199/month per seat. Fieseros starts free — your first 100 jobs cost $0 with 0% platform transaction fees on payments — then scales with job volume, not per-seat. Most small service businesses pay $49-$199/month on Fieseros.",
  },
  {
    question: "What is the difference between field service management and field service software?",
    answer:
      "They're used interchangeably in the industry. 'Field service management' (FSM) emphasizes the management discipline — coordinating people, schedules, and operations. 'Field service software' emphasizes the tool. In practice, both refer to the same category of software. Fieseros is both a field service management platform and a field service software product — see our /field-service-software product page for the feature breakdown.",
  },
  {
    question: "How do I choose field service management software?",
    answer:
      "Evaluate six criteria: (1) Does it cover your full workflow — CRM, scheduling, dispatch, invoicing, payments? (2) Does it include a mobile app for technicians that works offline? (3) Does it answer phone calls after hours (AI receptionist)? (4) Are payments integrated with 0% platform fees? (5) Is pricing per-job or per-seat? (6) Can you migrate your existing data easily? Fieseros scores well on all six. See our detailed comparison at /best-field-service-software.",
  },
  {
    question: "Does Fieseros include AI for field service management?",
    answer:
      "Yes. Fieseros includes a 24/7 AI Voice Receptionist that answers phone calls, an AI chat agent for your website, AI-drafted quotes and invoices, AI form generation, and AI-suggested replies for customer conversations. These AI features are included from the free tier — competitors like ServiceTitan charge $200+/month add-ons for similar capability.",
  },
  {
    question: "Can I migrate from Jobber, Housecall Pro, or ServiceTitan to Fieseros?",
    answer:
      "Yes. Fieseros supports CSV import for customers, jobs, and invoices, with white-glove migration from Jobber, Housecall Pro, and ServiceTitan. Most migrations complete in under a day with full service history preserved. See our comparison pages: /jobber-alternatives, /housecall-pro-alternatives, /servicetitan-alternatives.",
  },
];

export default function FieldServiceManagementPage() {
  const schema = getSoftwareApplicationSchema({
    name: "Fieseros Field Service Management Platform",
    description:
      "All-in-one field service management (FSM) platform: CRM, scheduling, dispatch, mobile technician app, invoicing, payments, and 24/7 AI receptionist.",
    applicationCategory: "BusinessApplication",
  });
  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      breadcrumbs={breadcrumbs}
      activePath="/field-service-management"
      additionalSchema={[schema, faqSchema]}
    >
      {/* Hero */}
      <CornerstoneHero
        eyebrow="Field Service Management (FSM)"
        title="Field service management, explained"
        subtitle="The complete 2026 guide to field service management — what it is, the 7 core components, the measurable benefits, and how to choose the right FSM platform for your service business."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/field-service-software"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            View Software Features
          </Link>
        </div>
      </CornerstoneHero>

      {/* Definition */}
      <ContentSection title="What is field service management?">
        <p>
          <strong>Field service management (FSM)</strong> is the discipline —
          and the software platform — that coordinates a business's field
          operations: the technicians, installers, and service crews who travel
          to customer locations to deliver work. Where a retail business runs
          from a fixed location, a field service business sends people to where
          the customer is — a homeowner's burst pipe, a restaurant's broken
          walk-in freezer, a construction site needing electrical rough-in.
        </p>
        <p>
          FSM covers the full lifecycle of every service job: capturing the
          lead (phone call, web chat, form submission), scheduling the
          appointment, dispatching the right technician with the right skills
          and parts, routing them efficiently, providing customer and asset
          history on a mobile device, generating the invoice on-site,
          collecting payment, and following up for a review. The goal of FSM
          software is to replace the scattered tools — paper work orders, text
          threads, Excel trackers, separate invoicing apps — with one connected
          platform that runs the entire service lifecycle.
        </p>
        <p>
          Modern field service management platforms like Fieseros have evolved
          beyond scheduling. They now include 24/7 AI voice receptionists that
          answer every call, AI chat agents that convert website visitors into
          booked appointments, route optimization that fits more jobs into the
          same day, and automation sequences that handle reminders, follow-ups,
          and review collection without human intervention. The best FSM
          platforms don't just track work — they capture more of it, execute it
          faster, and get paid for it sooner.
        </p>
      </ContentSection>

      {/* The 7 components */}
      <FeatureGrid
        title="The 7 core components of field service management"
        subtitle="A complete FSM platform covers all seven. Anything less, and you're back to stitching tools together with Zapier."
        features={fsmComponents}
        columns={3}
      />

      {/* Benefits */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <TrendingUp className="h-3.5 w-3.5" />
              Why it matters
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              The measurable benefits of FSM done right
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Real metrics from real service businesses running on Fieseros —
              not vanity numbers.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
                      {b.stat}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {b.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {b.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pain points comparison */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Before FSM software vs. after
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              The operational shift when a service business moves from
              scattered tools to one field service management platform.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <div className="rounded-2xl border border-red-200/80 bg-card p-6 sm:p-8 shadow-sm dark:border-red-900/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <X className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Without FSM software</h3>
              </div>
              <ul className="space-y-3.5">
                {withoutVsWith.without.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-xs dark:bg-red-950 dark:text-red-400 mt-0.5">✕</span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-50/30 via-card to-card p-6 sm:p-8 shadow-md dark:from-emerald-950/20 dark:border-emerald-500/30">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">With Fieseros FSM</h3>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Recommended</span>
              </div>
              <ul className="space-y-3.5">
                {withoutVsWith.with.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-foreground">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How to choose */}
      <ContentSection title="How to choose field service management software">
        <p>
          Evaluating FSM platforms comes down to six criteria. First, does it
          cover your full workflow — CRM, scheduling, dispatch, invoicing, and
          payments — in one platform? If you need Zapier to glue it together,
          it's not one platform. Second, does it include a mobile app for
          technicians that works offline in dead zones? Third, does it answer
          phone calls after hours? A 24/7 AI receptionist captures the leads
          your competitors lose to voicemail — this matters more than any
          scheduling feature.
        </p>
        <p>
          Fourth, are payments integrated with 0% platform transaction fees?
          Some FSM tools cap paid submissions or charge 1-2% on top of the
          gateway fee — that adds up fast. Fifth, is pricing per-job or
          per-seat? Per-seat pricing penalizes you for hiring; per-job pricing
          scales with your success. Sixth, can you migrate your existing
          customers, jobs, and invoices easily? A platform that locks you in
          with no import path is a red flag.
        </p>
        <p>
          Fieseros scores well on all six criteria. Your first 100 jobs are
          free with 0% platform fees. The AI voice and chat reception is
          included from the free tier. Payments span 33+ gateways with no
          platform fee. Pricing scales with job volume, not seats. And we offer
          white-glove migration from Jobber, Housecall Pro, and ServiceTitan.
          For a detailed head-to-head, see our{" "}
          <Link href="/best-field-service-software" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
            10 best field service management software
          </Link>{" "}
          guide and our{" "}
          <Link href="/jobber-alternatives" className="text-emerald-700 dark:text-emerald-400 font-medium hover:underline">
            Jobber alternatives
          </Link>{" "}
          comparison.
        </p>
      </ContentSection>

      {/* Related resources */}
      <section className="border-t bg-background py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-6 text-center">
            Go deeper on field service management
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Field Service Software (features)", href: "/field-service-software", icon: Wrench },
              { label: "Best FSM Software 2026", href: "/best-field-service-software", icon: Sparkles },
              { label: "Home Services Software", href: "/home-services-software", icon: Layers },
              { label: "Blue Collar CRM", href: "/blue-collar-crm", icon: Users },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group flex flex-col rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
                >
                  <Icon className="h-5 w-5 text-emerald-600 mb-3" />
                  <span className="text-sm font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {r.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection
        title="Field service management — frequently asked"
        subtitle="Everything you need to know. Still have questions? Talk to our team."
        faqs={faqs}
      />

      {/* CTA */}
      <CtaSection
        title="Ready to run your field service business on one platform?"
        subtitle="Start free today. No credit card required. Run your first 100 jobs with 0% platform fees."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
        bullets={["100 jobs free", "No credit card required", "0% platform payment fees"]}
      />
    </CornerstoneLayout>
  );
}
