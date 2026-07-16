import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  X,
  ArrowRight,
  MessageSquare,
  BadgeDollarSign,
  Clock,
  Smartphone,
  Globe,
  Receipt,
  MapPin,
  Users,
  RefreshCw,
  Headphones,
} from "lucide-react";
import { CornerstoneLayout, CornerstoneHero, ContentSection } from "@/components/seo/cornerstone-layout";
import { FaqSection } from "@/components/seo/faq-section";
import { CtaSection } from "@/components/seo/cta-section";
import { getSoftwareApplicationSchema } from "@/lib/seo/schemas";

export const metadata: Metadata = {
  title: "ServiceOS vs Jobber — Which is Better in 2026? | Full Comparison",
  description:
    "A detailed, honest comparison of ServiceOS and Jobber — features, pricing, WhatsApp integration, mobile apps, and which type of business each is best for.",
  keywords: [
    "serviceos vs jobber",
    "jobber vs serviceos",
    "serviceos compared to jobber",
  ],
  alternates: { canonical: "https://serviceos.com/serviceos-vs-jobber" },
  openGraph: {
    title: "ServiceOS vs Jobber — Which is Better in 2026? | ServiceOS",
    description:
      "A detailed, honest head-to-head comparison of ServiceOS and Jobber — features, pricing, WhatsApp, mobile apps, and which business each fits.",
    url: "https://serviceos.com/serviceos-vs-jobber",
    siteName: "ServiceOS",
    type: "article",
  },
  robots: { index: true, follow: true },
};

// ─── Detailed head-to-head comparison rows ──────────────────────────────────
// 'serviceos' and 'competitor' hold a short value or check/cross representation.
const detailRows: {
  dimension: string;
  serviceos: string;
  competitor: string;
  advantage: "serviceos" | "competitor" | "tie";
}[] = [
  {
    dimension: "WhatsApp integration",
    serviceos: "Native, first-class — quotes, invoices, payment links via WhatsApp",
    competitor: "Not native — requires third-party Zapier or paid add-ons",
    advantage: "serviceos",
  },
  {
    dimension: "Pricing model",
    serviceos: "Free tier + usage-based paid plans; transparent public pricing",
    competitor: "Per-user tiered pricing ($49–$199/mo); cost scales with seats",
    advantage: "serviceos",
  },
  {
    dimension: "Setup time",
    serviceos: "Under 30 minutes, self-serve wizard",
    competitor: "1–3 hours with onboarding guides",
    advantage: "serviceos",
  },
  {
    dimension: "Best-fit market",
    serviceos: "Global — India, LATAM, SEA, Africa, Middle East",
    competitor: "North America — US, Canada",
    advantage: "tie",
  },
  {
    dimension: "Mobile app type",
    serviceos: "PWA — installs in one tap, no app store",
    competitor: "Native iOS & Android apps from app stores",
    advantage: "tie",
  },
  {
    dimension: "Offline mode",
    serviceos: "Full offline technician workflows — photos, signatures, time tracking",
    competitor: "Limited offline — most actions require connectivity",
    advantage: "serviceos",
  },
  {
    dimension: "Free invoice generator",
    serviceos: "Yes — public, no signup required",
    competitor: "No — invoicing requires a paid account",
    advantage: "serviceos",
  },
  {
    dimension: "Multi-currency",
    serviceos: "Yes — built-in, per-customer currency",
    competitor: "Yes — but USD-centric with limited multi-currency depth",
    advantage: "serviceos",
  },
  {
    dimension: "Technician GPS tracking",
    serviceos: "Live GPS tracking with route history",
    competitor: "Live GPS tracking with arrival/departure logging",
    advantage: "tie",
  },
  {
    dimension: "Customer CRM",
    serviceos: "360° view — history, assets, communication timeline",
    competitor: "Strong CRM with client hub and request portal",
    advantage: "tie",
  },
  {
    dimension: "Recurring invoices",
    serviceos: "Yes — automated recurring billing",
    competitor: "Yes — automated recurring billing",
    advantage: "tie",
  },
  {
    dimension: "Support channels",
    serviceos: "In-app chat, email, WhatsApp support",
    competitor: "Email, chat, phone (premium plans)",
    advantage: "tie",
  },
];

// ─── "Who should choose" cards ──────────────────────────────────────────────
const serviceosFit = [
  "Your customers live on WhatsApp (India, LATAM, SEA, Africa, Middle East)",
  "You want transparent pricing without per-seat surprises",
  "You need a fast setup — live in under 30 minutes",
  "You operate in multi-currency or non-USD markets",
  "You want a PWA technician app without app-store management",
  "You are a solo operator or growing team (1–50 techs)",
];

const jobberFit = [
  "You are a US or Canadian service business with English-speaking customers",
  "You value an established product with a large ecosystem and integrations",
  "You want a native iOS/Android app from the app stores",
  "You need deep integration with US accounting tools (QuickBooks, etc.)",
  "Your customers prefer email or SMS over WhatsApp",
  "You are willing to pay per-user pricing for a mature, supported platform",
];

