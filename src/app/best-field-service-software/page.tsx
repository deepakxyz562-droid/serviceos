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
  Smartphone,
  MessageSquare,
  Clock,
  Globe,
  ShieldCheck,
  Award,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import {
  getSoftwareApplicationSchema,
  getItemListSchema,
} from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "10 Best Field Service Software in 2026 — Reviewed & Compared | ServiceOS",
  description:
    "We reviewed 20+ field service platforms and ranked the top 10 based on features, pricing, ease of use, and customer support. See which FSM software is best for your business.",
  keywords: [
    "best field service software",
    "best field service management software",
    "top fsm software",
    "field service software reviews",
  ],
  alternates: { canonical: "https://serviceos.com/best-field-service-software" },
  openGraph: {
    title: "10 Best Field Service Software in 2026 | ServiceOS",
    description:
      "We reviewed 20+ FSM platforms and ranked the top 10 on features, pricing, ease of use, and support. See the full comparison.",
    url: "https://serviceos.com/best-field-service-software",
    siteName: "ServiceOS",
    type: "article",
  },
  robots: { index: true, follow: true },
};

// ─── Top 10 FSM tools (detailed cards) ──────────────────────────────────────
const tools: {
  position: number;
  name: string;
  bestFor: string;
  keyFeatures: string[];
  pricing: string;
  pros: string[];
  cons: string[];
  url: string;
  highlight?: boolean;
}[] = [
  {
    position: 1,
    name: "ServiceOS",
    bestFor: "WhatsApp-first service businesses (India, LATAM, SEA, Africa)",
    keyFeatures: [
      "WhatsApp-native messaging",
      "PWA technician app (offline)",
      "Free invoice generator",
    ],
    pricing: "Free tier → paid plans",
    pros: [
      "Transparent pricing with a real free tier",
      "WhatsApp treated as the primary channel",
      "Set up in under 30 minutes",
    ],
    cons: [
      "Smaller ecosystem than Jobber or Housecall Pro",
      "Less depth on enterprise payroll / call tracking",
    ],
    url: "https://serviceos.com",
    highlight: true,
  },
  {
    position: 2,
    name: "Jobber",
    bestFor: "North American small service businesses (1–10 techs)",
    keyFeatures: [
      "Strong scheduling & dispatch",
      "Polished native mobile app",
      "Large integration ecosystem",
    ],
    pricing: "$49–$199/mo",
    pros: [
      "Mature, well-supported product",
      "Excellent documentation and onboarding",
      "Strong North American market fit",
    ],
    cons: [
      "No native WhatsApp support",
      "Per-user pricing adds up at scale",
      "US-centric workflows",
    ],
    url: "https://getjobber.com",
  },
  {
    position: 3,
    name: "Housecall Pro",
    bestFor: "US home service businesses (HVAC, plumbing, cleaning)",
    keyFeatures: [
      "Dispatch board & real-time tracking",
      "Native iOS/Android apps",
      "Built-in credit card processing",
    ],
    pricing: "$49–$200/mo",
    pros: [
      "Polished mobile experience",
      "Strong US payment integrations",
      "Good marketing automation",
    ],
    cons: [
      "Pricing climbs with seats and add-ons",
      "No native WhatsApp",
      "Limited customization",
    ],
    url: "https://housecallpro.com",
  },
  {
    position: 4,
    name: "ServiceTitan",
    bestFor: "Large HVAC/plumbing contractors (20+ techs)",
    keyFeatures: [
      "Enterprise dispatch & call tracking",
      "Payroll and inventory",
      "Deep reporting suite",
    ],
    pricing: "Custom ($300+/mo typical)",
    pros: [
      "Unmatched depth for large operations",
      "Strong integrations with accounting & payroll",
      "Industry-specific workflows",
    ],
    cons: [
      "Expensive and complex",
      "Long implementation (4–12 weeks)",
      "Overkill for small teams",
    ],
    url: "https://servicetitan.com",
  },
  {
    position: 5,
    name: "FieldEdge",
    bestFor: "Mid-market US trades businesses with office staff",
    keyFeatures: [
      "Mature dispatch & routing",
      "Customer history & CRM",
      "Strong reporting",
    ],
    pricing: "Custom quote",
    pros: [
      "Right-sized for 10–25 tech teams",
      "White-glove onboarding",
      "Strong US support",
    ],
    cons: [
      "Pricing not published",
      "Less modern UX than newer challengers",
      "US-focused",
    ],
    url: "https://fieldedge.com",
  },
  {
    position: 6,
    name: "Workiz",
    bestFor: "Small US service businesses wanting VoIP + FSM",
    keyFeatures: [
      "Built-in VoIP phone system",
      "Job scheduling & invoicing",
      "Inbound call tracking",
    ],
    pricing: "$39–$159/mo",
    pros: [
      "Phone + FSM in one tool",
      "Affordable for small teams",
      "Good for appliance repair & garage doors",
    ],
    cons: [
      "Smaller integration ecosystem",
      "Limited WhatsApp support",
      "US-centric",
    ],
    url: "https://workiz.com",
  },
  {
    position: 7,
    name: "Synchroteam",
    bestFor: "Field teams needing strong route optimization",
    keyFeatures: [
      "Best-in-class route optimization",
      "Time tracking & forms",
      "Clean mobile app",
    ],
    pricing: "$25–$85/user/mo",
    pros: [
      "Excellent routing for high-volume visits",
      "International footprint",
      "Simple, focused UX",
    ],
    cons: [
      "Lighter on invoicing & CRM",
      "Limited WhatsApp",
      "Per-user pricing",
    ],
    url: "https://synchroteam.com",
  },
  {
    position: 8,
    name: "Kickserv",
    bestFor: "Small cleaning/handyman businesses on a budget",
    keyFeatures: [
      "Simple scheduling",
      "Recurring billing",
      "Basic CRM",
    ],
    pricing: "$29–$99/mo",
    pros: [
      "Most affordable option here",
      "Easy to learn",
      "Good for solo operators",
    ],
    cons: [
      "Limited advanced features",
      "Older UX",
      "No WhatsApp",
    ],
    url: "https://kickserv.com",
  },
  {
    position: 9,
    name: "GorillaDesk",
    bestFor: "Pest control & lawn care operators",
    keyFeatures: [
      "Chemical & route tracking",
      "Recurring service plans",
      "Customer portal",
    ],
    pricing: "$49–$149/mo",
    pros: [
      "Purpose-built for pest control",
      "Strong recurring revenue features",
      "Good mobile experience",
    ],
    cons: [
      "Niche — less flexible for other trades",
      "Limited WhatsApp",
      "US/AU/UK focus",
    ],
    url: "https://gorilladesk.com",
  },
  {
    position: 10,
    name: "Innovia",
    bestFor: "SMBs looking for an affordable all-in-one",
    keyFeatures: [
      "Scheduling & dispatch",
      "Invoicing & CRM",
      "Basic reporting",
    ],
    pricing: "Custom quote",
    pros: [
      "Flexible, customizable",
      "Responsive support",
      "Affordable for SMBs",
    ],
    cons: [
      "Smaller ecosystem",
      "Limited public documentation",
      "Newer entrant",
    ],
    url: "https://innovia.com",
  },
];

