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
  Clock,
  Smartphone,
  MessageSquare,
  Layers,
  Rocket,
  Building2,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import {
  getSoftwareApplicationSchema,
  getItemListSchema,
} from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "Best ServiceTitan Alternatives for Small & Mid-Size Businesses | ServiceOS",
  description:
    "ServiceTitan is powerful but expensive and built for large contractors. Compare the best ServiceTitan alternatives for small and mid-size field service businesses.",
  keywords: [
    "servicetitan alternative",
    "servicetitan alternatives",
    "apps like servicetitan",
    "servicetitan competitors",
  ],
  alternates: { canonical: "https://serviceos.com/servicetitan-alternatives" },
  openGraph: {
    title: "Best ServiceTitan Alternatives in 2026 | ServiceOS",
    description:
      "ServiceTitan alternatives that won't break the bank — features, pricing, and which is right for small and mid-size service businesses.",
    url: "https://serviceos.com/servicetitan-alternatives",
    siteName: "ServiceOS",
    type: "article",
  },
  robots: { index: true, follow: true },
};

const comparisonRows: { feature: string; serviceos: string; competitor: string }[] = [
  { feature: "Starting price", serviceos: "Free tier available", competitor: "$300+/mo (custom)" },
  { feature: "Setup time", serviceos: "Under 30 minutes", competitor: "Weeks to months" },
  { feature: "Best for business size", serviceos: "Solo → 50 techs", competitor: "20+ techs, large ops" },
  { feature: "WhatsApp integration", serviceos: "Native, first-class", competitor: "Not native" },
  { feature: "Mobile app", serviceos: "PWA (offline)", competitor: "Native iOS/Android" },
  { feature: "Software complexity", serviceos: "Simple, guided", competitor: "Enterprise, complex" },
  { feature: "Onboarding", serviceos: "Self-serve wizard", competitor: "Dedicated implementation" },
  { feature: "Free trial", serviceos: "Yes, no credit card", competitor: "Limited demo only" },
  { feature: "Multi-currency", serviceos: "Yes, built in", competitor: "USD-centric" },
  { feature: "Best-fit market", serviceos: "Global, WhatsApp-first", competitor: "US large contractors" },
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
    name: "ServiceOS",
    bestFor: "Small & mid-size service businesses, especially outside the US",
    pricing: "Free tier → paid plans",
    url: "https://serviceos.com",
    description:
      "A modern, WhatsApp-native FSM built for solo operators up to ~50-technician teams. Transparent pricing, fast setup, and a PWA technician app — without the enterprise complexity or implementation cost.",
    highlight: true,
  },
  {
    position: 2,
    name: "Jobber",
    bestFor: "Small North American service businesses",
    pricing: "$49–$199/mo",
    url: "https://getjobber.com",
    description:
      "The most popular ServiceTitan alternative for small teams. Strong scheduling, invoicing, and a polished mobile app at a fraction of ServiceTitan's price.",
  },
  {
    position: 3,
    name: "Housecall Pro",
    bestFor: "US home service businesses (HVAC, plumbing, cleaning)",
    pricing: "$49–$200/mo",
    url: "https://housecallpro.com",
    description:
      "A direct small-business competitor to ServiceTitan with strong dispatch, invoicing, and a great mobile experience. Better suited to US-based home services than international markets.",
  },
  {
    position: 4,
    name: "FieldEdge",
    bestFor: "Mid-market US trades businesses with office staff",
    pricing: "Custom quote",
    url: "https://fieldedge.com",
    description:
      "Mature FSM positioned between Jobber and ServiceTitan in terms of complexity and price. Good for established mid-size teams that have outgrown entry-level tools.",
  },
  {
    position: 5,
    name: "Workiz",
    bestFor: "Small US service businesses wanting phone + FSM",
    pricing: "$39–$159/mo",
    url: "https://workiz.com",
    description:
      "Combines a built-in VoIP phone system with FSM. A good ServiceTitan alternative for appliance repair, HVAC, and garage door companies that handle inbound calls.",
  },
  {
    position: 6,
    name: "Synchroteam",
    bestFor: "Field teams needing strong route optimization",
    pricing: "$25–$85/user/mo",
    url: "https://synchroteam.com",
    description:
      "Lightweight FSM focused on dispatch, route optimization, and time tracking. Lower complexity than ServiceTitan with a clean international footprint.",
  },
  {
    position: 7,
    name: "Kickserv",
    bestFor: "Small cleaning and handyman businesses on a budget",
    pricing: "$29–$99/mo",
    url: "https://kickserv.com",
    description:
      "Affordable and simple. A good entry-level pick for solo operators or 2–3 person teams that find even Jobber or Housecall Pro too much.",
  },
  {
    position: 8,
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    pricing: "$49–$149/mo",
    url: "https://gorilladesk.com",
    description:
      "Niche FSM tuned for pest control and lawn care — chemical tracking, recurring service plans, and route optimization for high-volume recurring visits.",
  },
];

