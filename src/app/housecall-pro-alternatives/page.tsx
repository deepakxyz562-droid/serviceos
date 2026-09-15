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
  Settings2,
  Receipt,
  SlidersHorizontal,
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
  title: "Best Housecall Pro Alternatives in 2026 — Compared | Fieseros",
  description:
    "Comparing the 8 best Housecall Pro alternatives for field service businesses — pricing, Email & SMS messaging, mobile apps, and which is right for your team. Includes Fieseros.",
  keywords: [
    "housecall pro alternative",
    "housecall pro alternatives",
    "apps like housecall pro",
    "housecall pro competitors",
  ],
  alternates: { canonical: "https://fieseros.com/housecall-pro-alternatives" },
  openGraph: {
    title: "Best Housecall Pro Alternatives in 2026 | Fieseros",
    description:
      "Compare the top 8 Housecall Pro alternatives — features, pricing, Email & SMS messaging, and which fits your field service business.",
    url: "https://fieseros.com/housecall-pro-alternatives",
    siteName: "Fieseros",
    type: "article",
  },
  robots: { index: true, follow: true },
};

const comparisonRows: { feature: string; fieseros: boolean; competitor: boolean }[] = [
  { feature: "24/7 Autonomous Voice AI Receptionist & phone lead booking", fieseros: true, competitor: false },
  { feature: "Visual Drag-and-Drop Sales Pipeline (Lead → Quote → Job)", fieseros: true, competitor: true },
  { feature: "Live Dispatch Map with Real-time GPS & Route Optimization", fieseros: true, competitor: true },
  { feature: "Technician Mobile App (PWA with offline photos & e-signatures)", fieseros: true, competitor: true },
  { feature: "Customer CRM with 360° property & equipment history", fieseros: true, competitor: true },
  { feature: "Interactive Quotes with Good / Better / Best Tiers", fieseros: true, competitor: true },
  { feature: "Automated Invoicing & Instant Online Payments (Stripe/Card)", fieseros: true, competitor: true },
  { feature: "Job Costing, Material Expenses & GPS Timesheet Labor Tracking", fieseros: true, competitor: true },
  { feature: "Dynamic Inspection Forms & Safety Checklists", fieseros: true, competitor: true },
  { feature: "Automated Google Review Generation & Post-Job SMS", fieseros: true, competitor: true },
  { feature: "Local Contractor Marketplace & Programmatic SEO Leads", fieseros: true, competitor: false },
  { feature: "Transparent, predictable pricing (no surprise per-seat fees)", fieseros: true, competitor: false },
];

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
      "A complete full-lifecycle platform for modern trades: 24/7 Voice AI Receptionist, live GPS dispatch, technician mobile PWA, interactive Good/Better/Best estimates, automated invoicing, job costing, and local marketplace lead generation.",
    highlight: true,
  },
  {
    position: 2,
    name: "Jobber",
    bestFor: "Small service businesses wanting simple job workflows",
    pricing: "$49–$199+/mo",
    url: "https://getjobber.com",
    description:
      "The closest direct competitor to Housecall Pro. Strong scheduling, polished mobile app, and a large ecosystem. Like Housecall Pro, pricing increases with users and add-ons.",
  },
  {
    position: 3,
    name: "ServiceTitan",
    bestFor: "Large commercial & enterprise contractors (20+ technicians)",
    pricing: "Custom pricing ($1,000s/mo + onboarding fees)",
    url: "https://servicetitan.com",
    description:
      "Enterprise-grade FSM with deep feature set for large trades contractors. Powerful, but expensive and complex — usually overkill for small teams leaving Housecall Pro.",
  },
  {
    position: 4,
    name: "Workiz",
    bestFor: "Small service businesses that need basic VoIP telephony + FSM",
    pricing: "$39–$159/mo",
    url: "https://workiz.com",
    description:
      "Combines a built-in VoIP phone system with field service management. A great pick if inbound phone calls are your primary lead channel.",
  },
  {
    position: 5,
    name: "FieldEdge",
    bestFor: "Established US mid-market service companies with office staff",
    pricing: "Custom quote",
    url: "https://fieldedge.com",
    description:
      "Mature FSM with strong dispatch, customer history, and reporting. A solid Housecall Pro alternative if you have dedicated office dispatchers.",
  },
  {
    position: 6,
    name: "Synchroteam",
    bestFor: "Field teams needing strong route optimization",
    pricing: "$25–$85/user/mo",
    url: "https://synchroteam.com",
    description:
      "Lightweight FSM with route optimization and a clean mobile app. Good international footprint, though lighter on marketing automations.",
  },
  {
    position: 7,
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    pricing: "$49–$149/mo",
    url: "https://gorilladesk.com",
    description:
      "Niche FSM tuned for pest control and lawn care — chemical tracking, recurring service plans, and route optimization built for high-volume recurring visits.",
  },
  {
    position: 8,
    name: "Kickserv",
    bestFor: "Solo operators and small cleaning/handyman teams",
    pricing: "$29–$99/mo",
    url: "https://kickserv.com",
    description:
      "Affordable, simple scheduling and invoicing. Easier to learn than Housecall Pro and a good budget pick for very small teams.",
  },
];

