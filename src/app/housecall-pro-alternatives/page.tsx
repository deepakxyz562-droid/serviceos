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
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import {
  getSoftwareApplicationSchema,
  getItemListSchema,
} from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "Best Housecall Pro Alternatives in 2026 — Compared | ServiceOS",
  description:
    "Comparing the 8 best Housecall Pro alternatives for field service businesses — pricing, WhatsApp integration, mobile apps, and which is right for your team. Includes ServiceOS.",
  keywords: [
    "housecall pro alternative",
    "housecall pro alternatives",
    "apps like housecall pro",
    "housecall pro competitors",
  ],
  alternates: { canonical: "https://serviceos.com/housecall-pro-alternatives" },
  openGraph: {
    title: "Best Housecall Pro Alternatives in 2026 | ServiceOS",
    description:
      "Compare the top 8 Housecall Pro alternatives — features, pricing, WhatsApp integration, and which fits your field service business.",
    url: "https://serviceos.com/housecall-pro-alternatives",
    siteName: "ServiceOS",
    type: "article",
  },
  robots: { index: true, follow: true },
};

const comparisonRows: { feature: string; serviceos: boolean; competitor: boolean }[] = [
  { feature: "WhatsApp-native customer messaging", serviceos: true, competitor: false },
  { feature: "Public, transparent pricing", serviceos: true, competitor: false },
  { feature: "Free tier for solo operators", serviceos: true, competitor: false },
  { feature: "PWA technician app (no app store)", serviceos: true, competitor: false },
  { feature: "Native iOS & Android apps", serviceos: true, competitor: true },
  { feature: "Built for non-US markets (India, LATAM, SEA)", serviceos: true, competitor: false },
  { feature: "Multi-currency invoicing", serviceos: true, competitor: true },
  { feature: "Customizable workflows & forms", serviceos: true, competitor: true },
  { feature: "Setup in under 30 minutes", serviceos: true, competitor: false },
  { feature: "Pay-as-you-go messaging credits", serviceos: true, competitor: false },
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
    bestFor: "WhatsApp-first service businesses outside the US",
    pricing: "Free tier → paid plans",
    url: "https://serviceos.com",
    description:
      "A modern WhatsApp-native FSM built for India, LATAM, and SEA. Transparent pricing, free tier, PWA technician app, and multi-currency support without the per-seat pricing surprises.",
    highlight: true,
  },
  {
    position: 2,
    name: "Jobber",
    bestFor: "North American small service businesses",
    pricing: "$49–$199/mo",
    url: "https://getjobber.com",
    description:
      "The closest direct competitor to Housecall Pro. Strong scheduling, polished mobile app, and a large ecosystem. Like Housecall Pro, it is US-centric and lacks native WhatsApp.",
  },
  {
    position: 3,
    name: "ServiceTitan",
    bestFor: "Large HVAC & plumbing contractors (10+ techs)",
    pricing: "Custom (typically $300+/mo)",
    url: "https://servicetitan.com",
    description:
      "Enterprise-grade FSM with deep feature set for large trades contractors. Powerful, but expensive and complex — usually overkill for small teams leaving Housecall Pro.",
  },
  {
    position: 4,
    name: "FieldEdge",
    bestFor: "Established US mid-market service companies",
    pricing: "Custom quote",
    url: "https://fieldedge.com",
    description:
      "Mature FSM with strong dispatch, customer history, and reporting. A solid Housecall Pro alternative if you have dedicated dispatchers and want white-glove onboarding.",
  },
  {
    position: 5,
    name: "Workiz",
    bestFor: "Small US service businesses that need VoIP + FSM",
    pricing: "$39–$159/mo",
    url: "https://workiz.com",
    description:
      "Combines a built-in VoIP phone system with field service management. A great pick if inbound phone calls are your primary lead channel and you want everything in one tool.",
  },
  {
    position: 6,
    name: "Synchroteam",
    bestFor: "Field teams needing strong route optimization",
    pricing: "$25–$85/user/mo",
    url: "https://synchroteam.com",
    description:
      "Lightweight FSM with excellent route optimization and a clean mobile app. Good international footprint, though WhatsApp support is limited.",
  },
  {
    position: 7,
    name: "Kickserv",
    bestFor: "Solo operators and small cleaning/handyman teams",
    pricing: "$29–$99/mo",
    url: "https://kickserv.com",
    description:
      "Affordable, simple scheduling and invoicing. Easier to learn than Housecall Pro and a good budget pick for very small teams that don't need the full feature set.",
  },
  {
    position: 8,
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    pricing: "$49–$149/mo",
    url: "https://gorilladesk.com",
    description:
      "Niche FSM tuned for pest control and lawn care — chemical tracking, recurring service plans, and route optimization built for high-volume recurring visits.",
  },
];

const switchReasons = [
  {
    icon: BadgeDollarSign,
    title: "Pricing that doesn't creep up",
    description:
      "Housecall Pro's plan tiers and add-ons can quietly escalate as you grow. ServiceOS publishes pricing openly, with a real free tier and predictable per-usage WhatsApp credits.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp is the default channel",
    description:
      "If your customers prefer WhatsApp over email or phone — which is most of the world — ServiceOS treats WhatsApp as the primary channel. Housecall Pro does not.",
  },
  {
    icon: Globe,
    title: "Built for non-US markets",
    description:
      "Housecall Pro is purpose-built for American home services. ServiceOS is built for India, LATAM, SEA, and other WhatsApp-first markets with multi-currency, multi-language, and local payment rails.",
  },
  {
    icon: SlidersHorizontal,
    title: "Customizable without consultants",
    description:
      "Housecall Pro customization often requires support tickets or third-party consultants. ServiceOS workflows, forms, and templates are editable in-product by any admin.",
  },
];

