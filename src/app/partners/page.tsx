import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Handshake, DollarSign, Users, GraduationCap, TrendingUp } from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
  ContentSection,
} from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import { FaqSection } from "@/components/seo/faq-section";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Partners — Grow with Fieseros | Agency & Reseller Program",
  description:
    "Become a Fieseros partner and grow your revenue. Agency, reseller, technology, and affiliate partner programs for marketers, web agencies, and integrators serving service businesses.",
  keywords: [
    "fieseros partners",
    "field service software reseller",
    "agency partner program",
    "contractor software affiliate",
    "white label field service software",
  ],
  alternates: { canonical: "https://fieseros.com/partners" },
  openGraph: {
    title: "Partners — Grow with Fieseros | Agency & Reseller Program",
    description:
      "Become a Fieseros partner and grow your revenue. Agency, reseller, technology, and affiliate partner programs for marketers and integrators.",
    url: "https://fieseros.com/partners",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Partners", href: "/partners" },
];

const programs = [
  {
    icon: Users,
    badge: "Agency",
    title: "Agency Partner Program",
    description:
      "For marketing agencies, web designers, and consultants serving service businesses. Resell Fieseros to your clients, earn recurring commission, and offer white-glove onboarding. Co-branded materials and a dedicated partner manager.",
    perks: [
      "20% recurring commission on every client subscription",
      "Co-branded onboarding and training materials",
      "Dedicated partner success manager",
      "Priority support and quarterly strategy calls",
      "Free Fieseros license for your own agency",
    ],
  },
  {
    icon: Handshake,
    badge: "Reseller",
    title: "Reseller Partner Program",
    description:
      "For distributors and software vendors with an existing service-business customer base. White-label Fieseros under your brand, set your own pricing, and own the customer relationship end-to-end.",
    perks: [
      "White-label branding (your logo, your domain, your colors)",
      "Custom pricing and packaging control",
      "Volume-based margin tiers (up to 40%)",
      "Direct customer billing and support ownership",
      "API access for custom integrations",
    ],
  },
  {
    icon: TrendingUp,
    badge: "Technology",
    title: "Technology Partner Program",
    description:
      "For software companies building complementary tools — accounting, marketing automation, scheduling, payments. Build native integrations with Fieseros and get listed in our integration marketplace.",
    perks: [
      "Full API access and developer sandbox",
      "Featured placement in the Fieseros integration marketplace",
      "Co-marketing opportunities (webinars, blog, case studies)",
      "Technical integration support from our engineering team",
      "Joint go-to-market planning",
    ],
  },
  {
    icon: GraduationCap,
    badge: "Affiliate",
    title: "Affiliate Program",
    description:
      "For bloggers, content creators, and industry influencers with a service-business audience. Earn commission for every referral that converts — no minimums, no commitment.",
    perks: [
      "15% recurring commission for 12 months per referral",
      "Custom referral links and tracking dashboard",
      "Ready-made content (banners, review copy, comparison posts)",
      "60-day cookie window",
      "Monthly payouts via PayPal or Stripe",
    ],
  },
];

const faqs = [
  {
    question: "Who qualifies for the Agency Partner Program?",
    answer:
      "Marketing agencies, web designers, SEO consultants, and business coaches with at least 5 active service-business clients. There's no fee to join — we verify your business and provide onboarding materials to get you selling Fieseros within a week.",
  },
  {
    question: "What's the difference between Agency and Reseller programs?",
    answer:
      "Agency partners co-sell Fieseros under the Fieseros brand and earn 20% recurring commission. Reseller partners white-label Fieseros entirely — your brand, your pricing, your customer relationship — with margins up to 40% at volume. Reseller requires a higher commitment and an annual minimum.",
  },
  {
    question: "How and when do partners get paid?",
    answer:
      "Agency and Affiliate partners earn recurring commission, paid monthly via PayPal or Stripe once the balance exceeds $50. Reseller partners bill their customers directly and remit the wholesale portion to Fieseros monthly. Full reporting is available in the partner dashboard.",
  },
  {
    question: "Do partners get free access to Fieseros?",
    answer:
      "Yes. Agency and Reseller partners get a free Fieseros license for their own business (Growth plan equivalent) so you can dogfood the product and demo it to clients authentically. Technology partners get a free developer sandbox.",
  },
  {
    question: "Is there a minimum commitment or fee to join?",
    answer:
      "No fee for Agency, Technology, or Affiliate programs. Reseller requires a signed agreement and an annual revenue minimum (typically $25K) to ensure commitment. All programs are month-to-month after the initial term.",
  },
];

export default function PartnersPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/partners" showAiReceptionist={false}>
      <CornerstoneHero
        eyebrow="Partners"
        title="Grow your revenue with Fieseros"
        subtitle="Whether you run a marketing agency, build complementary software, or create content for service businesses — there's a Fieseros partner program designed to help you earn more while helping your clients win."
      />

      {/* Programs grid */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground mb-4">
              Four ways to partner
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Pick the program that fits your business — each comes with the
              support, materials, and economics to help you succeed.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {programs.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm flex flex-col"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {p.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {p.description}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {p.perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                        <DollarSign className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{perk}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="mailto:partners@fieseros.com?subject=Partner Program Inquiry"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-600 px-5 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors w-full sm:w-auto"
                  >
                    Apply for {p.badge}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ContentSection title="Why partner with Fieseros">
        <p>
          Service businesses are the backbone of every local economy — and
          they're underserved by software. The big enterprise platforms target
          large fleets; the simple tools don't go deep enough. Fieseros sits in
          the sweet spot: an AI operating system powerful enough for a 50-truck
          fleet, simple enough for a solo plumber.
        </p>
        <p>
          That positioning — combined with genuinely useful AI, 0% platform
          payment fees, and a free tier that converts — makes Fieseros an easy
          sell to your clients and audience. Our partners consistently report
          higher close rates and lower churn than competing field-service
          tools they've represented.
        </p>
        <p>
          When you partner with Fieseros, you're not just reselling software —
          you're giving your clients an AI operating system that captures more
          leads, books more jobs, and gets paid faster. That's a story your
          clients will thank you for.
        </p>
      </ContentSection>

      <FaqSection
        title="Partner program — frequently asked"
        subtitle="Everything you need to know. Still have questions? Email our partner team."
        faqs={faqs}
      />

      <CtaSection
        title="Become a Fieseros partner"
        subtitle="Tell us about your business and we'll match you to the right program within 48 hours."
        primaryCta={{ label: "Apply Now", href: "mailto:partners@fieseros.com?subject=Partner Program Inquiry" }}
        secondaryCta={{ label: "View Pricing", href: "/pricing" }}
        bullets={["No fee to apply", "Dedicated partner manager", "Recurring revenue"]}
      />
    </CornerstoneLayout>
  );
}