const switchReasons = [
  {
    icon: BadgeDollarSign,
    title: "Transparent & Predictable Pricing",
    description:
      "Housecall Pro's plan tiers and per-seat add-ons can escalate quickly as your business grows. Fieseros publishes pricing openly starting at $29/month with no surprise per-seat fees.",
  },
  {
    icon: MessageSquare,
    title: "Autonomous 24/7 Voice AI Receptionist",
    description:
      "Never miss a lucrative emergency call or after-hours inquiry. Fieseros includes an autonomous Voice AI phone receptionist that answers calls 24/7, qualifies customer needs, and books jobs directly into your dispatch schedule.",
  },
  {
    icon: Globe,
    title: "The Complete 5-Stage Business Loop",
    description:
      "Fieseros connects the entire customer journey: Acquire (Local Marketplace & SEO) → Convert (Voice AI & Quotes) → Operate (Live GPS & Mobile PWA) → Get Paid (Invoices) → Retain (Reviews & Service Plans).",
  },
  {
    icon: SlidersHorizontal,
    title: "Customizable Workflows & Dynamic Checklists",
    description:
      "Build custom inspection checklists, service agreements, and automated workflows without paying for enterprise consultants or add-on packages.",
  },
];

const faqs = [
  {
    question: "Why do service businesses switch from Housecall Pro to Fieseros?",
    answer:
      "Service businesses switch to Fieseros for the combination of all-in-one job operations with autonomous AI and lead acquisition. While Housecall Pro is a strong platform, pricing quickly creeps up as you add technicians and add-ons. Fieseros includes 24/7 Voice AI phone answering, live GPS dispatch, technician mobile PWA, interactive Good/Better/Best quotes, and local marketplace lead generation at predictable flat pricing.",
  },
  {
    question: "Is Fieseros cheaper than Housecall Pro?",
    answer:
      "Yes. Housecall Pro starts at $49/mo and increases sharply with additional team members and marketing add-ons. Fieseros offers transparent plans starting at $29/mo with full access to scheduling, invoicing, and mobile technician tools without per-user penalties.",
  },
  {
    question: "Can I migrate my customers and jobs from Housecall Pro to Fieseros?",
    answer:
      "Yes. Export your customer list, job history, and service catalogs from Housecall Pro as CSV files, then import them directly into Fieseros. Most small businesses complete data migration in under 30 minutes with complimentary support from our team.",
  },
  {
    question: "Does Fieseros have a mobile app like Housecall Pro?",
    answer:
      "Yes. Fieseros includes an offline-capable Progressive Web App (PWA) that technicians can install in one tap on any iOS or Android phone. It provides turn-by-turn navigation, job status updates ('On My Way', 'Started'), inspection checklists, before/after photo capture, and customer digital signatures on-site.",
  },
  {
    question: "How does Fieseros's Voice AI compare to Housecall Pro?",
    answer:
      "While Housecall Pro offers traditional VoIP call tracking and basic AI features, Fieseros provides a fully autonomous 24/7 Voice AI Receptionist. The AI answers calls in natural voice, identifies existing customers, checks technician calendar availability in real-time, books appointments directly into your schedule, and sends instant confirmation SMS messages.",
  },
];

