import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  X,
  ArrowRight,
  Trophy,
  ExternalLink,
  Star,
  BadgeDollarSign,
  Globe,
  Smartphone,
  MessageSquare,
  Clock,
  Receipt,
  Building2,
  Award,
  LayoutGrid,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import {
  getSoftwareApplicationSchema,
  getItemListSchema,
} from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "10 Best Jobber Alternatives in 2026 — Free & Paid | Fieseros",
  description:
    "Looking for a Jobber alternative? We compare the top 10 Jobber alternatives and competitors for field service businesses — pricing, features, Email & SMS messaging, and which is best for your market.",
  keywords: [
    "jobber alternative",
    "jobber alternatives",
    "apps like jobber",
    "jobber competitors",
    "jobber replacement",
  ],
  alternates: { canonical: "https://fieseros.com/jobber-alternatives" },
  openGraph: {
    title: "10 Best Jobber Alternatives in 2026 | Fieseros",
    description:
      "Compare the top 10 Jobber alternatives — features, pricing, Email & SMS messaging, and which fits your field service business.",
    url: "https://fieseros.com/jobber-alternatives",
    siteName: "Fieseros",
    type: "article",
  },
  robots: { index: true, follow: true },
};

// ─── Fieseros vs Jobber comparison rows ────────────────────────────────────
const comparisonRows: { feature: string; fieseros: boolean; competitor: boolean }[] = [
  { feature: "24/7 Autonomous Voice AI Receptionist & phone booking", fieseros: true, competitor: false },
  { feature: "Customer CRM with 360° property & equipment history", fieseros: true, competitor: true },
  { feature: "Visual Drag-and-Drop Sales Pipeline (Lead → Quote → Job)", fieseros: true, competitor: false },
  { feature: "Live Dispatch Map with Real-time GPS & Route Optimization", fieseros: true, competitor: true },
  { feature: "Technician Mobile App (PWA with offline photos & e-signatures)", fieseros: true, competitor: true },
  { feature: "Interactive Quotes with Good / Better / Best Tiers", fieseros: true, competitor: true },
  { feature: "Automated Invoicing & Instant Online Payments (Stripe/Card)", fieseros: true, competitor: true },
  { feature: "Job Costing, Material Expenses & GPS Timesheet Labor Tracking", fieseros: true, competitor: false },
  { feature: "Dynamic Inspection Forms & Safety Checklists", fieseros: true, competitor: true },
  { feature: "Automated Google Review Generation & Post-Job SMS", fieseros: true, competitor: false },
  { feature: "Local Contractor Marketplace & Programmatic SEO Leads", fieseros: true, competitor: false },
  { feature: "Transparent, predictable pricing (no surprise per-seat fees)", fieseros: true, competitor: false },
];

