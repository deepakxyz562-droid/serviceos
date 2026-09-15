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
  title: "Best ServiceTitan Alternatives for Small & Mid-Size Businesses | Fieseros",
  description:
    "ServiceTitan is powerful but expensive and built for large contractors. Compare the best ServiceTitan alternatives for small and mid-size field service businesses.",
  keywords: [
    "servicetitan alternative",
    "servicetitan alternatives",
    "apps like servicetitan",
    "servicetitan competitors",
  ],
  alternates: { canonical: "https://fieseros.com/servicetitan-alternatives" },
  openGraph: {
    title: "Best ServiceTitan Alternatives in 2026 | Fieseros",
    description:
      "ServiceTitan alternatives that won't break the bank — features, pricing, and which is right for small and mid-size service businesses.",
    url: "https://fieseros.com/servicetitan-alternatives",
    siteName: "Fieseros",
    type: "article",
  },
  robots: { index: true, follow: true },
};

const comparisonRows: { feature: string; fieseros: string; competitor: string }[] = [
  { feature: "24/7 Voice AI Receptionist", fieseros: "Native, 24/7 autonomous phone lead booking", competitor: "Optional add-on / third-party call center" },
  { feature: "Starting Price", fieseros: "Free trial, from $29/mo (no per-seat penalties)", competitor: "Custom contracts ($1,000s/mo + seat fees)" },
  { feature: "Implementation Time", fieseros: "Under 30 minutes self-serve setup", competitor: "3–6 month mandatory onboarding" },
  { feature: "Target Business Size", fieseros: "Solo operators up to 50+ technicians", competitor: "25+ techs, large multi-location enterprises" },
  { feature: "Sales Pipeline & Kanban", fieseros: "Visual drag-and-drop Lead → Quote → Job", competitor: "Complex nested enterprise pipeline" },
  { feature: "Dispatch & Live GPS Map", fieseros: "Live Mapbox/Leaflet GPS + Route Optimizer", competitor: "Heavy desktop-only dispatch board" },
  { feature: "Mobile Experience", fieseros: "Lightweight offline PWA (1-tap install)", competitor: "Heavy native app requiring extensive training" },
  { feature: "Dynamic Checklists & Forms", fieseros: "Drag-and-drop builder with auto-attach rules", competitor: "Configurable enterprise forms" },
  { feature: "Equipment & Warranty Logs", fieseros: "Included in customer 360° profile", competitor: "Included (enterprise asset management)" },
  { feature: "Local Marketplace & SEO Leads", fieseros: "Built-in contractor directory & review engine", competitor: "Not included (requires outside marketing agency)" },
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
    bestFor: "Growing trade contractors wanting enterprise power without enterprise cost",
    pricing: "Free trial → from $29/mo",
    url: "https://fieseros.com",
    description:
      "A fast, modern alternative to ServiceTitan: 24/7 Voice AI Receptionist, live GPS dispatch, technician mobile PWA, interactive Good/Better/Best estimates, automated invoicing, job costing, and local marketplace lead generation — live in 30 minutes.",
    highlight: true,
  },
  {
    position: 2,
    name: "Jobber",
    bestFor: "Small service businesses wanting simple job workflows",
    pricing: "$49–$199+/mo",
    url: "https://getjobber.com",
    description:
      "The most popular ServiceTitan alternative for small teams. Strong scheduling, invoicing, and a polished mobile app at a fraction of ServiceTitan's price.",
  },
  {
    position: 3,
    name: "Housecall Pro",
    bestFor: "Mid-size US home service businesses (HVAC, plumbing, electrical)",
    pricing: "$49–$200+/mo",
    url: "https://housecallpro.com",
    description:
      "A direct mid-market competitor to ServiceTitan with strong dispatch, invoicing, marketing tools, and a great mobile experience.",
  },
  {
    position: 4,
    name: "FieldEdge",
    bestFor: "Mid-market US trades businesses with office staff",
    pricing: "Custom quote",
    url: "https://fieldedge.com",
    description:
      "Mature FSM positioned between Jobber and ServiceTitan in terms of complexity and price. Good for established mid-size teams with dedicated dispatchers.",
  },
  {
    position: 5,
    name: "Workiz",
    bestFor: "Small service businesses wanting integrated VoIP telephony + FSM",
    pricing: "$39–$159/mo",
    url: "https://workiz.com",
    description:
      "Combines a built-in VoIP phone system with FSM. A good ServiceTitan alternative for appliance repair, locksmiths, and garage door companies.",
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
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    pricing: "$49–$149/mo",
    url: "https://gorilladesk.com",
    description:
      "Niche FSM tuned for pest control and lawn care — chemical tracking, recurring service plans, and route optimization for high-volume recurring visits.",
  },
  {
    position: 8,
    name: "Kickserv",
    bestFor: "Small cleaning and handyman businesses on a budget",
    pricing: "$29–$99/mo",
    url: "https://kickserv.com",
    description:
      "Affordable and simple. A good entry-level pick for solo operators or 2–3 person teams looking for basic scheduling without enterprise bloat.",
  },
];