const faqs = [
  {
    question: "Is ServiceOS cheaper than Jobber?",
    answer:
      "For most small teams and any business operating outside North America — yes. Jobber starts at $49/mo and scales per user, so a 5-technician team typically pays $150–$200/mo before add-ons. ServiceOS has a free tier for solo operators, and paid plans that scale with usage rather than headcount. We also publish pricing openly, so you know what you will pay in year two, not just year one. The gap widens further once you factor in WhatsApp — Jobber requires a paid third-party integration, while ServiceOS includes it natively.",
  },
  {
    question: "Can I migrate from Jobber to ServiceOS?",
    answer:
      "Yes. Jobber lets you export customers, jobs, and invoices as CSV files. You import those into ServiceOS, and our onboarding team will help you map fields and clean up data at no extra cost for paid plans. Most small businesses complete the migration in under an hour. For larger teams with years of job history, expect 1–3 days of data cleanup. We have migrated teams ranging from solo operators to 30-technician plumbing businesses without data loss.",
  },
  {
    question: "Does ServiceOS have a native mobile app?",
    answer:
      "ServiceOS is a progressive web app (PWA) rather than a native iOS/Android app. Technicians install it in one tap from the browser, it works fully offline, and updates ship instantly without app-store review delays. For most field service teams, PWA is more convenient than managing native app updates across dozens of phones. Jobber ships native iOS and Android apps — if app-store distribution is important to your team, Jobber has the edge there.",
  },
  {
    question: "Which is better for service businesses in India?",
    answer:
      "ServiceOS is unambiguously the better choice for Indian service businesses. It supports UPI and rupee invoicing, native WhatsApp business messaging (which is how most Indian customers communicate), Indian GST tax handling, and multi-language workflows. Jobber does not natively support WhatsApp, UPI, or Indian tax structures, which is why most Indian teams end up running Jobber alongside a separate WhatsApp workflow — a costly and error-prone setup that ServiceOS eliminates.",
  },
  {
    question: "Which is better for US-based service businesses?",
    answer:
      "For US-based service businesses with English-speaking customers who prefer email or SMS, Jobber is often the better choice. It has deeper integrations with US accounting tools like QuickBooks, a more mature North American support organization, and a large ecosystem of templates and best practices built specifically for US home services. ServiceOS still works well in the US, but its advantages (WhatsApp, multi-currency, global markets) matter less when your customers and operations are entirely US-based.",
  },
  {
    question: "Do both ServiceOS and Jobber have free trials?",
    answer:
      "Yes, but with different shapes. ServiceOS offers a free tier with no time limit and no credit card required — you can use it indefinitely as a solo operator. Jobber offers a 14-day free trial of its paid plans, after which you need to subscribe to continue using the platform. If you want a genuinely free option for ongoing solo use, ServiceOS is the clear pick. If you want to test a full-featured paid product for two weeks before committing, both work.",
  },
];