// ─── Top 10 Jobber alternatives ─────────────────────────────────────────────
const alternatives: {
  position: number;
  name: string;
  bestFor: string;
  pricing: string;
  url: string;
  description: string;
  highlight?: boolean;
}[] = [
  {
    position: 1,
    name: "Fieseros",
    bestFor: "Growing home & commercial service businesses wanting AI + All-in-One FSM",
    pricing: "Free trial → from $29/mo",
    url: "https://fieseros.com",
    description:
      "The complete full-lifecycle platform for modern trade contractors: 24/7 Voice AI Receptionist, live GPS dispatch, technician mobile PWA, interactive Good/Better/Best estimates, automated invoicing, job costing, and local marketplace lead generation.",
    highlight: true,
  },
  {
    position: 2,
    name: "Housecall Pro",
    bestFor: "US home service businesses wanting broad marketing & phone add-ons",
    pricing: "$49–$200+/mo",
    url: "https://housecallpro.com",
    description:
      "A popular all-in-one FSM for US home services with strong dispatch, invoicing, and a polished mobile app. Powerful feature set, though pricing escalates quickly with seat add-ons.",
  },
  {
    position: 3,
    name: "ServiceTitan",
    bestFor: "Large commercial & enterprise contractors (20+ technicians)",
    pricing: "Custom pricing ($1,000s/mo + onboarding fees)",
    url: "https://servicetitan.com",
    description:
      "Enterprise-grade FSM built for large trades contractors. Very deep functionality but expensive and complex, requiring months of onboarding.",
  },
  {
    position: 4,
    name: "Workiz",
    bestFor: "Small service businesses wanting basic VoIP telephony + FSM",
    pricing: "$39–$159/mo",
    url: "https://workiz.com",
    description:
      "Combines a VoIP phone system with job scheduling. Good for small teams handling high call volumes, though lacks autonomous voice AI scheduling.",
  },
  {
    position: 5,
    name: "FieldEdge",
    bestFor: "Established US trades businesses with dedicated office dispatchers",
    pricing: "Custom quote",
    url: "https://fieldedge.com",
    description:
      "Veteran FSM with strong dispatch, customer history, and accounting integrations. Built primarily for mid-market service companies with office staff.",
  },
  {
    position: 6,
    name: "Jobber",
    bestFor: "Small North American service businesses wanting simple job workflows",
    pricing: "$49–$199+/mo",
    url: "https://getjobber.com",
    description:
      "The benchmark standard for simple job workflows, quotes, and client hub. Strong execution, but lacks native 24/7 voice AI answering, built-in lead marketplace, and per-user fees add up.",
  },
  {
    position: 7,
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    pricing: "$49–$149/mo",
    url: "https://gorilladesk.com",
    description:
      "Niche FSM tuned specifically for pest control and lawn care with chemical tracking and recurring route optimization.",
  },
  {
    position: 8,
    name: "Kickserv",
    bestFor: "Solo operators and handyman businesses on a budget",
    pricing: "$29–$99/mo",
    url: "https://kickserv.com",
    description:
      "Affordable entry-level FSM with simple scheduling and invoicing for solo tradesmen who don't need complex dispatch or voice AI.",
  },
  {
    position: 9,
    name: "Synchroteam",
    bestFor: "Field teams prioritizing basic route mapping",
    pricing: "$25–$85/user/mo",
    url: "https://synchroteam.com",
    description:
      "Field service software focused on route optimization and time tracking, but lighter on marketing automation and AI.",
  },
  {
    position: 10,
    name: "Innovia",
    bestFor: "Small service teams seeking basic scheduling",
    pricing: "Custom quote",
    url: "https://innovia.com",
    description:
      "Emerging FSM challenger with scheduling, invoicing, and CRM for small service teams.",
  },
];

// ─── Why switch feature highlights ──────────────────────────────────────────
const switchReasons = [
  {
    icon: BadgeDollarSign,
    title: "Transparent & Predictable Pricing",
    description:
      "Jobber's per-user pricing model adds up quickly as your team grows. Fieseros offers clear, predictable tiers starting at $29/month with no surprise per-seat markups.",
  },
  {
    icon: MessageSquare,
    title: "Autonomous 24/7 Voice AI Receptionist",
    description:
      "Never miss another customer call while on the job. Fieseros includes a live 24/7 Voice AI Receptionist that answers inbound phone calls, qualifies leads, and books appointments straight into your calendar.",
  },
  {
    icon: Globe,
    title: "The Complete 5-Stage Business Loop",
    description:
      "While Jobber only handles jobs you already have, Fieseros powers the entire lifecycle: Acquire (Local Marketplace & SEO) → Convert (Voice AI & Quotes) → Operate (Live GPS & Mobile PWA) → Get Paid (Invoices) → Retain (Reviews & Service Plans).",
  },
  {
    icon: Smartphone,
    title: "Modern Offline Technician PWA",
    description:
      "Technicians install the mobile app in one tap without dealing with app store updates. Complete safety checklists, upload before/after photos, and collect customer signatures on-site seamlessly.",
  },
];

