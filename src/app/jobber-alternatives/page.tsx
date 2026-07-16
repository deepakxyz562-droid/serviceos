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
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import {
  getSoftwareApplicationSchema,
  getItemListSchema,
} from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "10 Best Jobber Alternatives in 2026 — Free & Paid | ServiceOS",
  description:
    "Looking for a Jobber alternative? We compare the top 10 Jobber alternatives and competitors for field service businesses — pricing, features, WhatsApp integration, and which is best for your market.",
  keywords: [
    "jobber alternative",
    "jobber alternatives",
    "apps like jobber",
    "jobber competitors",
    "jobber replacement",
  ],
  alternates: { canonical: "https://serviceos.com/jobber-alternatives" },
  openGraph: {
    title: "10 Best Jobber Alternatives in 2026 | ServiceOS",
    description:
      "Compare the top 10 Jobber alternatives — features, pricing, WhatsApp integration, and which fits your field service business.",
    url: "https://serviceos.com/jobber-alternatives",
    siteName: "ServiceOS",
    type: "article",
  },
  robots: { index: true, follow: true },
};

// ─── ServiceOS vs Jobber comparison rows ────────────────────────────────────
const comparisonRows: { feature: string; serviceos: boolean; competitor: boolean }[] = [
  { feature: "WhatsApp-native customer messaging", serviceos: true, competitor: false },
  { feature: "Transparent, public pricing", serviceos: true, competitor: false },
  { feature: "Offline-capable technician app (PWA)", serviceos: true, competitor: true },
  { feature: "Free invoice generator (no signup)", serviceos: true, competitor: false },
  { feature: "Setup time under 30 minutes", serviceos: true, competitor: false },
  { feature: "Built for India / LATAM / SEA markets", serviceos: true, competitor: false },
  { feature: "Multi-currency & multi-language", serviceos: true, competitor: true },
  { feature: "Mobile-first PWA (no app store install)", serviceos: true, competitor: false },
  { feature: "Free plan for solo operators", serviceos: true, competitor: false },
  { feature: "Pay-as-you-go WhatsApp credits", serviceos: true, competitor: false },
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
    name: "ServiceOS",
    bestFor: "WhatsApp-first service businesses in India, LATAM & SEA",
    pricing: "Free tier → paid plans",
    url: "https://serviceos.com",
    description:
      "A modern, WhatsApp-native field service platform built for non-US markets. PWA technician app, free invoice generator, multi-currency, and transparent pricing without per-user surprises.",
    highlight: true,
  },
  {
    position: 2,
    name: "Housecall Pro",
    bestFor: "US home service businesses (HVAC, plumbing, cleaning)",
    pricing: "$49–$200/mo",
    url: "https://housecallpro.com",
    description:
      "A popular all-in-one FSM for US home services with strong dispatch, invoicing, and a polished mobile app. Less suited for WhatsApp-heavy markets.",
  },
  {
    position: 3,
    name: "ServiceTitan",
    bestFor: "Large HVAC/plumbing contractors (10+ techs)",
    pricing: "Custom (typically $300+/mo)",
    url: "https://servicetitan.com",
    description:
      "Enterprise-grade FSM built for large trades contractors. Powerful but expensive and complex — overkill for solo or small teams.",
  },
  {
    position: 4,
    name: "FieldEdge",
    bestFor: "Established US trades businesses with office staff",
    pricing: "Custom quote",
    url: "https://fieldedge.com",
    description:
      "Veteran FSM with strong dispatch, customer history, and reporting. Built for US-based mid-market service companies with dedicated dispatchers.",
  },
  {
    position: 5,
    name: "Workiz",
    bestFor: "Small US service businesses wanting phone + FSM",
    pricing: "$39–$159/mo",
    url: "https://workiz.com",
    description:
      "Combines a VoIP phone system with field service management. Good for small teams that handle inbound calls as their primary lead channel.",
  },
  {
    position: 6,
    name: "Jobber",
    bestFor: "North American small service businesses (the benchmark)",
    pricing: "$49–$199/mo",
    url: "https://getjobber.com",
    description:
      "The benchmark we are comparing against. Strong scheduling, good mobile app, large ecosystem — but no native WhatsApp, US-centric, and per-user pricing adds up.",
  },
  {
    position: 7,
    name: "Kickserv",
    bestFor: "Small cleaning/handyman businesses on a budget",
    pricing: "$29–$99/mo",
    url: "https://kickserv.com",
    description:
      "Affordable FSM with simple scheduling and invoicing. Lighter on features than Jobber, but easier to learn and cheaper for solo operators.",
  },
  {
    position: 8,
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    pricing: "$49–$149/mo",
    url: "https://gorilladesk.com",
    description:
      "Niche FSM tuned for pest control and lawn care with route optimization, chemical tracking, and recurring service plans.",
  },
  {
    position: 9,
    name: "Synchroteam",
    bestFor: "Field teams needing strong route optimization",
    pricing: "$25–$85/user/mo",
    url: "https://synchroteam.com",
    description:
      "Field service software with a focus on route optimization, time tracking, and a clean mobile app. Good international footprint but limited WhatsApp support.",
  },
  {
    position: 10,
    name: "Innovia",
    bestFor: "SMBs looking for an affordable all-in-one",
    pricing: "Custom quote",
    url: "https://innovia.com",
    description:
      "An emerging FSM challenger with strong scheduling, invoicing, and CRM. Pricing and onboarding are tailored per customer.",
  },
];