const switchReasons = [
  {
    icon: BadgeDollarSign,
    title: "Pricing that fits small budgets",
    description:
      "ServiceTitan typically costs $300+ per month and often requires annual contracts and implementation fees. ServiceOS has a free tier and paid plans that scale with usage, not headcount.",
  },
  {
    icon: Clock,
    title: "Setup in days, not months",
    description:
      "ServiceTitan implementations frequently take weeks or months with dedicated project managers. ServiceOS is designed to be live in under 30 minutes — no consultants required.",
  },
  {
    icon: Layers,
    title: "Right-sized feature set",
    description:
      "ServiceTitan's depth is impressive but includes dispatch boards, inventory, payroll, and call tracking most small teams will never use. ServiceOS ships the 20% of features that drive 80% of value.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp-native, not US-only",
    description:
      "ServiceTitan is built for large North American contractors. ServiceOS is built WhatsApp-first for India, LATAM, SEA, and other markets where WhatsApp is how business gets done.",
  },
];

const faqs = [
  {
    question: "How much does ServiceTitan cost?",
    answer:
      "ServiceTitan does not publish public pricing. Based on customer reports and industry data, plans typically start around $300 per month for the smallest tier and scale well into the thousands for larger contractors. Most contracts are annual and include per-technician fees, onboarding costs, and add-on modules. For small or mid-size businesses, that math often does not work — which is why many teams look for ServiceTitan alternatives.",
  },
  {
    question: "Is ServiceTitan too complex for a small business?",
    answer:
      "For most small businesses — yes. ServiceTitan is built for large, multi-dispatcher operations with 20+ technicians, dedicated call centers, and complex inventory needs. A solo operator or 3-technician team will spend more time configuring the tool than running jobs. ServiceOS, Jobber, and Housecall Pro are all better fits for small teams that need core FSM without the enterprise overhead.",
  },
  {
    question: "What's the best ServiceTitan alternative for small businesses?",
    answer:
      "For small service businesses, the strongest ServiceTitan alternatives are ServiceOS, Jobber, and Housecall Pro. ServiceOS is the best choice if WhatsApp is your primary customer channel or you operate outside the US. Jobber is the most popular all-rounder for North American teams. Housecall Pro is a strong pick for US home services. For very small or budget-conscious teams, Kickserv offers a simpler starting point.",
  },
  {
    question: "How long does ServiceTitan implementation take?",
    answer:
      "ServiceTitan implementations typically take 4–12 weeks depending on team size and data complexity, and they often involve a dedicated implementation manager and training sessions. By contrast, ServiceOS is designed to be live in under 30 minutes with a self-serve onboarding wizard. If you need to be operational this week, ServiceTitan is the wrong fit.",
  },
  {
    question: "Can I migrate from ServiceTitan to a smaller platform?",
    answer:
      "Yes, but it requires planning. ServiceTitan allows CSV exports of customers, jobs, and invoices. The challenge is mapping ServiceTitan's deeply nested data structures (locations, equipment, recurring services) to a simpler platform. ServiceOS onboarding support will help you map fields and clean up data at no extra cost for paid plans. Most migrations take 1–3 days depending on data volume.",
  },
  {
    question: "When is ServiceTitan the right choice?",
    answer:
      "ServiceTitan is genuinely the right choice for large, established trades contractors — typically 20+ technicians, multiple dispatchers, dedicated call center, complex inventory, and a need for advanced reporting and integrations with accounting and payroll. If your business matches that profile, ServiceTitan's depth justifies its cost. If you are smaller, simpler, or operate outside the US, the alternatives on this page will serve you better at a fraction of the price.",
  },
];

export default function ServiceTitanAlternativesPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — ServiceTitan Alternative",
    description:
      "WhatsApp-native field service management software and ServiceTitan alternative for small and mid-size service businesses.",
    url: "https://serviceos.com/servicetitan-alternatives",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "Best ServiceTitan Alternatives for Small & Mid-Size Businesses",
    description:
      "A ranked, compared list of the best ServiceTitan alternatives for field service businesses that find ServiceTitan too expensive or complex.",
    url: "https://serviceos.com/servicetitan-alternatives",
    items: alternatives.map((a) => ({
      position: a.position,
      name: a.name,
      url: a.url,
      description: a.description,
    })),
  });

  return (
    <CornerstoneLayout
      activePath="/servicetitan-alternatives"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Compare", url: "https://serviceos.com/jobber-alternatives" },
        { name: "ServiceTitan Alternatives", url: "https://serviceos.com/servicetitan-alternatives" },
      ]}
      additionalSchema={[appSchema, itemListSchema]}
    >
      <CornerstoneHero
        eyebrow="ServiceTitan Alternatives"
        title="ServiceTitan Alternatives That Won't Break the Bank"
        subtitle="ServiceTitan is powerful but expensive and built for large HVAC/plumbing contractors. Here are the best alternatives for small and mid-size service businesses."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Try ServiceOS Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/field-service-software"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Explore ServiceOS
          </Link>
        </div>
      </CornerstoneHero>

      {/* Comparison table */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              ServiceOS vs ServiceTitan — Side-by-Side
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ServiceTitan is built for a very specific customer. Here is how ServiceOS compares
              on the dimensions that matter most to small and mid-size businesses.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Dimension</th>
                  <th className="text-center py-3 px-4 font-semibold text-emerald-700">ServiceOS</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                    ServiceTitan
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 text-foreground font-medium">{row.feature}</td>
                    <td className="text-center py-3 px-4 text-foreground">{row.serviceos}</td>
                    <td className="text-center py-3 px-4 text-muted-foreground">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ContentSection title="Why look for ServiceTitan alternatives?">
        <p>
          ServiceTitan is a remarkable piece of software. For large HVAC, plumbing, and
          electrical contractors with dozens of technicians, dedicated call centers, complex
          inventory, and payroll needs, it is often the right choice. But its strengths are also
          its weaknesses for the majority of service businesses — which are smaller, simpler, and
          more price-sensitive than ServiceTitan&apos;s target customer.
        </p>
        <p>
          The first reason teams look for ServiceTitan alternatives is <strong>price</strong>.
          ServiceTitan does not publish pricing, but customer reports and industry data put the
          smallest plans at roughly $300 per month, with most contracts scaling into the
          thousands once you factor in per-technician fees, onboarding costs, and add-on modules
          like inventory or marketing. For a 5-technician team doing $500K in annual revenue,
          that is a meaningful line item. Most of ServiceTitan&apos;s depth goes unused.
        </p>
        <p>
          The second reason is <strong>complexity and implementation time</strong>. ServiceTitan
          implementations typically take 4–12 weeks with dedicated project managers and training
          sessions. The platform assumes you have a dispatcher, a call center, and inventory
          management as defined processes. A solo operator or a 3-technician team will spend more
          time configuring the tool than running jobs. If you need to be operational this week,
          ServiceTitan is the wrong fit.
        </p>
        <p>
          The third reason is <strong>overkill for small teams</strong>. ServiceTitan ships
          dispatch boards, payroll, call tracking, inventory, marketing automation, and a deep
          reporting suite — all genuinely valuable for large operations, all dead weight for a
          team that just needs to schedule jobs, dispatch technicians, send quotes, and collect
          payments. The alternatives on this page ship the 20% of features that drive 80% of
          value, at a fraction of the cost and complexity.
        </p>
      </ContentSection>

      {/* Why switch reasons grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Why teams switch to ServiceOS from ServiceTitan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four reasons ServiceOS is the most popular right-sized alternative for teams that
              find ServiceTitan too much.
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
              The 8 Best ServiceTitan Alternatives in 2026
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A ranked list of ServiceTitan alternatives — each one a legitimate pick for small
              and mid-size service businesses.
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
            Pricing reflects publicly listed plans as of 2026 and may change. ServiceTitan pricing
            is not published; figures are based on customer reports and industry data.
          </p>
        </div>
      </section>

      {/* When to pick what */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              When to pick which alternative
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A quick decision guide based on your business profile.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Rocket className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Solo or 1–5 techs, fast setup</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick <strong>ServiceOS</strong> or <strong>Jobber</strong>. Both are live in under
                an hour and scale to ~10 techs comfortably.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Building2 className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Mid-market US trades, 10–20 techs</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick <strong>FieldEdge</strong> or <strong>Housecall Pro</strong>. Both have the
                dispatch depth and US-specific compliance you need without ServiceTitan overhead.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Smartphone className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">WhatsApp-first, non-US market</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick <strong>ServiceOS</strong>. It is the only platform on this list built
                WhatsApp-native for India, LATAM, and SEA from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        title="ServiceTitan alternatives — FAQ"
        subtitle="Honest answers to the questions small and mid-size businesses ask when comparing ServiceTitan alternatives."
      />

      <CtaSection
        title="Right-size your FSM stack today"
        subtitle="Free trial, no credit card. Set up in 30 minutes and stop paying for features you don't use."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