const faqs = [
  {
    question: "Why do service businesses switch from Jobber to Fieseros?",
    answer:
      "Service businesses switch to Fieseros because it unifies job operations with lead acquisition and AI automation. While Jobber handles quotes, jobs, and invoices, Fieseros also provides an autonomous 24/7 Voice AI Receptionist to answer customer phone calls, a visual sales pipeline, dynamic checklists, job costing, automated Google review requests, and a local contractor marketplace to generate new inbound leads.",
  },
  {
    question: "Is Fieseros cheaper than Jobber?",
    answer:
      "Yes. Jobber starts at $49/mo and charges steep per-user fees on higher tiers, meaning a 5-person team can easily pay $150–$300+/mo. Fieseros offers predictable plans starting at $29/mo, with full access to core scheduling, invoicing, and technician mobile tools without penalizing you for adding team members.",
  },
  {
    question: "Can I migrate my customer and job data from Jobber to Fieseros?",
    answer:
      "Yes. You can export your clients, properties, job history, and service catalogs from Jobber via CSV and import them directly into Fieseros in under 30 minutes. Our onboarding team also provides complimentary data migration assistance.",
  },
  {
    question: "Does Fieseros have a mobile app for field technicians?",
    answer:
      "Yes. Fieseros provides a modern, offline-capable Progressive Web App (PWA) that technicians can install on any iOS or Android device in one tap. Technicians can view their daily schedule, get one-touch turn-by-turn navigation, update job statuses (On My Way, Started), complete inspection checklists, take before/after photos, and collect digital customer signatures on-site.",
  },
  {
    question: "How does Fieseros's Voice AI Receptionist compare to Jobber?",
    answer:
      "Jobber does not offer a native autonomous Voice AI phone receptionist. Fieseros includes an AI Receptionist with a dedicated phone line that answers calls 24/7, speaks naturally with homeowners, checks technician availability in real time, books jobs directly into your CRM, and sends instant confirmation SMS messages to both you and the customer.",
  },
];