// ─── Why switch feature highlights ──────────────────────────────────────────
const switchReasons = [
  {
    icon: BadgeDollarSign,
    title: "Pricing transparency",
    description:
      "Jobber's per-user pricing adds up quickly. ServiceOS publishes pricing openly and includes a free tier for solo operators — no surprises on renewal.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp-first",
    description:
      "If your customers live on WhatsApp — most of the world does — ServiceOS treats WhatsApp as the primary channel, not an afterthought via third-party Zapier zaps.",
  },
  {
    icon: Globe,
    title: "Built for non-US markets",
    description:
      "Multi-currency, multi-language, and a UX designed for India, LATAM, SEA and Africa. Jobber is excellent, but it is unambiguously built for North America.",
  },
  {
    icon: Smartphone,
    title: "Modern PWA, no app store",
    description:
      "ServiceOS is a progressive web app. Technicians install it in one tap, work offline, and you never deal with iOS App Store updates again.",
  },
];

const faqs = [
  {
    question: "Is ServiceOS cheaper than Jobber?",
    answer:
      "For most small teams — yes. Jobber starts around $49/mo and scales per user, which means a 5-technician team can easily pay $150+/mo. ServiceOS has a free tier for solo operators and paid plans that scale with usage, not headcount. We also publish pricing openly so you know what you will pay next year, not just this month.",
  },
  {
    question: "Does ServiceOS have WhatsApp integration?",
    answer:
      "Yes — WhatsApp is a first-class channel, not a bolt-on. You can send quotes, job updates, invoices, and payment links directly through WhatsApp, and customer replies automatically thread into the right conversation inside ServiceOS. This is the single biggest reason field service businesses in India, Latin America, and Southeast Asia switch from Jobber to ServiceOS.",
  },
  {
    question: "Can I migrate from Jobber to ServiceOS?",
    answer:
      "Yes. You can export your customers, jobs, and invoices from Jobber as CSV files and import them into ServiceOS. Most small businesses complete the migration in under an hour. For larger teams, our support team will help you map fields and clean up data at no extra cost during onboarding.",
  },
  {
    question: "Is there a free Jobber alternative?",
    answer:
      "Yes — ServiceOS offers a free tier designed for solo operators and very small teams. You get scheduling, invoicing, customer CRM, and a limited number of WhatsApp messages per month. There are no time limits and no credit card required to start. When you grow, you upgrade on your terms.",
  },
  {
    question: "What's the best Jobber alternative for small businesses?",
    answer:
      "For small service businesses (1–5 technicians), the two strongest Jobber alternatives are ServiceOS and Kickserv. ServiceOS is better if WhatsApp is a primary customer channel or you operate outside North America. Kickserv is a good budget pick for US-based solo operators who want simple scheduling and invoicing. Housecall Pro is also popular for US home services, but pricing ramps quickly.",
  },
  {
    question: "What's the best Jobber alternative for India?",
    answer:
      "ServiceOS is purpose-built for the Indian market. It supports UPI and rupee invoicing, WhatsApp business messaging (which is how most Indian customers communicate), multi-language workflows, and Indian GST tax handling. Jobber does not natively support WhatsApp or Indian payment rails, which is why most Indian service businesses find ServiceOS a better operational fit.",
  },
];

export default function JobberAlternativesPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Jobber Alternative",
    description:
      "WhatsApp-native field service management software and Jobber alternative for India, LATAM, and SEA service businesses.",
    url: "https://serviceos.com/jobber-alternatives",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "10 Best Jobber Alternatives in 2026",
    description:
      "A ranked, compared list of the top 10 Jobber alternatives and competitors for field service businesses.",
    url: "https://serviceos.com/jobber-alternatives",
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
        { name: "Home", url: "https://serviceos.com" },
        { name: "Compare", url: "https://serviceos.com/jobber-alternatives" },
        { name: "Jobber Alternatives", url: "https://serviceos.com/jobber-alternatives" },
      ]}
      additionalSchema={[appSchema, itemListSchema]}
    >
      <CornerstoneHero
        eyebrow="Jobber Alternatives"
        title="Looking for a Jobber Alternative? Here Are the 10 Best Options in 2026"
        subtitle="Whether Jobber is too expensive, too complex, or missing WhatsApp integration, we compare the top 10 Jobber alternatives for field service businesses — including ServiceOS."
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
              ServiceOS vs Jobber — Feature Comparison
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The features that matter most when choosing between ServiceOS and Jobber, side by side.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-emerald-700">ServiceOS</th>
                  <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Jobber</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 text-foreground">{row.feature}</td>
                    <td className="text-center py-3 px-4">
                      {row.serviceos ? (
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
          The second reason is <strong>WhatsApp</strong>. In most of the world, WhatsApp is how
          customers communicate with businesses. Jobber does not have native WhatsApp support —
          you need third-party integrations like Zapier, which are brittle and add cost. If 80% of
          your customers prefer WhatsApp over email or SMS, that gap becomes a deal-breaker.
          ServiceOS was built WhatsApp-first, so quotes, job updates, invoices, and payment links
          all flow through WhatsApp natively.
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
              Why teams switch to ServiceOS from Jobber
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four concrete reasons ServiceOS has become the most-switched-to Jobber alternative
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

      {/* What ServiceOS gets right mini-section */}
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
                and let ServiceOS handle conversions and tax labels.
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

      <CtaSection
        title="Switch from Jobber to ServiceOS this week"
        subtitle="Migrate your customers and jobs in under an hour. Free trial, no credit card, cancel anytime."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
