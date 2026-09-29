import type { Metadata } from "next";
import Link from "next/link";
import {
  HardHat,
  Wrench,
  Users,
  CalendarClock,
  Receipt,
  PhoneCall,
  Star,
  MapPin,
  FileText,
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
} from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
  ContentSection,
} from "@/components/seo/cornerstone-layout";
import { FeatureGrid, type Feature } from "@/components/seo/feature-grid";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { StructuredData } from "@/components/seo/structured-data";
import {
  getSoftwareApplicationSchema,
  getFaqSchema,
  type FaqItem,
} from "@/lib/seo/schemas";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Blue Collar CRM — Customer Management Software for Trades | Fieseros",
  description:
    "Blue collar CRM built for plumbers, HVAC, electricians, landscapers & contractors. Track customers, jobs, assets, service history, and get paid — with a 24/7 AI receptionist answering every call. Start free.",
  keywords: [
    "blue collar CRM",
    "CRM for contractors",
    "trade CRM",
    "plumbing CRM",
    "HVAC CRM",
    "electrical contractor CRM",
    "field service CRM",
    "contractor customer management",
  ],
  alternates: { canonical: "https://fieseros.com/blue-collar-crm" },
  openGraph: {
    title: "Blue Collar CRM — Customer Management Software for Trades | Fieseros",
    description:
      "CRM built for blue collar businesses. Track customers, jobs, assets, and service history. 24/7 AI receptionist answers every call. Start free.",
    url: "https://fieseros.com/blue-collar-crm",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Blue Collar CRM", href: "/blue-collar-crm" },
];

const features: Feature[] = [
  {
    icon: Users,
    badge: "360° Profile",
    title: "Customer 360 — every job, every note",
    description:
      "Each customer record holds their full service history: every past job, invoice, payment, signature, photo, and SMS conversation — so when they call, you know exactly who they are and what you've done for them.",
  },
  {
    icon: Wrench,
    badge: "Per-Asset",
    title: "Equipment & asset tracking",
    description:
      "Track water heaters, furnaces, breaker panels, and sump pumps per customer property. Know the model, install date, warranty, and full repair history before your tech rolls up.",
  },
  {
    icon: PhoneCall,
    badge: "AI Voice",
    title: "24/7 AI receptionist answers every call",
    description:
      "A natural-sounding AI agent answers every phone call at 3am, captures the lead, books the appointment, and pages the on-call tech for emergencies. No more voicemail, no more lost jobs.",
  },
  {
    icon: CalendarClock,
    title: "Smart dispatch to the right tech",
    description:
      "Each job auto-assigns to the best technician based on skill, territory, and route — then optimizes the day's drive order so your crews fit more jobs into the same hours.",
  },
  {
    icon: Receipt,
    title: "Invoice & collect on-site",
    description:
      "Generate branded line-item invoices in the field, send by SMS + email, and collect card, Apple Pay, or ACH on the spot. 33 gateways, 0% platform transaction fees.",
  },
  {
    icon: Star,
    badge: "Automated",
    title: "Auto-collect Google reviews",
    description:
      "The moment a job is marked complete, the customer gets a personalized SMS asking for a Google review — while the great service is fresh. Sentiment-based routing protects your rating from one-star rants.",
  },
  {
    icon: Route,
    title: "Route optimization per tech",
    description:
      "Fieseros re-orders the day's stops to minimize drive time and fuel — fitting 5 more jobs per tech per week into the same hours, with live ETAs sent to every customer.",
  },
  {
    icon: Smartphone,
    title: "Mobile PWA for field crews",
    description:
      "Techs get their route, job details, customer history, photo capture, and signature collection in one mobile app — works offline, syncs when back online. iOS and Android.",
  },
  {
    icon: Bot,
    badge: "AI",
    title: "AI chat agent on your website",
    description:
      "An AI agent greets every website visitor, qualifies the lead, answers FAQs from your knowledge base, and books the appointment directly into your calendar — 24/7, in your brand voice.",
  },
];

const withoutVsWith = {
  without: [
    "Customer history scattered across paper notebooks, texts, and your tech's memory",
    "No way to look up 'when did we install that furnace?' without a 20-minute file hunt",
    "After-hours calls go to voicemail and the customer books with whoever calls back first",
    "Recurring maintenance contracts tracked on a whiteboard — half of them get missed",
    "Invoices sit unpaid for 30-60 days because nobody follows up",
    "Techs arrive at jobs with no idea what equipment is there or what was fixed last time",
  ],
  with: [
    "One CRM record per customer with every job, invoice, photo, and note searchable in seconds",
    "Full asset history per property — water heater, furnace, panel — with install dates and warranty",
    "24/7 AI Voice Receptionist answers every call, qualifies the lead, and books the job",
    "Recurring maintenance auto-scheduled, auto-invoiced, and auto-collected on schedule",
    "Branded SMS invoices with one-tap pay links get paid in an average of 2 days",
    "Techs see past repair notes, photos, and equipment specs on their phone before they knock",
  ],
};