export default function JobberAlternativesPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Jobber Alternative",
    description:
      "Email & SMS-native field service management software and Jobber alternative for India, LATAM, and SEA service businesses.",
    url: "https://fieseros.com/jobber-alternatives",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "10 Best Jobber Alternatives in 2026",
    description:
      "A ranked, compared list of the top 10 Jobber alternatives and competitors for field service businesses.",
    url: "https://fieseros.com/jobber-alternatives",
    items: alternatives.map((a) => ({
      position: a.position,
      name: a.name,
      url: a.url,
      description: a.description,
    })),
  });

  return (
    <CornerstoneLayout
      activePath="/jobber-alternatives"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Compare", url: "https://fieseros.com/jobber-alternatives" },
        { name: "Jobber Alternatives", url: "https://fieseros.com/jobber-alternatives" },
      ]}
      additionalSchema={[appSchema, itemListSchema]}
    >
      <CornerstoneHero
        eyebrow="Jobber Alternatives"
        title="Looking for a Jobber Alternative? Here Are the 10 Best Options in 2026"
        subtitle="Whether Jobber is too expensive, too complex, or missing multi-channel messaging, we compare the top 10 Jobber alternatives for field service businesses — including Fieseros."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Try Fieseros Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/field-service-software"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore Fieseros
          </Link>
        </div>
      </CornerstoneHero>

      {/* Comparison table */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Fieseros vs Jobber — Feature Comparison
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The features that matter most when choosing between Fieseros and Jobber, side by side.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-emerald-700">Fieseros</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Jobber</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 text-foreground">{row.feature}</td>
                    <td className="text-center py-3 px-4">
                      {row.fieseros ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.competitor ? (
                        <CheckCircle2 className="h-5 w-5 text-muted-foreground mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ContentSection title="Why look for Jobber alternatives?">
        <p>
          Jobber is genuinely a great product. It has helped tens of thousands of small service
          businesses professionalize their operations, and we have a lot of respect for what the
          team has built. But no software is the right fit for everyone, and there are a few
          recurring reasons service businesses start searching for Jobber alternatives.
        </p>
        <p>
          The most common one we hear is <strong>pricing</strong>. Jobber&apos;s per-user pricing
          model works well for a solo operator but compounds quickly as you add technicians,
          dispatchers, and office staff. A 5-technician team can easily pay $150 or more per month
          before adding any premium add-ons. For small businesses in price-sensitive markets —
          India, Latin America, Southeast Asia — that cost is hard to justify, especially when the
          feature set is built around US workflows.
        </p>
        <p>
          The second reason is <strong>multi-channel messaging</strong>. In most of the world,
          SMS and email are how customers communicate with businesses. Jobber may require
          third-party integrations for native SMS and Email messaging — for example,
          connecting through Zapier — which can add cost and brittleness. If most of your
          customers prefer SMS or email over phone calls, that gap becomes a deal-breaker.
          Fieseros was built Email & SMS-first, so quotes, job updates, invoices, and
          payment links all flow through Email and SMS natively.
        </p>
        <p>
          The third reason is <strong>complexity and market fit</strong>. Jobber is feature-rich,
          which is great, but the UX is tuned to North American home services and English-language
          workflows. Businesses operating in multi-currency, multi-language environments — or those
          who simply want a faster, lighter setup — often find themselves fighting the tool. If
          you have ever spent an afternoon configuring Jobber and thought &quot;there has to be a
          simpler way&quot;, this list is for you.
        </p>
      </ContentSection>

      {/* Why switch reasons grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Why teams switch to Fieseros from Jobber
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four concrete reasons Fieseros has become the most-switched-to Jobber alternative
              outside North America.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {switchReasons.map((r) => (
              <div key={r.title} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                  <r.icon className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{r.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top 10 list */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The 10 Best Jobber Alternatives in 2026
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each option below is a legitimate Jobber competitor. We list who it is best for,
              the pricing tier, and an honest take on where it shines — and where it falls short.
            </p>
          </div>
          <div className="space-y-4">
            {alternatives.map((alt) => (
              <div
                key={alt.position}
                className={`rounded-xl border p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md ${
                  alt.highlight ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : "bg-card"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 sm:min-w-[64px]">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        alt.position === 1
                          ? "bg-emerald-600 text-white"
                          : "bg-muted text-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {alt.position === 1 ? (
                        <Trophy className="h-5 w-5" />
                      ) : (
                        alt.position
                      )}
                    </span>
                    {alt.position === 1 && (
                      <span className="text-xs font-semibold text-emerald-700 hidden sm:block">
                        Top pick
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-lg font-bold text-foreground">{alt.name}</h3>
                      {alt.highlight && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          <Star className="h-3 w-3" /> Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {alt.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Best for: <span className="text-foreground font-medium">{alt.bestFor}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        Pricing: <span className="text-foreground font-medium">{alt.pricing}</span>
                      </span>
                    </div>
                  </div>
                  <div className="sm:ml-2 shrink-0">
                    {alt.highlight ? (
                      <Link
                        href="/#signup"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
                      >
                        Start Free
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="noopener nofollow"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                      >
                        Visit
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6 text-center">
            Pricing reflects publicly listed plans as of 2026 and may change. Always confirm
            current pricing on each vendor&apos;s website.
          </p>
        </div>
      </section>

      {/* What Fieseros gets right mini-section */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Clock className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Set up in under 30 minutes</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No lengthy onboarding calls. Import customers, set up services, invite technicians,
                and start dispatching jobs the same afternoon.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Receipt className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Free invoice generator</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate professional PDF invoices without even creating an account. Useful as a
                fallback or for one-off jobs outside your normal workflow.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Globe className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Multi-currency built in</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Invoice in rupees, pesos, reais, dollars, or dirhams. Set per-customer currency
                and let Fieseros handle conversions and tax labels.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        title="Jobber alternatives — FAQ"
        subtitle="Honest answers to the questions we hear most from teams evaluating Jobber alternatives."
      />

      {/* P2-1 (SEO): Hub-and-spoke internal linking — connects sibling cornerstone
          pages to distribute PageRank and help Google understand topical relationships. */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3 text-center">
            Related Field Service Software
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Explore Fieseros features built for other service industries.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/housecall-pro-alternatives" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Star className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Housecall Pro Alternatives</h3>
              <p className="text-sm text-muted-foreground">Best Housecall Pro alternatives for service teams.</p>
            </Link>
            <Link href="/servicetitan-alternatives" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Building2 className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">ServiceTitan Alternatives</h3>
              <p className="text-sm text-muted-foreground">Right-sized FSM options for SMBs.</p>
            </Link>
            <Link href="/best-field-service-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Award className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Best Field Service Software</h3>
              <p className="text-sm text-muted-foreground">Compare the top platforms side by side.</p>
            </Link>
            <Link href="/field-service-software" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <LayoutGrid className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Field Service Software</h3>
              <p className="text-sm text-muted-foreground">All-in-one platform for modern service businesses.</p>
            </Link>
          </div>
        </div>
      </section>

      <CtaSection
        title="Switch from Jobber to Fieseros this week"
        subtitle="Migrate your customers and jobs in under 30 minutes. Free trial, no credit card, cancel anytime."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
      <p className="text-xs text-muted-foreground text-center py-6 max-w-2xl mx-auto">
        Competitor features and pricing verified as of August 2025. Check vendor websites for the most current information.
      </p>
    </CornerstoneLayout>
  );
}