// ─── Side-by-side comparison matrix ─────────────────────────────────────────
type Cell = string | boolean;
const matrixRows: { label: string; cells: Cell[] }[] = [
  {
    label: "WhatsApp native",
    cells: [true, false, false, false, false, false, false, false, false, false],
  },
  {
    label: "Free trial",
    cells: [true, true, true, false, false, true, true, true, true, false],
  },
  {
    label: "Mobile app",
    cells: ["PWA", "Native", "Native", "Native", "Native", "Native", "Native", "Web", "Native", "Web"],
  },
  {
    label: "Pricing starts at",
    cells: ["Free", "$49/mo", "$49/mo", "$300+/mo", "Custom", "$39/mo", "$25/user/mo", "$29/mo", "$49/mo", "Custom"],
  },
  {
    label: "Best for size",
    cells: ["Solo–50", "Solo–15", "Solo–25", "20+", "10–25", "Solo–10", "Solo–20", "Solo–5", "Solo–15", "Solo–15"],
  },
];

const evaluationCriteria = [
  {
    icon: Award,
    title: "Feature completeness",
    description:
      "Scheduling, dispatch, work orders, CRM, invoicing, mobile app, and reporting — all need to be present and usable, not just checkbox features.",
  },
  {
    icon: BadgeDollarSign,
    title: "Pricing transparency",
    description:
      "Public pricing, a real free tier or trial, and predictable scaling. We penalized tools that hide pricing behind sales calls.",
  },
  {
    icon: Clock,
    title: "Ease of setup",
    description:
      "Time-to-first-job matters. We rewarded platforms that any service business could configure in under an hour without consultants.",
  },
  {
    icon: Smartphone,
    title: "Mobile experience",
    description:
      "Field service lives on phones. We evaluated offline capability, install friction, and whether the technician app was actually usable on a job site.",
  },
  {
    icon: MessageSquare,
    title: "Communication channels",
    description:
      "Native WhatsApp, SMS, and email — not just one channel. We rewarded platforms built for global markets where WhatsApp dominates.",
  },
  {
    icon: ShieldCheck,
    title: "Support & reliability",
    description:
      "Responsive customer support, public documentation, and a track record of uptime. We down-weighted tools with consistently poor support reviews.",
  },
];