const switchReasons = [
  {
    icon: BadgeDollarSign,
    title: "Predictable, Affordable SaaS Pricing",
    description:
      "ServiceTitan locks businesses into expensive annual contracts ($1,000s/mo) plus hefty implementation fees. Fieseros offers transparent monthly tiers starting at $29/mo with zero mandatory onboarding fees.",
  },
  {
    icon: Clock,
    title: "Live in 30 Minutes, Not 6 Months",
    description:
      "ServiceTitan implementations frequently take 3–6 months with mandatory training consultants. Fieseros is designed to be fully operational in under 30 minutes with an intuitive self-serve wizard.",
  },
  {
    icon: Layers,
    title: "Enterprise Power Without the Bloat",
    description:
      "Get the critical tools that actually grow your revenue: 24/7 Voice AI Receptionist, live GPS dispatch, interactive Good/Better/Best quotes, technician mobile app, and automated Google review requests.",
  },
  {
    icon: MessageSquare,
    title: "Autonomous 24/7 Voice AI Lead Booking",
    description:
      "Never miss emergency service calls while technicians are on the roof or in the crawlspace. Fieseros answers inbound calls 24/7 and books appointments straight into your schedule.",
  },
];

const faqs = [
  {
    question: "Why do contractors choose Fieseros over ServiceTitan?",
    answer:
      "Contractors choose Fieseros because it provides modern, AI-powered field service management without the astronomical cost and multi-month implementation overhead of ServiceTitan. With Fieseros, you get an autonomous 24/7 Voice AI Receptionist, live GPS dispatch map, mobile technician PWA, interactive Good/Better/Best estimates, automated invoicing, and a local marketplace lead engine starting at $29/mo.",
  },
  {
    question: "How much does ServiceTitan cost compared to Fieseros?",
    answer:
      "ServiceTitan does not publish public pricing, but contracts typically start at $500–$2,000+/month with multi-thousand dollar onboarding fees and multi-year contract commitments. Fieseros publishes pricing transparently starting at $29/month with no setup fees and month-to-month flexibility.",
  },
  {
    question: "Is ServiceTitan too complex for a growing service business?",
    answer:
      "For most businesses with under 25–50 technicians, yes. ServiceTitan is designed for large enterprise organizations with dedicated IT staff, dispatch coordinators, and call centers. Smaller teams often spend more time navigating complex menus than servicing customers. Fieseros delivers the core power you need in a fast, clean interface.",
  },
  {
    question: "How long does it take to switch to Fieseros?",
    answer:
      "While ServiceTitan onboarding takes 3–6 months, you can set up Fieseros in under 30 minutes. Import your customer contacts and service catalogs via CSV, configure your branding, activate your 24/7 AI Receptionist phone line, and start booking jobs immediately.",
  },
  {
    question: "When is ServiceTitan the right choice?",
    answer:
      "ServiceTitan is best suited for large commercial contractors with 50+ trucks, dedicated in-house call centers, complex enterprise inventory warehouses, and massive accounting departments. For 1–50 technician businesses, Fieseros offers a far more modern, agile, and cost-effective operational engine.",
  },
];

export default function ServiceTitanAlternativesPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "Fieseros — ServiceTitan Alternative",
    description:
      "Email & SMS-native field service management software and ServiceTitan alternative for small and mid-size service businesses.",
    url: "https://fieseros.com/servicetitan-alternatives",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "Best ServiceTitan Alternatives for Small & Mid-Size Businesses",
    description:
      "A ranked, compared list of the best ServiceTitan alternatives for field service businesses that find ServiceTitan too expensive or complex.",
    url: "https://fieseros.com/servicetitan-alternatives",
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
        { name: "Home", url: "https://fieseros.com" },
        { name: "Compare", url: "https://fieseros.com/jobber-alternatives" },
        { name: "ServiceTitan Alternatives", url: "https://fieseros.com/servicetitan-alternatives" },
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
              Fieseros vs ServiceTitan — Side-by-Side
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              ServiceTitan is built for a very specific customer. Here is how Fieseros compares
              on the dimensions that matter most to small and mid-size businesses.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Dimension</th>
                  <th className="text-center py-3 px-4 font-semibold text-emerald-700">Fieseros</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                    ServiceTitan
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 text-foreground font-medium">{row.feature}</td>
                    <td className="text-center py-3 px-4 text-foreground">{row.fieseros}</td>
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
          ServiceTitan does not publish pricing, but plans are negotiated per contract and
          typically scale with team size, onboarding scope, and add-on modules like inventory
          or marketing. For a 5-technician team doing $500K in annual revenue,
          that is a meaningful line item. Most of ServiceTitan&apos;s depth goes unused.
        </p>
        <p>
          The second reason is <strong>complexity and implementation time</strong>. ServiceTitan
          implementations typically require longer onboarding with dedicated project managers
          and training sessions. The platform assumes you have a dispatcher, a call center, and
          inventory management as defined processes. A solo operator or a 3-technician team will
          spend more time configuring the tool than running jobs. If you need to be operational
          this week, ServiceTitan is the wrong fit.
        </p>
        <p>
          The third reason is <strong>overkill for small teams</strong>. ServiceTitan ships
          dispatch boards, payroll, call tracking, inventory, marketing automation, and a deep
          reporting suite — all genuinely valuable for large operations, all dead weight for a
          team that just needs to schedule jobs, dispatch technicians, send quotes, and collect
          payments. The alternatives on this page ship the core features that drive most of
          the value, at a fraction of the cost and complexity.
        </p>
      </ContentSection>

      {/* Why switch reasons grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Why teams switch to Fieseros from ServiceTitan
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four reasons Fieseros is the most popular right-sized alternative for teams that
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
                Pick <strong>Fieseros</strong> or <strong>Jobber</strong>. Both are live in under
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
              <h3 className="font-semibold text-foreground mb-2">Multi-channel, non-US market</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick <strong>Fieseros</strong>. It is the only platform on this list built
                Email & SMS-native for India, LATAM, and SEA from day one.
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
            <Link href="/housecall-pro-alternatives" className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-md">
              <Star className="h-6 w-6 text-emerald-600 mb-3" />
              <h3 className="font-semibold text-foreground group-hover:text-emerald-700 mb-1">Housecall Pro Alternatives</h3>
              <p className="text-sm text-muted-foreground">Best Housecall Pro alternatives for service teams.</p>
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
        title="Right-size your FSM stack today"
        subtitle="Free trial, no credit card. Set up in 30 minutes and stop paying for features you don't use."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
      <p className="text-xs text-muted-foreground text-center py-6 max-w-2xl mx-auto">
        Competitor features and pricing verified as of August 2025. Check vendor websites for the most current information.
      </p>
    </CornerstoneLayout>
  );
}