export default function HousecallProAlternativesPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — Housecall Pro Alternative",
    description:
      "Email & SMS-native field service management software and Housecall Pro alternative for India, LATAM, and SEA service businesses.",
    url: "https://fieseros.com/housecall-pro-alternatives",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "8 Best Housecall Pro Alternatives in 2026",
    description:
      "A ranked, compared list of the top 8 Housecall Pro alternatives and competitors for field service businesses.",
    url: "https://fieseros.com/housecall-pro-alternatives",
    items: alternatives.map((a) => ({
      position: a.position,
      name: a.name,
      url: a.url,
      description: a.description,
    })),
  });

  return (
    <CornerstoneLayout
      activePath="/housecall-pro-alternatives"
      breadcrumbs={[
        { name: "Home", url: "https://fieseros.com" },
        { name: "Compare", url: "https://fieseros.com/jobber-alternatives" },
        { name: "Housecall Pro Alternatives", url: "https://fieseros.com/housecall-pro-alternatives" },
      ]}
      additionalSchema={[appSchema, itemListSchema]}
    >
      <CornerstoneHero
        eyebrow="Housecall Pro Alternatives"
        title="The 8 Best Housecall Pro Alternatives for Field Service Businesses"
        subtitle="Housecall Pro is popular, but it's not the right fit for every business. Compare the top alternatives — including an Email & SMS-native option built for non-US markets."
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
              Fieseros vs Housecall Pro — Feature Comparison
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The capabilities that matter most when weighing Fieseros against Housecall Pro.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-emerald-700">Fieseros</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                    Housecall Pro
                  </th>
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

      <ContentSection title="Why switch from Housecall Pro?">
        <p>
          Housecall Pro is one of the most polished FSM platforms on the market — particularly for
          US-based home service businesses. We are not here to bash it. But after talking to
          hundreds of service businesses that have switched, a clear pattern of pain points
          emerges.
        </p>
        <p>
          The first is <strong>pricing</strong>. Housecall Pro&apos;s tiered pricing is reasonable
          for a solo operator, but as you add technicians and unlock features like inventory,
          marketing, or advanced reporting, the monthly bill climbs quickly. Many customers report
          being moved to a higher tier after a feature they needed was gated behind a plan
          upgrade. Fieseros publishes pricing openly and scales with usage, not seats, so you
          always know what you will pay next year.
        </p>
        <p>
          The second is <strong>multi-channel messaging</strong>. Housecall Pro may require
          third-party integrations for native SMS and Email messaging. If your customers are in
          India, Brazil, Mexico, Indonesia, or any of the dozens of countries where SMS and
          email are the dominant messaging channels, you can end up running Housecall Pro for
          operations and a separate text-message workflow for customer communication — which
          means data in two places and constant copy-paste. Fieseros ships with Email and SMS
          included.
        </p>
        <p>
          The third is <strong>market fit and customization</strong>. Housecall Pro is
          unambiguously built for American home services — its tax templates, payment rails,
          terminology, and onboarding flows reflect that. Businesses operating in multi-currency
          or multi-language environments often find themselves working around the tool.
          Customizing workflows frequently requires support tickets or third-party consultants.
          Fieseros is built for international markets, with editable workflows, forms, and
          templates that any admin can change in-product.
        </p>
      </ContentSection>

      {/* Why switch reasons grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Why teams switch to Fieseros from Housecall Pro
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four reasons Fieseros is the fastest-growing Housecall Pro alternative for
              service businesses outside North America.
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

      {/* Top 8 list */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The 8 Best Housecall Pro Alternatives in 2026
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A ranked list of legitimate Housecall Pro competitors, with honest takes on who
              each is best for.
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
                      {alt.position === 1 ? <Trophy className="h-5 w-5" /> : alt.position}
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

      {/* Mini features grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Smartphone className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">PWA technician app</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                One-tap install, full offline mode, no app store updates. Technicians capture
                photos, signatures, and time tracking even without signal.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Settings2 className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Editable workflows</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Customize job forms, checklists, and templates in-product. No support tickets, no
                consultants, no waiting.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Receipt className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Free invoice generator</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate professional PDF invoices for one-off jobs without even creating an
                account. Useful for side work and trials.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        title="Housecall Pro alternatives — FAQ"
        subtitle="Straight answers to the questions teams ask when comparing Housecall Pro alternatives."
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
            <Link href="/jobber-alternatives" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Trophy className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Jobber Alternatives</h3>
              <p className="text-sm text-muted-foreground">Top 10 Jobber alternatives compared side by side.</p>
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
        title="Switch from Housecall Pro to Fieseros"
        subtitle="Free trial, no credit card. Bring your customers and jobs over in under 30 minutes."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
      <p className="text-xs text-muted-foreground text-center py-6 max-w-2xl mx-auto">
        Competitor features and pricing verified as of August 2025. Check vendor websites for the most current information.
      </p>
    </CornerstoneLayout>
  );
}