const faqs = [
  {
    question: "What is the best field service software in 2026?",
    answer:
      "The honest answer is: it depends on your business. For WhatsApp-first service businesses in India, Latin America, or Southeast Asia, ServiceOS is the best choice. For North American small businesses, Jobber and Housecall Pro are the strongest options. For large HVAC and plumbing contractors with 20+ technicians, ServiceTitan remains the leader. We rank ServiceOS #1 on this list because it serves the largest underserved market — WhatsApp-first businesses outside the US — with a genuinely modern product at a transparent price.",
  },
  {
    question: "How much does field service software cost?",
    answer:
      "FSM software ranges from free (ServiceOS's solo tier) to several thousand dollars per month for enterprise tools like ServiceTitan. Most small business plans fall between $29 and $200 per month. Watch for per-user pricing that compounds as you grow, and for add-on modules that inflate the bill. The best practice is to calculate your total cost at your expected team size in 12 and 24 months — not just the entry-level plan.",
  },
  {
    question: "Is there free field service software?",
    answer:
      "Yes. ServiceOS offers a free tier for solo operators with scheduling, invoicing, CRM, and a limited number of WhatsApp messages per month — no time limit, no credit card required. Kickserv starts at $29/mo, which is the lowest paid tier among mainstream FSM platforms. Truly free FSM tools tend to be limited to a single user with capped jobs, which works for solo operators but not growing teams.",
  },
  {
    question: "What's the best field service software for small businesses?",
    answer:
      "For small businesses (1–5 technicians), the best options are ServiceOS, Jobber, Housecall Pro, and Workiz. ServiceOS wins if WhatsApp is your primary customer channel or you operate outside the US. Jobber is the most popular all-rounder for North American teams. Housecall Pro is strongest for US home services. Workiz is a great pick if you want a built-in VoIP phone system.",
  },
  {
    question: "What's the best field service software for plumbers and HVAC?",
    answer:
      "For solo plumbers and small HVAC shops, ServiceOS, Jobber, and Housecall Pro all work well. For mid-size plumbing and HVAC businesses (10–25 technicians), FieldEdge is a strong pick with mature dispatch and reporting. For large HVAC and plumbing contractors (20+ technicians), ServiceTitan is purpose-built with industry-specific workflows, dispatch boards, and payroll — but the cost and complexity only make sense at that scale.",
  },
  {
    question: "Can I try field service software before I buy?",
    answer:
      "Most FSM platforms offer some form of trial. ServiceOS has a free tier with no time limit and no credit card required. Jobber, Housecall Pro, Workiz, and Synchroteam all offer 14-day trials. ServiceTitan and FieldEdge typically require a sales call before granting access. We strongly recommend trying at least two platforms before committing — the right FSM tool should feel like it fits your workflow, not the other way around.",
  },
];