export default function ServiceOSVsJobberPage() {
  const appSchema = getSoftwareApplicationSchema({
    name: "ServiceOS vs Jobber — Comparison",
    description:
      "A detailed, honest head-to-head comparison of ServiceOS and Jobber field service management software.",
    url: "https://serviceos.com/serviceos-vs-jobber",
    applicationCategory: "BusinessApplication",
    offers: { price: "0", priceCurrency: "USD" },
  });

  return (
    <CornerstoneLayout
      activePath="/serviceos-vs-jobber"
      breadcrumbs={[
        { name: "Home", url: "https://serviceos.com" },
        { name: "Compare", url: "https://serviceos.com/jobber-alternatives" },
        { name: "ServiceOS vs Jobber", url: "https://serviceos.com/serviceos-vs-jobber" },
      ]}
      additionalSchema={[appSchema]}
    >
      <CornerstoneHero
        eyebrow="Head to Head"
        title="ServiceOS vs Jobber: Which Field Service Software is Right for You?"
        subtitle="A detailed, honest comparison of ServiceOS and Jobber — features, pricing, WhatsApp integration, mobile apps, and which type of business each is best for."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/#signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
          >
            Try ServiceOS Free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://getjobber.com"
            target="_blank"
            rel="noopener nofollow"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-6 py-3 text-base font-medium text-foreground transition-colors hover:bg-accent"
          >
            Visit Jobber
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </CornerstoneHero>

      {/* Detailed comparison table */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              ServiceOS vs Jobber — Detailed Feature Comparison
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A side-by-side breakdown across the 12 dimensions service businesses ask about
              most. No spin — just the facts.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-semibold text-foreground">Dimension</th>
                  <th className="text-left py-3 px-4 font-semibold text-emerald-700">ServiceOS</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Jobber</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 align-top">
                    <td className="py-3 px-4 text-foreground font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {row.advantage === "serviceos" && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                        {row.dimension}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-foreground">{row.serviceos}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Comparison reflects publicly available information as of 2026. Jobber is a registered
            trademark of Jobber Technology Inc. ServiceOS is not affiliated with Jobber.
          </p>
        </div>
      </section>

      <ContentSection title="ServiceOS vs Jobber — the honest breakdown">
        <p>
          Both ServiceOS and Jobber are legitimate, well-built field service management platforms.
          They are not direct substitutes for each other — they are built for different customer
          profiles, and pretending otherwise does not help you make a good decision. Here is an
          honest take on when each is the right pick.
        </p>
        <p>
          <strong>Jobber is the better choice for established North American service
          businesses.</strong> It has been around since 2011, has a mature feature set, deep
          integrations with US accounting tools like QuickBooks, and a large ecosystem of
          templates, training material, and consultants. If you run a plumbing, HVAC, or
          cleaning business in the US or Canada, your customers prefer email or SMS, and you want
          a proven product with native iOS and Android apps, Jobber is genuinely a great choice.
          The per-user pricing is fair for what you get, and the support organization is solid.
        </p>
        <p>
          <strong>ServiceOS is the better choice for WhatsApp-first markets and businesses that
          want transparent pricing without surprises.</strong> If you operate in India, Latin
          America, Southeast Asia, Africa, or the Middle East, your customers almost certainly
          prefer WhatsApp over email. Jobber does not have native WhatsApp support — you would
          need a third-party Zapier integration, which is brittle and adds cost. ServiceOS treats
          WhatsApp as the primary channel: quotes, job updates, invoices, and payment links all
          flow through WhatsApp natively, and customer replies automatically thread into the right
          conversation. This alone is the reason most ServiceOS customers switched from Jobber.
        </p>
        <p>
          <strong>Pricing is the second-biggest differentiator.</strong> Jobber&apos;s per-user
          model is reasonable for solo operators but compounds quickly — a 5-technician team
          typically pays $150–$200/mo before add-ons, and pricing can increase at renewal.
          ServiceOS publishes pricing openly, has a free tier for solo operators, and scales with
          usage rather than headcount. For price-sensitive markets and growing teams, that math
          matters. For established US businesses where the per-seat cost is comfortably absorbed,
          it matters less.
        </p>
        <p>
          <strong>Mobile experience is closer than you might think.</strong> Jobber ships
          polished native iOS and Android apps. ServiceOS is a progressive web app (PWA) —
          installable in one tap, working offline, with instant updates that bypass app-store
          review. PWAs are increasingly the modern default; native apps still win on push
          notifications and brand presence in the app store. Both work well in the field. If your
          team strongly prefers native apps or you need app-store distribution, Jobber has the
          edge. If you want fewer update headaches and offline-first workflows, ServiceOS does.
        </p>
        <p>
          The bottom line: <strong>there is no universal winner</strong>. Jobber is the right
          choice for US/Canadian teams that fit its target profile. ServiceOS is the right choice
          for WhatsApp-first markets, price-sensitive teams, and businesses that want transparent
          pricing and fast setup. Both have free trials — try the one that fits your customer
          profile, and you will know within a day which one is right for you.
        </p>
      </ContentSection>

      {/* Who should choose which */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Who should choose which?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A practical decision guide based on customer profile, not feature checklists.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-foreground">Choose ServiceOS if…</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {serviceosFit.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/#signup"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800"
              >
                Start ServiceOS Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Users className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-foreground">Choose Jobber if…</h3>
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {jobberFit.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://getjobber.com"
                target="_blank"
                rel="noopener nofollow"
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Visit Jobber
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Quick scorecard mini-cards */}
      <section className="border-t">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-3">
              Where each platform wins
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A quick scorecard of the strengths that defined this comparison.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <MessageSquare className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">WhatsApp — ServiceOS</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Native, first-class. Jobber requires third-party Zapier workarounds.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <BadgeDollarSign className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">Pricing — ServiceOS</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Free tier + transparent scaling. Jobber's per-seat model compounds at scale.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <Clock className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">Setup speed — ServiceOS</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Live in under 30 minutes. Jobber takes a few hours with onboarding guides.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <Globe className="h-6 w-6 text-emerald-700 mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">Global markets — ServiceOS</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Built for India, LATAM, SEA, Africa. Jobber is purpose-built for North America.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <Smartphone className="h-6 w-6 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">Native apps — Jobber</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Polished iOS and Android apps from app stores. ServiceOS uses a PWA instead.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <Receipt className="h-6 w-6 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">US integrations — Jobber</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Deeper QuickBooks, Stripe, and US accounting integrations than ServiceOS.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <MapPin className="h-6 w-6 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">GPS &amp; dispatch — Tie</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Both platforms ship live GPS tracking, dispatch boards, and route history.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <RefreshCw className="h-6 w-6 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">Recurring billing — Tie</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Both handle automated recurring invoices and subscription-style service plans.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <Headphones className="h-6 w-6 text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1.5">Support — Tie</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Both offer responsive support. Jobber adds phone support on premium plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection
        faqs={faqs}
        title="ServiceOS vs Jobber — FAQ"
        subtitle="The questions service business owners ask when comparing ServiceOS and Jobber head to head."
      />

      <CtaSection
        title="Try ServiceOS free and decide for yourself"
        subtitle="Free tier, no credit card, set up in 30 minutes. If Jobber fits your business better, we will tell you."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
      />
    </CornerstoneLayout>
  );
}