const trades = [
  {
    name: "Plumbing",
    href: "/plumbing-software",
    desc: "Track water heaters, boilers, fixtures. Recurring flushes & backflow tests.",
  },
  {
    name: "HVAC",
    href: "/hvac-software",
    desc: "Furnace & AC install history. Emergency dispatch for no-heat calls.",
  },
  {
    name: "Electrical",
    href: "/electrical-contractor-software",
    desc: "Panel & breaker tracking. Permit-ready job records & e-signatures.",
  },
  {
    name: "Landscaping",
    href: "/landscaping-software",
    desc: "Recurring seasonal routes. Property-by-property service history.",
  },
  {
    name: "Cleaning",
    href: "/cleaning-business-software",
    desc: "Recurring bookings, key & access code management, intake forms.",
  },
  {
    name: "Roofing",
    href: "/roofing-software",
    desc: "High-ticket quotes with e-signature, deposit collection, warranty tracking.",
  },
  {
    name: "Pest Control",
    href: "/pest-control-software",
    desc: "Recurring treatment schedules, chemical logs, property history.",
  },
  {
    name: "Handyman",
    href: "/handyman-software",
    desc: "Line-item estimates, photo-annotated quotes, mobile payment on-site.",
  },
];

const faqs: FaqItem[] = [
  {
    question: "What is a blue collar CRM?",
    answer:
      "A blue collar CRM is customer management software built specifically for trade and field service businesses — plumbers, HVAC, electricians, landscapers, roofers, cleaners, and handymen. Unlike generic CRMs (Salesforce, HubSpot) built for desk sales teams, a blue collar CRM tracks equipment per property, service history, recurring maintenance contracts, and field tech activity — and connects directly to dispatch, invoicing, and payments. Fieseros is the leading blue collar CRM.",
  },
  {
    question: "How is a blue collar CRM different from a generic CRM like HubSpot?",
    answer:
      "Generic CRMs track leads, deals, and email sequences for sales teams at desks. Blue collar CRMs track physical assets (water heaters, furnaces), per-property service history, recurring maintenance contracts, technician routes, on-site payments, and after-hours phone calls — the operational reality of a trade business. Fieseros adds a 24/7 AI Voice Receptionist and AI chat agent that generic CRMs don't have at all.",
  },
  {
    question: "Which trades use a blue collar CRM?",
    answer:
      "Plumbing, HVAC, electrical, landscaping, lawn care, cleaning, roofing, pest control, handyman, painting, tree care, snow removal, pool service, window cleaning, concrete, garage door, solar, and pet services. Any business that sends technicians to customer properties, invoices for services, and needs to track service history per customer or asset.",
  },
  {
    question: "How much does a blue collar CRM cost?",
    answer:
      "Fieseros blue collar CRM starts free — your first 100 jobs cost $0, with 0% platform transaction fees on payments. Paid plans scale with job volume, not per-seat (unlike Jobber or Housecall Pro). Most small service businesses pay $49-$199/month. Compare that to ServiceTitan, which starts at $300+/month with annual contracts.",
  },
  {
    question: "Does the blue collar CRM include dispatch and scheduling?",
    answer:
      "Yes. Fieseros isn't just a CRM — it's an operating system that includes smart dispatch, route optimization, technician mobile app, invoicing, payments, and a 24/7 AI receptionist. The CRM is the customer database that ties it all together. You don't need to pay separately for a dispatch tool.",
  },
  {
    question: "Can the CRM answer my phone after hours?",
    answer:
      "Yes. The Fieseros AI Voice Receptionist answers every call 24/7, captures lead details, books appointments, and pages the on-call technician for emergencies. It's built specifically for trade businesses that lose jobs when calls go to voicemail after 5pm.",
  },
  {
    question: "Does the CRM work on my phone in the field?",
    answer:
      "Yes. Fieseros is a Progressive Web App (PWA) that works on iOS and Android, online and offline. Field techs can view their route, read customer history, capture before/after photos, collect signatures, and take payment — all from their phone, with or without cell service.",
  },
  {
    question: "Can I migrate my customers from Jobber, Housecall Pro, or a spreadsheet?",
    answer:
      "Yes. Fieseros supports CSV import for customers, jobs, and invoices. We also offer white-glove migration from Jobber, Housecall Pro, ServiceTitan, and Google Contacts. Most migrations complete in under a day, with full service history preserved.",
  },
];

