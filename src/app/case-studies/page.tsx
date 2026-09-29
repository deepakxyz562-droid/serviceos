import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Clock, DollarSign, Star } from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
} from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Case Studies — Real Results from Service Businesses | Fieseros",
  description:
    "See how plumbers, HVAC techs, landscapers, and trades grew revenue and saved hours every week with Fieseros. Real metrics from real Fieseros customers.",
  keywords: [
    "fieseros case studies",
    "field service software case study",
    "contractor software results",
    "plumbing software roi",
    "hvac software results",
  ],
  alternates: { canonical: "https://fieseros.com/case-studies" },
  openGraph: {
    title: "Case Studies — Real Results from Service Businesses | Fieseros",
    description:
      "See how plumbers, HVAC techs, landscapers, and trades grew revenue and saved hours every week with Fieseros.",
    url: "https://fieseros.com/case-studies",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Resources", href: "/resources" },
  { label: "Case Studies", href: "/case-studies" },
];

interface CaseStudy {
  company: string;
  industry: string;
  location: string;
  headline: string;
  summary: string;
  metrics: { value: string; label: string; icon: typeof TrendingUp }[];
  quote: string;
  author: string;
  authorRole: string;
  tags: string[];
}

const caseStudies: CaseStudy[] = [
  {
    company: "ABC Plumbing & Drain",
    industry: "Plumbing",
    location: "Phoenix, AZ",
    headline: "+38% qualified leads in 60 days",
    summary:
      "ABC Plumbing replaced their contact form and after-hours voicemail with the Fieseros AI chat agent and voice receptionist. Leads captured after hours jumped from 0 to 12/week, and lead-to-job conversion rose 38% as the AI qualified every inquiry instantly.",
    metrics: [
      { value: "+38%", label: "More qualified leads", icon: TrendingUp },
      { value: "12/wk", label: "After-hours leads captured", icon: Clock },
      { value: "<60s", label: "Lead response time", icon: Star },
    ],
    quote:
      "Before Fieseros, every lead that came in after 5pm went to voicemail and booked with whoever called back first. Now the AI answers in 60 seconds, qualifies the job, and books the appointment before I even see it. We've added a third truck this year.",
    author: "Marcus Vega",
    authorRole: "Owner, ABC Plumbing & Drain",
    tags: ["Lead Capture", "AI Voice", "Plumbing"],
  },
  {
    company: "Sun City HVAC",
    industry: "HVAC",
    location: "Tucson, AZ",
    headline: "4.2x more Google reviews in 90 days",
    summary:
      "Sun City HVAC was losing search rankings to competitors with more reviews. Fieseros automated review requests fired the moment each job was marked complete — and sentiment-based routing protected their rating from one-star rants.",
    metrics: [
      { value: "4.2x", label: "More Google reviews", icon: Star },
      { value: "4.9★", label: "Average rating (up from 4.3)", icon: Star },
      { value: "+22", label: "Local search rank positions", icon: TrendingUp },
    ],
    quote:
      "We went from 14 Google reviews to 73 in three months. The sentiment routing caught three unhappy customers before they ever posted publicly. Our Google Maps ranking is now #2 for 'AC repair Tucson' — up from page 3.",
    author: "Dana Cortez",
    authorRole: "Operations Manager, Sun City HVAC",
    tags: ["Review Collection", "Local SEO", "HVAC"],
  },
  {
    company: "GreenScape Landscaping",
    industry: "Landscaping",
    location: "Austin, TX",
    headline: "5 more jobs per week per technician",
    summary:
      "GreenScape's techs were driving 3+ hours a day between jobs. Fieseros route optimization re-ordered their stops and added real-time ETAs — fitting 5 more jobs per tech per week into the same hours.",
    metrics: [
      { value: "+5", label: "Jobs/tech/week", icon: TrendingUp },
      { value: "-28%", label: "Drive time per day", icon: Clock },
      { value: "+$2.4k", label: "Revenue per tech/week", icon: DollarSign },
    ],
    quote:
      "Route optimization alone paid for Fieseros ten times over. My crews do more jobs in less time, customers get live ETAs instead of 'sometime between 8 and noon', and I'm not burning fuel driving back across town. We hired two more techs this season.",
    author: "Tyrell Brooks",
    authorRole: "Founder, GreenScape Landscaping",
    tags: ["Job Dispatch", "Route Optimization", "Landscaping"],
  },
  {
    company: "BrightSpark Electric",
    industry: "Electrical",
    location: "Denver, CO",
    headline: "63% faster invoice payments",
    summary:
      "BrightSpark was waiting 45+ days for invoice payments. Fieseros branded SMS invoices with one-tap pay links and automated reminders cut days-sales-outstanding from 47 to 17 days — without a single collection call.",
    metrics: [
      { value: "-63%", label: "Days sales outstanding", icon: Clock },
      { value: "17", label: "Avg days to paid (from 47)", icon: DollarSign },
      { value: "0", label: "Collection calls needed", icon: Star },
    ],
    quote:
      "I used to spend Sunday nights chasing unpaid invoices. Now Fieseros sends the invoice by SMS the moment the tech marks the job done, and customers pay from their phone in 30 seconds. My cash flow is finally predictable.",
    author: "Priya Anand",
    authorRole: "Owner, BrightSpark Electric",
    tags: ["Payment Collection", "Invoicing", "Electrical"],
  },
  {
    company: "PureClean Home Services",
    industry: "Cleaning",
    location: "Seattle, WA",
    headline: "Recurring revenue +180% with automated nurture",
    summary:
      "PureClean was losing one-time cleanings to churn. Fieseros lead-nurturing sequences re-engaged past customers with seasonal offers and maintenance plans — turning one-off cleans into recurring monthly revenue.",
    metrics: [
      { value: "+180%", label: "Recurring revenue growth", icon: TrendingUp },
      { value: "34%", label: "One-time → recurring conversion", icon: DollarSign },
      { value: "92%", label: "Nurture sequence open rate", icon: Star },
    ],
    quote:
      "We were great at the first clean and terrible at getting customers back. Fieseros nurture sequences send the right message at the right time — 'ready for a spring deep clean?' — and our recurring revenue tripled in a year.",
    author: "Elena Sokolov",
    authorRole: "Co-founder, PureClean Home Services",
    tags: ["Lead Nurturing", "Recurring Revenue", "Cleaning"],
  },
  {
    company: "Apex Roofing Co.",
    industry: "Roofing",
    location: "Dallas, TX",
    headline: "Quote-to-job win rate up 27%",
    summary:
      "Apex was losing jobs to faster-quoting competitors. Fieseros AI quote generation turned multi-day estimate turnarounds into same-day branded quotes with e-signature — winning 27% more of the jobs they quoted.",
    metrics: [
      { value: "+27%", label: "Quote-to-job win rate", icon: TrendingUp },
      { value: "<5min", label: "From request to sent quote", icon: Clock },
      { value: "+19", label: "Jobs won per quarter", icon: Star },
    ],
    quote:
      "We were the slowest quote in town and lost jobs because of it. Now my team sends a branded, line-item quote with an e-signature link before the customer finishes their coffee. We're winning jobs we never would have before.",
    author: "Greg Hollister",
    authorRole: "President, Apex Roofing Co.",
    tags: ["Quote Generation", "E-Signature", "Roofing"],
  },
];