const faqs = [
  {
    question: "Is ServiceOS cheaper than Housecall Pro?",
    answer:
      "For most teams operating outside the US, yes. Housecall Pro starts at $49/mo and pricing increases with seats and add-ons. ServiceOS offers a free tier for solo operators and paid plans that scale with usage rather than headcount. We also publish pricing openly, so there are no surprise increases at renewal.",
  },
  {
    question: "Can I migrate my customers from Housecall Pro to ServiceOS?",
    answer:
      "Yes. Export your customer list, job history, and invoices from Housecall Pro as CSV files, then import them into ServiceOS. Most small businesses finish the migration in under an hour. Our onboarding team will help map custom fields and clean up data free of charge for paid plans.",
  },
  {
    question: "Why is WhatsApp integration a big deal?",
    answer:
      "In most of the world — India, Latin America, Southeast Asia, Africa, the Middle East — WhatsApp is how customers communicate with businesses. If 80% of your customers prefer WhatsApp over email or phone, a tool that doesn't support it natively forces you to juggle two systems. ServiceOS treats WhatsApp as the primary channel for quotes, updates, invoices, and payment links.",
  },
  {
    question: "What's the best Housecall Pro alternative for small US businesses?",
    answer:
      "For US-based small service businesses, Jobber and Workiz are the strongest Housecall Pro alternatives. Jobber has the closest feature parity and a polished mobile app. Workiz is a great pick if you want a built-in VoIP phone system. Kickserv is the most affordable option for solo operators. ServiceOS is the better choice if WhatsApp is your primary customer channel or you operate outside the US.",
  },
  {
    question: "Does ServiceOS have a mobile app like Housecall Pro?",
    answer:
      "Yes, but it is a progressive web app (PWA) rather than a native iOS/Android app. Technicians install it in one tap from the browser, it works offline in the field, and updates ship instantly without app store review delays. Most field teams find PWA more convenient than managing native app updates across dozens of technician phones.",
  },
  {
    question: "Is Housecall Pro still a good choice in 2026?",
    answer:
      "Absolutely. Housecall Pro remains one of the best FSM platforms for US-based home service businesses. It has a mature feature set, strong customer support, and a large ecosystem. The reasons to switch are usually market fit (you operate outside the US), pricing (you are bumping into plan limits), or WhatsApp (your customers live on WhatsApp). If none of those apply, Housecall Pro is genuinely a good product.",
  },
];

export default function HousecallProAlternativesPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Housecall Pro Alternative",
    description:
      "WhatsApp-native field service management software and Housecall Pro alternative for India, LATAM, and SEA service businesses.",
    url: "https://serviceos.com/housecall-pro-alternatives",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "8 Best Housecall Pro Alternatives in 2026",
    description:
      "A ranked, compared list of the top 8 Housecall Pro alternatives and competitors for field service businesses.",
    url: "https://serviceos.com/housecall-pro-alternatives",
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
        { name: "Home", url: "https://serviceos.com" },
        { name: "Compare", url: "https://serviceos.com/jobber-alternatives" },
        { name: "Housecall Pro Alternatives", url: "https://serviceos.com/housecall-pro-alternatives" },
      ]}
      additionalSchema={[appSchema, itemListSchema]}
    >
      <CornerstoneHero
        eyebrow="Housecall Pro Alternatives"
        title="The 8 Best Housecall Pro Alternatives for Field Service Businesses"
        subtitle="Housecall Pro is popular, but it's not the right fit for every business. Compare the top alternatives — including a WhatsApp-first option built for non-US markets."
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
              ServiceOS vs Housecall Pro — Feature Comparison
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The capabilities that matter most when weighing ServiceOS against Housecall Pro.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Feature</th>
                  <th className="text-center py-3 px-4 font-semibold text-emerald-700">ServiceOS</th>
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
          upgrade. ServiceOS publishes pricing openly and scales with usage, not seats, so you
          always know what you will pay next year.
        </p>
        <p>
          The second is <strong>WhatsApp</strong>. Housecall Pro does not have native WhatsApp
          support. If your customers are in India, Brazil, Mexico, Indonesia, or any of the
          dozens of countries where WhatsApp is the dominant messaging channel, you end up
          running Housecall Pro for operations and a separate WhatsApp workflow for customer
          communication — which means data in two places and constant copy-paste. ServiceOS
          treats WhatsApp as the primary channel.
        </p>
        <p>
          The third is <strong>market fit and customization</strong>. Housecall Pro is
          unambiguously built for American home services — its tax templates, payment rails,
          terminology, and onboarding flows reflect that. Businesses operating in multi-currency
          or multi-language environments often find themselves working around the tool.
          Customizing workflows frequently requires support tickets or third-party consultants.
          ServiceOS is built for international markets, with editable workflows, forms, and
          templates that any admin can change in-product.
        </p>
      </ContentSection>

      {/* Why switch reasons grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Why teams switch to ServiceOS from Housecall Pro
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Four reasons ServiceOS is the fastest-growing Housecall Pro alternative for
              WhatsApp-first service businesses.
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

      <CtaSection
        title="Switch from Housecall Pro to ServiceOS"
        subtitle="Free trial, no credit card. Bring your customers and jobs over in under an hour."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