export default function BlueCollarCrmPage() {
  const schema = getSoftwareApplicationSchema({
    name: "Fieseros Blue Collar CRM",
    description:
      "Blue collar CRM built for plumbers, HVAC, electricians, landscapers & contractors. Customer 360, asset tracking, 24/7 AI receptionist, dispatch, invoicing, and payments.",
    applicationCategory: "BusinessApplication",
  });
  const faqSchema = getFaqSchema(faqs);

  return (
    <CornerstoneLayout
      breadcrumbs={breadcrumbs}
      activePath="/blue-collar-crm"
      additionalSchema={[schema, faqSchema]}
    >
      {/* Hero */}
      <CornerstoneHero
        eyebrow="Blue Collar CRM"
        title="The CRM built for trade &amp; field service businesses"
        subtitle="A blue collar CRM that tracks every customer, every asset, every job, and every dollar — with a 24/7 AI receptionist answering every call. Built for plumbers, HVAC, electricians, landscapers, and contractors who run on paperwork chaos."
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

      {/* Definition / What is it */}
      <ContentSection title="What is a blue collar CRM?">
        <p>
          A <strong>blue collar CRM</strong> is customer relationship management
          software built specifically for trade and field service businesses —
          the plumbers, HVAC technicians, electricians, landscapers, roofers,
          cleaners, and handymen who power the trades economy. Where a generic
          CRM like Salesforce or HubSpot tracks leads and email sequences for
          desk-based sales teams, a blue collar CRM tracks the physical reality
          of a service business: which customer owns which water heater, when
          their furnace was last serviced, which technician is closest to the
          burst-pipe emergency, and whether the invoice from last week has been
          paid.
        </p>
        <p>
          Fieseros is the leading blue collar CRM. Every customer record holds
          their full service history — past jobs, invoices, payments,
          signatures, photos, SMS conversations — plus the assets you've
          installed or serviced at their property. A 24/7 AI Voice Receptionist
          answers every call, captures leads after hours, and books
          appointments directly into your dispatch calendar. Techs get their
          route, customer context, and payment tools on a mobile PWA. And every
          completed job triggers an automated Google review request.
        </p>
        <p>
          The result: fewer missed calls, faster cash flow, more repeat
          business, and five-star reviews that climb your local search rankings.
          Your first 100 jobs are free, with 0% platform transaction fees.
        </p>
      </ContentSection>

      {/* Who is it for */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <HardHat className="h-3.5 w-3.5" />
              Built for the trades
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              The CRM for every blue collar trade
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Each trade has its own workflows, equipment, and recurring
              revenue patterns. Fieseros adapts to yours — not the other way
              around.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {trades.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md"
              >
                <h3 className="text-base font-bold text-foreground mb-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  {t.name}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <FeatureGrid
        title="Everything a blue collar CRM should do"
        subtitle="Customer history, asset tracking, dispatch, invoicing, payments, and a 24/7 AI receptionist — one platform, one price, no Zapier glue."
        features={features}
      />

      {/* Pain points comparison */}
      <section className="border-t bg-muted/20 py-16 lg:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              The difference between chaos &amp; control
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              What changes when your trade business moves from paper,
              spreadsheets, and voicemail to a blue collar CRM built for the
              field.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            <div className="rounded-2xl border border-red-200/80 bg-card p-6 sm:p-8 shadow-sm dark:border-red-900/30">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                  <X className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground">Without a blue collar CRM</h3>
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
              { value: "24/7", label: "AI receptionist coverage" },
              { value: "0%", label: "Platform payment fees" },
              { value: "18+", label: "Trades supported" },
              { value: "100", label: "Free jobs to start" },
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
      <ContentSection title="Why Fieseros is the blue collar CRM that wins">
        <p>
          Most field service CRMs were built for enterprise fleets with
          dispatch desks and IT managers. Jobber and Housecall Pro serve the
          mid-market but stop at scheduling. Generic CRMs like HubSpot don't
          understand what a water heater asset record is. Fieseros was built
          from the ground up for the solo plumber and the 50-truck HVAC fleet
          alike — with the AI tooling the big players charge $200/month
          add-ons for, included from the first free job.
        </p>
        <p>
          The Fieseros blue collar CRM is one connected platform. The CRM
          record feeds the dispatch board, which feeds the technician's mobile
          app, which feeds the invoice, which feeds the payment, which feeds
          the review request. No Zapier glue, no double entry, no monthly
          reconciliation nightmare. And the 24/7 AI Voice Receptionist captures
          the leads your competitors lose to voicemail every night.
        </p>
        <p>
          When a homeowner's basement floods at 11pm, they don't leave a
          voicemail and wait — they call the next plumber on Google. Fieseros
          answers on the first ring, captures the job details, books the
          appointment, and pages your on-call tech. That's a job your
          competitor never had a chance at. Over a year, the after-hours
          leads alone pay for the platform ten times over.
        </p>
      </ContentSection>

      {/* Related products */}
      <section className="border-t bg-background py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-6 text-center">
            Explore the full blue collar operating system
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Field Service Management", href: "/field-service-management", icon: Wrench },
              { label: "Scheduling & Dispatch", href: "/scheduling-and-dispatch", icon: Route },
              { label: "Invoicing & Payments", href: "/invoicing-and-payments", icon: Receipt },
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
        title="Blue Collar CRM — frequently asked"
        subtitle="Everything you need to know. Still have questions? Talk to our team."
        faqs={faqs}
      />

      {/* CTA */}
      <CtaSection
        title="Ready to run your trade business on a real CRM?"
        subtitle="Start free today. No credit card required. Run your first 100 jobs with 0% platform fees."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
        bullets={["100 jobs free", "No credit card required", "0% platform payment fees"]}
      />
    </CornerstoneLayout>
  );
}