export default function CaseStudiesPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/case-studies" showAiReceptionist={false}>
      <CornerstoneHero
        eyebrow="Case Studies"
        title="Real results from real service businesses"
        subtitle="Plumbers, HVAC techs, landscapers, electricians, and cleaners share the numbers behind their growth with Fieseros. No vanity metrics — just revenue, hours saved, and jobs won."
      />

      {/* Aggregate stats bar */}
      <section className="border-b bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: "+38%", label: "Avg more qualified leads" },
              { value: "-63%", label: "Faster invoice payments" },
              { value: "4.2x", label: "More Google reviews" },
              { value: "+5", label: "Jobs per tech per week" },
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

      {/* Case study cards */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {caseStudies.map((cs) => (
              <article
                key={cs.company}
                className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {cs.industry}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {cs.location}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-3">
                  {cs.headline}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {cs.summary}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {cs.metrics.map((m) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={m.label}
                        className="rounded-xl border border-border/60 bg-muted/30 p-3 text-center"
                      >
                        <Icon className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
                        <div className="text-lg font-extrabold text-foreground">
                          {m.value}
                        </div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          {m.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quote */}
                <blockquote className="border-l-2 border-emerald-500/40 pl-4 mb-4 flex-1">
                  <p className="text-sm text-foreground italic leading-relaxed">
                    “{cs.quote}”
                  </p>
                  <footer className="text-xs text-muted-foreground mt-2">
                    <span className="font-semibold text-foreground">{cs.author}</span>
                    {" — "}
                    {cs.authorRole}
                  </footer>
                </blockquote>

                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="flex flex-wrap gap-1.5">
                    {cs.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaSection
        title="Want results like these?"
        subtitle="Start free today. Join thousands of service businesses running on Fieseros."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "Talk to Sales", href: "/contact-us" }}
        bullets={["14-day free trial", "No credit card required", "Cancel anytime"]}
      />
    </CornerstoneLayout>
  );
}
