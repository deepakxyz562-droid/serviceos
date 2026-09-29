import type { Metadata } from "next";
import Link from "next/link";
import {
  Home,
  Users,
  CalendarClock,
  Receipt,
  PhoneCall,
  Star,
  MapPin,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Route,
  Zap,
  Bot,
  Smartphone,
  TrendingUp,
  Wrench,
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
  title: "Home Services Software — Run Your Home Service Business | Fieseros",
  description:
    "All-in-one home services software for plumbers, HVAC, electricians, cleaners, landscapers & handymen. Scheduling, dispatch, invoicing, payments, and a 24/7 AI receptionist. Start free — 100 jobs, 0% fees.",
  keywords: [
    "home services software",
    "home service business software",
    "home service CRM",
    "home services management software",
    "contractor software",
    "field service software",
    "home services platform",
  ],
  alternates: { canonical: "https://fieseros.com/home-services-software" },
  openGraph: {
    title: "Home Services Software — Run Your Home Service Business | Fieseros",
    description:
      "All-in-one home services software: scheduling, dispatch, invoicing, payments, and a 24/7 AI receptionist. Start free — 100 jobs, 0% fees.",
    url: "https://fieseros.com/home-services-software",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Home Services Software", href: "/home-services-software" },
];

const features: Feature[] = [
  {
    icon: PhoneCall,
    badge: "AI Voice",
    title: "24/7 AI receptionist answers every call",
    description:
      "A natural-sounding AI agent answers every call at 3am, captures the lead, books the appointment, and pages the on-call tech for emergencies. No more voicemail, no more lost jobs to competitors.",
  },
  {
    icon: CalendarClock,
    badge: "Self-Serve",
    title: "Customer self-booking &amp; reminders",
    description:
      "Customers pick a slot from your real-time availability — no phone tag. Automated SMS + email reminders slash no-shows by up to 41% and respect everyone's time.",
  },
  {
    icon: Route,
    title: "Smart dispatch &amp; route optimization",
    description:
      "Each job auto-assigns to the best tech based on skill, territory, and route — then the day's stops are re-ordered to minimize drive time. Fit 5 more jobs per tech per week.",
  },
  {
    icon: Receipt,
    title: "Invoice, collect, reconcile — in one flow",
    description:
      "Generate branded line-item invoices in the field, send by SMS + email, and collect card, Apple Pay, or ACH on the spot. 33 gateways, 0% platform transaction fees, automatic reconciliation.",
  },
  {
    icon: Star,
    badge: "Automated",
    title: "Auto-collect Google reviews",
    description:
      "The moment a job is marked complete, the customer gets a personalized SMS asking for a Google review. Sentiment-based routing protects your rating from one-star rants before they go public.",
  },
  {
    icon: Bot,
    badge: "AI Chat",
    title: "AI chat agent on your website",
    description:
      "An AI agent greets every website visitor, qualifies the lead, answers FAQs from your knowledge base, and books the appointment directly into your calendar — 24/7, in your brand voice.",
  },
  {
    icon: Smartphone,
    title: "Mobile PWA for field crews",
    description:
      "Techs get their route, job details, customer history, photo capture, and signature collection in one mobile app — works offline, syncs when back online. iOS and Android.",
  },
  {
    icon: Users,
    title: "Customer 360 with full service history",
    description:
      "Each customer record holds every past job, invoice, payment, signature, photo, and SMS conversation — plus the assets you've installed or serviced at their property.",
  },
  {
    icon: Zap,
    title: "Automations that replace Zapier",
    description:
      "Build multi-step sequences across SMS, email, and push — appointment reminders, follow-ups, re-engagement offers, and recurring billing — without a single Zapier bill.",
  },
];

const withoutVsWith = {
  without: [
    "Customers call after hours and book with whoever answers first — usually a competitor",
    "Scheduling on a whiteboard with phone-tag confirmation calls eating 2+ hours a day",
    "Techs drive 3+ hours between jobs because routes aren't optimized",
    "Invoices sit unpaid for 30-60 days with no automated follow-up",
    "Great service never translates to Google reviews because nobody asks at the right moment",
    "Five separate subscriptions (CRM, scheduling, forms, payments, reviews) stitched with Zapier",
  ],
  with: [
    "AI receptionist answers every call 24/7, captures the lead, and books the job before competitors wake up",
    "Customers self-book from real-time availability; automated reminders cut no-shows by 41%",
    "Route optimization re-orders the day's stops — 5 more jobs per tech per week in the same hours",
    "Branded SMS invoices with one-tap pay links get paid in an average of 2 days, not 47",
    "Automated review requests fire the moment a job completes — 4.2x more Google reviews",
    "One connected platform replaces CRM + scheduling + forms + payments + reviews for less than the sum of the parts",
  ],
};

const homeServiceCategories = [
  {
    name: "Home Repair & Maintenance",
    services: "Plumbing, HVAC, Electrical, Handyman, Appliance Repair",
    href: "/field-service-management",
  },
  {
    name: "Home Exterior & Yard",
    services: "Landscaping, Lawn Care, Tree Care, Snow Removal, Roofing, Solar",
    href: "/landscaping-software",
  },
  {
    name: "Home Cleaning & Interior",
    services: "House Cleaning, Window Cleaning, Carpet Cleaning, Painting",
    href: "/cleaning-business-software",
  },
  {
    name: "Specialty Home Services",
    services: "Pest Control, Pool Service, Garage Door, Concrete, Pet Services",
    href: "/pest-control-software",
  },
];

const faqs: FaqItem[] = [
  {
    question: "What is home services software?",
    answer:
      "Home services software is an all-in-one platform that helps home service businesses — plumbers, HVAC, electricians, landscapers, cleaners, handymen, and more — run their operations. It combines customer management (CRM), scheduling and dispatch, invoicing and payments, a mobile field app, automated customer communications, and increasingly AI-powered phone and chat reception. Fieseros is the leading home services software platform.",
  },
  {
    question: "How is home services software different from field service software?",
    answer:
      "They overlap heavily. Field service software typically refers to any business that sends technicians to customer locations (including commercial B2B services). Home services software specifically targets businesses serving residential homeowners — plumbers, HVAC, cleaners, landscapers, pest control, etc. Fieseros serves both, with workflows tailored to residential service businesses (recurring maintenance, after-hours emergencies, Google review collection).",
  },
  {
    question: "Which home service businesses use this software?",
    answer:
      "Plumbing, HVAC, electrical, landscaping, lawn care, cleaning, roofing, pest control, handyman, painting, tree care, snow removal, pool service, window cleaning, concrete, garage door, solar, and pet services. Any business that visits customer homes to deliver a service, invoices for that service, and needs to manage recurring customers.",
  },
  {
    question: "How much does home services software cost?",
    answer:
      "Fieseros home services software starts free — your first 100 jobs cost $0, with 0% platform transaction fees on payments. Paid plans scale with job volume, not per-seat. Most small home service businesses pay $49-$199/month. Compare that to ServiceTitan ($300+/month with annual contracts) or stitching together 5 separate tools ($1,178+/month).",
  },
  {
    question: "Does the software answer phone calls after hours?",
    answer:
      "Yes. The Fieseros AI Voice Receptionist answers every call 24/7, captures lead details, books appointments directly into your calendar, and pages the on-call technician for emergencies. Most home service businesses lose 30-50% of their leads to voicemail after hours — the AI receptionist captures them instead.",
  },
  {
    question: "Can customers book appointments online themselves?",
    answer:
      "Yes. Fieseros includes a customer self-booking page that shows your real-time availability. Customers pick a slot, the calendar updates instantly, the assigned technician is notified, and the customer gets automated SMS + email reminders. No phone tag required.",
  },
  {
    question: "Does the software handle recurring maintenance contracts?",
    answer:
      "Yes. Schedule recurring maintenance (seasonal HVAC tune-ups, annual water heater flushes, weekly lawn care, monthly cleaning) once, and Fieseros auto-generates the visits, queues the invoices, and auto-charges the card on schedule. Recurring revenue is the highest-margin revenue in home services — Fieseros protects it.",
  },
  {
    question: "Can I migrate from Jobber, Housecall Pro, or ServiceTitan?",
    answer:
      "Yes. Fieseros supports CSV import for customers, jobs, and invoices. We offer white-glove migration from Jobber, Housecall Pro, ServiceTitan, and Google Contacts. Most migrations complete in under a day, with full customer and service history preserved.",
  },
];

export default function HomeServicesSoftwarePage() {
  const schema = getSoftwareApplicationSchema({
    name: "Fieseros Home Services Software",
    description:
      "All-in-one home services software for plumbers, HVAC, electricians, cleaners, landscapers & handymen. Scheduling, dispatch, invoicing, payments, and a 24/7 AI receptionist.",
    applicationCategory: "BusinessApplication",
  });
  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      breadcrumbs={breadcrumbs}
      activePath="/home-services-software"
      additionalSchema={[schema, faqSchema]}
    >
      {/* Hero */}
      <CornerstoneHero
        eyebrow="Home Services Software"
        title="The operating system for home service businesses"
        subtitle="One platform that runs your whole home service business — 24/7 AI receptionist, customer self-booking, smart dispatch, on-site invoicing, and automated Google reviews. Built for plumbers, HVAC, electricians, cleaners, landscapers, and handymen."
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
            href="/contact-us"
            className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Talk to Sales
          </Link>
        </div>
      </CornerstoneHero>

      {/* Definition */}
      <ContentSection title="What is home services software?">
        <p>
          <strong>Home services software</strong> is an all-in-one platform that
          helps businesses serving residential homeowners run their operations —
          plumbers, HVAC contractors, electricians, landscapers, house
          cleaners, handymen, pest control, roofers, and the dozens of other
          trades that visit customer homes to deliver a service. It combines
          customer relationship management (CRM), scheduling and dispatch,
          invoicing and payments, a mobile field app for technicians, automated
          customer communications, and increasingly AI-powered phone and chat
          reception into one connected platform.
        </p>
        <p>
          The best home services software — like Fieseros — goes beyond
          scheduling. It answers every phone call 24/7 with an AI Voice
          Receptionist so after-hours leads don't go to voicemail. It lets
          customers self-book appointments from real-time availability. It
          optimizes technician routes to fit more jobs into the same day. It
          collects deposits and payments on-site. And it automatically requests
          Google reviews the moment a job is marked complete — climbing your
          local search rankings with every satisfied customer.
        </p>
        <p>
          For most home service businesses, the alternative is a stack of 5+
          disconnected tools: a CRM, a scheduling app, a forms tool, a payments
          processor, a review collector, and Zapier to glue them together —
          costing $1,000+/month and breaking constantly. Fieseros replaces all
          of it in one platform, starting free for your first 100 jobs.
        </p>
      </ContentSection>

      {/* Who is it for — home service categories */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <Home className="h-3.5 w-3.5" />
              Every home service category
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Built for every home service trade
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              From emergency plumbing to recurring lawn care, Fieseros adapts
              its workflows to the realities of each home service category.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {homeServiceCategories.map((c) => (
              <Link
                key={c.name}
                href={c.href}
                className="group rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md flex items-start gap-4"
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Home className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                    {c.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {c.services}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <FeatureGrid
        title="One platform for your whole home service business"
        subtitle="From the first phone call to the final Google review — every workflow connected, no Zapier required."
        features={features}
      />

      {/* Pain points comparison */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Before Fieseros vs. after
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              The operational shift when a home service business moves from
              scattered tools and voicemail to one connected platform.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <div className="rounded-2xl border border-red-200/80 bg-card p-6 sm:p-8 shadow-sm dark:border-red-900/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <X className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Without home services software</h3>
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
                  <h3 className="text-lg font-bold text-foreground">With Fieseros</h3>
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

      {/* Stats bar */}
      <section className="border-t bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: "24/7", label: "AI receptionist answers calls" },
              { value: "+38%", label: "More leads captured" },
              { value: "-63%", label: "Faster invoice payments" },
              { value: "4.2x", label: "More Google reviews" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
                  {s.value}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Fieseros */}
      <ContentSection title="Why Fieseros is the home services software that wins">
        <p>
          The home services software market is crowded: Jobber, Housecall Pro,
          ServiceTitan, FieldEdge, and a dozen point tools all claim to "run
          your business." But most were built for a specific size — ServiceTitan
          for enterprise fleets, Jobber for solo operators — and none of them
          answer your phone at 3am when a homeowner's basement floods.
        </p>
        <p>
          Fieseros was built for the full spectrum of home service businesses,
          from the solo plumber to the 50-truck HVAC fleet. The 24/7 AI Voice
          Receptionist captures the leads your competitors lose to voicemail.
          The AI chat agent converts website visitors into booked appointments.
          The dispatch board optimizes routes so techs fit more jobs into the
          same day. The invoicing flow gets you paid in 2 days instead of 47.
          And the automated review requests climb your local search rankings —
          so the next homeowner searching "plumber near me" finds you first.
        </p>
        <p>
          All of this in one connected platform — no Zapier glue, no per-seat
          pricing, no annual contracts. Your first 100 jobs are free, with 0%
          platform transaction fees on every payment you collect. That's the
          Fieseros difference.
        </p>
      </ContentSection>

      {/* Related products */}
      <section className="border-t bg-background py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-6 text-center">
            Explore the full home services platform
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Field Service Management", href: "/field-service-management", icon: Wrench },
              { label: "Blue Collar CRM", href: "/blue-collar-crm", icon: Users },
              { label: "AI Voice Receptionist", href: "/ai-employee", icon: PhoneCall },
            ].map((r) => {
              const Icon = r.icon;
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group flex items-center justify-between rounded-xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                      {r.label}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection
        title="Home Services Software — frequently asked"
        subtitle="Everything you need to know. Still have questions? Talk to our team."
        faqs={faqs}
      />

      {/* CTA */}
      <CtaSection
        title="Ready to run your home service business on one platform?"
        subtitle="Start free today. No credit card required. Run your first 100 jobs with 0% platform fees."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
        bullets={["100 jobs free", "No credit card required", "0% platform payment fees"]}
      />
    </CornerstoneLayout>
  );
}