export default function BestFieldServiceSoftwarePage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS — Best Field Service Software 2026",
    description:
      "ServiceOS ranked #1 in the 2026 review of the best field service management software.",
    url: "https://serviceos.com/best-field-service-software",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  const itemListSchema = getItemListSchema({
    name: "10 Best Field Service Management Software in 2026",
    description:
      "A ranked, reviewed list of the top 10 field service management platforms of 2026 based on features, pricing, ease of use, mobile experience, and support.",
    url: "https://serviceos.com/best-field-service-software",
    items: tools.map((t) => ({
      position: t.position,
      name: t.name,
      url: t.url,
      description: `${t.name} — best for ${t.bestFor}. Pricing: ${t.pricing}.`,
    })),
  });

  return (
    <CornerstoneLayout
      activePath="/best-field-service-software"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Compare", url: "https://serviceos.com/jobber-alternatives" },
        { name: "Best Field Service Software", url: "https://serviceos.com/best-field-service-software" },
      ]}
      additionalSchema={[appSchema, itemListSchema]}
    >
      <CornerstoneHero
        eyebrow="Best Of 2026"
        title="The 10 Best Field Service Management Software in 2026"
        subtitle="We reviewed 20+ field service platforms and ranked the top 10 based on features, pricing, ease of use, and customer support. See which FSM software is best for your business."
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

      <ContentSection title="How we evaluated field service software">
        <p>
          We evaluated 20+ field service management platforms in 2026 against six criteria:
          feature completeness, pricing transparency, ease of setup, mobile experience,
          communication channels, and support reliability. Each tool was scored on a 1–5 scale
          across each dimension, then weighted to produce a final ranking.
        </p>
        <p>
          <strong>Feature completeness</strong> covered scheduling, dispatch, work order
          management, customer CRM, invoicing and payments, technician mobile apps, and reporting.
          Tools that shipped all seven as genuinely usable features scored higher than tools that
          listed them on a marketing page but shipped half-baked versions. <strong>Pricing
          transparency</strong> rewarded platforms that publish pricing openly and offer a real
          free tier or trial; we penalized tools that hide pricing behind sales calls or surprise
          customers with renewal increases.
        </p>
        <p>
          <strong>Ease of setup</strong> measured time-to-first-job — could a non-technical
          service business owner configure the tool and dispatch a real job within an hour?
          Platforms that required implementation consultants or multi-week onboarding lost
          points. <strong>Mobile experience</strong> evaluated offline capability, install
          friction, and real-world usability on a job site — not just app store ratings. We gave
          extra weight to progressive web apps that work without app store installs and function
          offline.
        </p>
        <p>
          <strong>Communication channels</strong> evaluated native support for WhatsApp, SMS, and
          email. We gave significant weight to WhatsApp because in most of the world — India,
          Latin America, Southeast Asia, Africa, the Middle East — WhatsApp is the primary way
          customers communicate with service businesses. Tools without native WhatsApp scored
          lower for non-US markets. Finally, <strong>support and reliability</strong> looked at
          responsive customer support, public documentation, and uptime track records. Tools
          with consistently poor support reviews lost points regardless of feature set.
        </p>
      </ContentSection>

      {/* Evaluation criteria grid */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The 6 criteria we scored every platform on
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A transparent look at how the rankings were decided — no black box.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {evaluationCriteria.map((c) => (
              <div key={c.title} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 mb-3">
                  <c.icon className="h-5 w-5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top 10 detailed cards */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              The 10 best field service software of 2026
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Ranked, reviewed, and compared. Each entry includes pros, cons, and the customer
              profile it fits best.
            </p>
          </div>
          <div className="space-y-4">
            {tools.map((t) => (
              <div
                key={t.position}
                className={`rounded-xl border p-5 sm:p-6 shadow-sm transition-shadow hover:shadow-md ${
                  t.highlight ? "border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10" : "bg-card"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1 sm:min-w-[64px]">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        t.position === 1
                          ? "bg-emerald-600 text-white"
                          : t.position <= 3
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40"
                            : "bg-muted text-foreground"
                      }`}
                      aria-hidden="true"
                    >
                      {t.position === 1 ? <Trophy className="h-5 w-5" /> : t.position}
                    </span>
                    {t.position === 1 && (
                      <span className="text-xs font-semibold text-emerald-700 hidden sm:block">
                        Best overall
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-lg font-bold text-foreground">{t.name}</h3>
                      {t.highlight && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          <Star className="h-3 w-3" /> Top pick
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      <span className="font-medium text-foreground">Best for:</span> {t.bestFor}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                          Key features
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {t.keyFeatures.map((f) => (
                            <li key={f} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1.5">
                          Pros &amp; cons
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {t.pros.map((p) => (
                            <li key={`pro-${p}`} className="flex items-start gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                              {p}
                            </li>
                          ))}
                          {t.cons.map((c) => (
                            <li key={`con-${c}`} className="flex items-start gap-1.5">
                              <X className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        Pricing: <span className="text-foreground font-medium">{t.pricing}</span>
                      </span>
                    </div>
                  </div>
                  <div className="sm:ml-2 shrink-0">
                    {t.highlight ? (
                      <Link
                        href="/#signup"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
                      >
                        Start Free
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <a
                        href={t.url}
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
            Rankings reflect 2026 evaluation as of publication. Pricing reflects publicly listed
            plans and may change. ServiceTitan and FieldEdge pricing is based on customer reports
            and industry data since they do not publish public pricing.
          </p>
        </div>
      </section>

      {/* All 10 side-by-side comparison matrix */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              All 10 tools compared side by side
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The five dimensions that matter most when comparing FSM platforms.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground sticky left-0 bg-muted/50">
                    Dimension
                  </th>
                  {tools.map((t) => (
                    <th
                      key={t.name}
                      className={`text-center py-3 px-3 font-semibold ${
                        t.highlight ? "text-emerald-700" : "text-foreground"
                      }`}
                    >
                      <span className="text-xs text-muted-foreground font-normal block mb-0.5">
                        #{t.position}
                      </span>
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-3 px-4 text-foreground font-medium sticky left-0 bg-card">
                      {row.label}
                    </td>
                    {row.cells.map((cell, j) => (
                      <td
                        key={j}
                        className={`text-center py-3 px-3 ${
                          tools[j].highlight ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""
                        }`}
                      >
                        {typeof cell === "boolean" ? (
                          cell ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mx-auto" />
                          )
                        ) : (
                          <span className="text-foreground">{cell}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final verdict mini-section */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Globe className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Best for WhatsApp-first markets</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>ServiceOS</strong> — the only platform on this list built WhatsApp-native
                for India, LATAM, SEA, and Africa.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <ShieldCheck className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Best for US small businesses</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Jobber</strong> and <strong>Housecall Pro</strong> — mature, well-supported
                platforms tuned for North American home services.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <Trophy className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Best for large contractors</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>ServiceTitan</strong> — the right tool if you have 20+ technicians, a
                dispatch team, and a budget to match.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        title="Best field service software — FAQ"
        subtitle="The questions service business owners ask most when evaluating FSM platforms."
      />

      <CtaSection
        title="Find your best-fit FSM today"
        subtitle="Start free with ServiceOS — no credit card, set up in 30 minutes, migrate anytime."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
