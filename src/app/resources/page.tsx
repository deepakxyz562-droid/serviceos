import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  FileText,
  Calculator,
  GraduationCap,
  Users,
  Code,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  CornerstoneLayout,
  CornerstoneHero,
} from "@/components/seo/cornerstone-layout";
import { CtaSection } from "@/components/seo/cta-section";
import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Resources — Guides, Case Studies & Free Tools for Contractors | Fieseros",
  description:
    "The Fieseros resource hub for service businesses: in-depth guides, customer case studies, free contractor tools, and the contractor blog. Learn how to grow your trade business with AI.",
  keywords: [
    "contractor resources",
    "field service guides",
    "service business case studies",
    "free contractor tools",
    "trade business blog",
  ],
  alternates: { canonical: "https://fieseros.com/resources" },
  openGraph: {
    title: "Resources — Guides, Case Studies & Free Tools for Contractors | Fieseros",
    description:
      "The Fieseros resource hub: in-depth guides, customer case studies, free contractor tools, and the trade business blog.",
    url: "https://fieseros.com/resources",
    siteName: "Fieseros",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const breadcrumbs: BreadcrumbItem[] = [
  { label: "Home", href: "/" },
  { label: "Resources", href: "/resources" },
];

const resourceCategories = [
  {
    icon: GraduationCap,
    badge: "Guides",
    title: "How-to Guides",
    description:
      "Step-by-step playbooks for growing a service business — from hiring your first technician to scaling to 5 trucks. Written by operators who've done it.",
    links: [
      { label: "How to capture more leads from your website", href: "/use-cases/lead-capture" },
      { label: "How to reduce no-shows with automated reminders", href: "/use-cases/appointment-booking" },
      { label: "How to collect Google reviews automatically", href: "/use-cases/review-collection" },
      { label: "How to dispatch the right tech on the optimal route", href: "/use-cases/job-dispatch" },
    ],
    cta: { label: "Browse use cases", href: "/use-cases" },
  },
  {
    icon: Users,
    badge: "Case Studies",
    title: "Customer Case Studies",
    description:
      "Real numbers from real businesses. See how plumbers, HVAC techs, and landscapers grew revenue and saved hours every week with Fieseros.",
    links: [
      { label: "ABC Plumbing: +38% leads in 60 days", href: "/case-studies" },
      { label: "Sun City HVAC: 4.2x more Google reviews", href: "/case-studies" },
      { label: "GreenScape: 5 more jobs per week per tech", href: "/case-studies" },
      { label: "All case studies", href: "/case-studies" },
    ],
    cta: { label: "View all case studies", href: "/case-studies" },
  },
  {
    icon: Calculator,
    badge: "Free Tools",
    title: "Free Contractor Tools",
    description:
      "Nine free generators and calculators — no signup, no credit card. Build invoices, estimates, proposals, and job-cost estimates in seconds.",
    links: [
      { label: "Free Invoice Generator", href: "/invoice-generator" },
      { label: "Free Estimate Generator", href: "/estimate-generator" },
      { label: "Free Proposal Generator", href: "/proposal-generator" },
      { label: "Job Cost Calculator", href: "/job-cost-calculator" },
    ],
    cta: { label: "All 9 free tools", href: "/tools" },
  },
  {
    icon: BookOpen,
    badge: "Blog",
    title: "Contractor Blog",
    description:
      "Tactics, industry news, and operator stories for trade and service businesses. New articles weekly on lead gen, dispatch, pricing, and AI.",
    links: [
      { label: "Latest articles", href: "/blog" },
      { label: "Lead generation for contractors", href: "/blog" },
      { label: "Pricing strategies for service businesses", href: "/blog" },
      { label: "AI in field service", href: "/blog" },
    ],
    cta: { label: "Read the blog", href: "/blog" },
  },
  {
    icon: Code,
    badge: "Developers",
    title: "Developer Docs & API",
    description:
      "Build on Fieseros with our REST API, webhooks, and embed SDK. Generate forms programmatically, sync data, and build custom integrations.",
    links: [
      { label: "Notification setup guide", href: "/docs/notifications-setup" },
      { label: "Embed on WordPress", href: "/platform/wordpress" },
      { label: "Embed on custom HTML", href: "/platform/html" },
      { label: "Zapier integration", href: "/integrations/zapier" },
    ],
    cta: { label: "View platforms", href: "/platform" },
  },
  {
    icon: TrendingUp,
    badge: "Growth",
    title: "Growth Services",
    description:
      "Done-for-you website development, local SEO, and Google Ads — built specifically for trade and service contractors. Fieseros agency services.",
    links: [
      { label: "Contractor website development", href: "/services/website-development" },
      { label: "Local SEO & Google Business Profile", href: "/services/seo" },
      { label: "Google search & local ads", href: "/services/google-ads" },
      { label: "All growth services", href: "/services" },
    ],
    cta: { label: "Explore services", href: "/services" },
  },
];

const featuredStats = [
  { value: "9", label: "Free contractor tools" },
  { value: "18+", label: "Industries covered" },
  { value: "20K+", label: "Form templates" },
  { value: "Weekly", label: "New blog articles" },
];

export default function ResourcesHubPage() {
  return (
    <CornerstoneLayout breadcrumbs={breadcrumbs} activePath="/resources" showAiReceptionist={false}>
      <CornerstoneHero
        eyebrow="Resources"
        title="Everything you need to grow your service business"
        subtitle="Guides, case studies, free tools, and the contractor blog — all in one place. Learn how to capture more leads, book more jobs, and get paid faster."
      />

      {/* Stats bar */}
      <section className="border-b bg-muted/30 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredStats.map((s) => (
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

      {/* Resource category cards */}
      <section className="bg-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resourceCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="flex flex-col rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {cat.badge}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2">
                    {cat.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {cat.description}
                  </p>
                  <ul className="space-y-1.5 mb-5 flex-1">
                    {cat.links.map((l) => (
                      <li key={l.label}>
                        <Link
                          href={l.href}
                          className="text-sm text-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                        >
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={cat.cta.href}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    {cat.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <CtaSection
        title="Ready to put these resources to work?"
        subtitle="Start free today. No credit card required. Set up in under 5 minutes."
        primaryCta={{ label: "Start Free Trial", href: "/#signup" }}
        secondaryCta={{ label: "View Pricing", href: "/pricing" }}
        bullets={["14-day free trial", "No credit card required", "Cancel anytime"]}
      />
    </CornerstoneLayout>
  );
}
